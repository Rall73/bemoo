import OpenAI from "openai"
import { prisma } from "@/lib/prisma"
import { withAuthCtx, ok, notFound, assertSameCompany, serverError } from "@/lib/api"

let _openai: OpenAI | null = null
function getOpenAI() {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  return _openai
}

const TYPE_LABEL: Record<string, string> = {
  OK_NOK:  "OK/NOK",
  SIM_NAO: "Sim/Não",
  NUMERIC: "Numérico",
  TEXT:    "Texto",
}

// POST /api/execucoes/[id]/relatorio/analise
export const POST = withAuthCtx<{ id: string }>(async (_req, session, params) => {
  const execId = parseInt(params.id)

  const execution = await prisma.checklistExecution.findFirst({
    where: { id: execId, deletedAt: null },
    include: {
      checklist: {
        include: {
          items: {
            where:   { deletedAt: null },
            orderBy: { order: "asc" },
            include: {
              fields: {
                where:   { deletedAt: null },
                orderBy: { order: "asc" },
              },
            },
          },
        },
      },
      executor:    { select: { name: true } },
      company:     { select: { name: true } },
      fieldValues: true,
    },
  })

  if (!execution) return notFound("Execução não encontrada.")

  const tenantError = assertSameCompany(session.user.companyId, execution.companyId)
  if (tenantError) return tenantError

  // ── Monta contexto para o GPT ──────────────────────────────────────────
  const valueMap = new Map(execution.fieldValues.map((fv) => [fv.fieldId, fv]))

  const allFields = execution.checklist.items.flatMap((item) =>
    item.fields.map((field) => {
      const fv = valueMap.get(field.id)
      const resposta =
        (field.type === "OK_NOK" || field.type === "SIM_NAO")
          ? (fv?.valueOkNok === true ? (field.type === "OK_NOK" ? "OK" : "Sim")
             : fv?.valueOkNok === false ? (field.type === "OK_NOK" ? "NOK" : "Não")
             : "Não respondido")
          : field.type === "NUMERIC"
            ? (fv?.valueNumeric != null ? `${fv.valueNumeric}${field.unit ? " " + field.unit : ""}` : "Não respondido")
            : (fv?.valueText?.trim() || "Não respondido")

      return {
        secao:     item.label,
        campo:     field.label,
        tipo:      TYPE_LABEL[field.type],
        resposta,
        anotacao:  fv?.annotation?.trim() || null,
        audio:     fv?.transcription?.trim() || null,
      }
    })
  )

  const okCount  = allFields.filter((f) => f.resposta === "OK" || f.resposta === "Sim").length
  const nokCount = allFields.filter((f) => f.resposta === "NOK" || f.resposta === "Não").length
  const total    = allFields.filter((f) => ["OK","NOK","Sim","Não"].includes(f.resposta)).length
  const pct      = total > 0 ? Math.round((okCount / total) * 100) : null

  const itensTexto = execution.checklist.items.map((item) => {
    const campos = item.fields.map((field) => {
      const fv = valueMap.get(field.id)
      const r  = allFields.find((f) => f.secao === item.label && f.campo === field.label)
      const linhas = [`   • ${field.label} (${TYPE_LABEL[field.type]}): ${r?.resposta ?? "—"}`]
      if (r?.anotacao)  linhas.push(`     Anotação: ${r.anotacao}`)
      if (r?.audio)     linhas.push(`     Áudio: ${r.audio}`)
      return linhas.join("\n")
    }).join("\n")
    return `${item.label}:\n${campos}`
  }).join("\n\n")

  const prompt = `Você é um analista de qualidade experiente. Analise o resultado do checklist abaixo e forneça uma análise profissional estruturada em português.

CHECKLIST: ${execution.checklist.name}
${execution.checklist.description ? `DESCRIÇÃO: ${execution.checklist.description}\n` : ""}EMPRESA: ${execution.company.name}
EXECUTOR: ${execution.executor.name}
CONFORMIDADE GERAL: ${pct !== null ? `${pct}% (${okCount} conformes, ${nokCount} não conformes de ${total} verificados)` : "N/A"}

RESULTADOS DETALHADOS:
${itensTexto}

${execution.conclusionNote ? `OBSERVAÇÃO FINAL DO EXECUTOR:\n${execution.conclusionNote}` : ""}

---

Com base nesses dados, forneça uma análise estruturada com exatamente estas 4 seções (use os títulos em maiúsculas como marcadores):

RESUMO GERAL
[1-2 parágrafos descrevendo o panorama geral da execução, conformidade e principais achados]

PONTOS POSITIVOS
[Lista com bullet "•" dos itens e aspectos que estão em conformidade e merecem destaque]

PONTOS DE ATENÇÃO / NÃO CONFORMIDADES
[Lista com bullet "•" dos itens NOK/Não, com análise do possível impacto de cada um. Se não houver não conformidades, destaque aspectos preventivos relevantes]

RECOMENDAÇÕES
[Lista numerada com ações concretas sugeridas, em ordem de prioridade]

Seja objetivo, profissional e direto. Use linguagem acessível mas técnica.`

  try {
    const response = await getOpenAI().chat.completions.create({
      model:    "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1200,
      temperature: 0.4,
    })

    const analise = response.choices[0]?.message?.content?.trim() ?? ""
    return ok({ analise })
  } catch (err: any) {
    console.error("[POST /api/execucoes/[id]/relatorio/analise]", err?.message ?? err)
    return serverError("Erro ao gerar análise por IA.")
  }
})
