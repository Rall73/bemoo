/**
 * Rota temporária de seed — cria o template ISO 9001:2015 no banco.
 * Uso: GET /api/setup/seed-iso9001?secret=<SEED_SECRET>
 *
 * IMPORTANTE: após usar, desative adicionando SEED_SECRET="" no painel
 * ou removendo esta rota no próximo deploy.
 */

import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

const TEMPLATE_NAME   = "Auditoria ISO 9001:2015"
const TEMPLATE_SOURCE = "ISO 9001:2015"
const TEMPLATE_DESC   = "Checklist completo de auditoria interna baseado nos requisitos da norma ISO 9001:2015. Inclui 71 perguntas em 13 grupos com referências normativas por cláusula."

interface FieldDef { label: string; clausula: string; description?: string }
interface GroupDef { title: string; fields: FieldDef[] }

const GRUPOS: GroupDef[] = [
  {
    title: "1. Contexto da Organização (Cláusula 4)",
    fields: [
      { label: "A organização determina as questões internas e externas pertinentes ao seu propósito e que afetam sua capacidade de atingir os resultados pretendidos do SGQ?", clausula: "4.1", description: "Evidência: análise de contexto documentada (SWOT, PEST ou equivalente)." },
      { label: "As questões internas e externas são monitoradas e analisadas criticamente?", clausula: "4.1", description: "Evidência: registros de reuniões de análise crítica ou revisões periódicas do contexto." },
      { label: "As partes interessadas pertinentes ao SGQ e seus requisitos são determinadas e monitoradas?", clausula: "4.2", description: "Evidência: lista de partes interessadas com requisitos mapeados." },
      { label: "As informações sobre partes interessadas e seus requisitos são monitoradas e analisadas criticamente?", clausula: "4.2", description: "Evidência: registros de revisão periódica dos requisitos das partes interessadas." },
      { label: "O escopo do SGQ é determinado, documentado e disponibilizado como informação documentada?", clausula: "4.3", description: "Evidência: manual da qualidade ou documento equivalente com escopo definido." },
      { label: "Os processos necessários para o SGQ são determinados, com suas sequências, interações, critérios e métodos definidos?", clausula: "4.4", description: "Evidência: mapa de processos, procedimentos ou SIPOC documentados." },
    ],
  },
  {
    title: "2. Liderança e Comprometimento (Cláusula 5.1)",
    fields: [
      { label: "A Alta Direção demonstra liderança e comprometimento com o SGQ, assumindo a responsabilidade pela sua eficácia?", clausula: "5.1.1", description: "Evidência: atas de reunião, comunicados internos, participação em auditorias." },
      { label: "A política e os objetivos da qualidade são compatíveis com o contexto e a direção estratégica da organização?", clausula: "5.1.1", description: "Evidência: política da qualidade alinhada com o planejamento estratégico." },
      { label: "São promovidos o uso da abordagem de processo e o pensamento baseado em risco?", clausula: "5.1.1", description: "Evidência: evidências de análise de risco integrada aos processos operacionais." },
      { label: "A Alta Direção garante que os recursos necessários para o SGQ estejam disponíveis?", clausula: "5.1.1", description: "Evidência: registros de aprovação de recursos, orçamentos do SGQ." },
      { label: "A Alta Direção demonstra comprometimento com o foco no cliente, garantindo que os requisitos são determinados e atendidos?", clausula: "5.1.2", description: "Evidência: mecanismos de captura de requisitos e monitoramento da satisfação do cliente." },
      { label: "Os riscos e oportunidades que podem afetar a conformidade de produtos/serviços e a satisfação do cliente são determinados e abordados?", clausula: "5.1.2", description: "Evidência: registros de análise de risco orientada ao cliente." },
    ],
  },
  {
    title: "3. Política da Qualidade (Cláusula 5.2)",
    fields: [
      { label: "A Política da Qualidade é adequada ao propósito e contexto da organização e fornece estrutura para o estabelecimento dos objetivos da qualidade?", clausula: "5.2.1", description: "Evidência: documento da Política da Qualidade vigente." },
      { label: "A Política da Qualidade inclui comprometimento com o atendimento de requisitos aplicáveis e com a melhoria contínua do SGQ?", clausula: "5.2.1", description: "Evidência: texto da política com declaração explícita de comprometimento." },
      { label: "A Política da Qualidade é disponibilizada como informação documentada e comunicada internamente?", clausula: "5.2.2", description: "Evidência: política afixada, publicada na intranet ou comunicada formalmente." },
      { label: "A Política da Qualidade está disponível para as partes interessadas pertinentes?", clausula: "5.2.2", description: "Evidência: política no site institucional ou disponível mediante solicitação." },
    ],
  },
  {
    title: "4. Papéis, Responsabilidades e Autoridades (Cláusula 5.3)",
    fields: [
      { label: "As responsabilidades e autoridades para os papéis pertinentes ao SGQ são atribuídas e comunicadas?", clausula: "5.3", description: "Evidência: organograma, descrições de cargo, matriz RACI ou equivalente." },
      { label: "Existe responsável designado para garantir que o SGQ está em conformidade com os requisitos da norma?", clausula: "5.3", description: "Evidência: nomeação formal do representante da qualidade (RQ) ou função equivalente." },
      { label: "É assegurado que os processos do SGQ produzem as saídas pretendidas?", clausula: "5.3", description: "Evidência: indicadores de desempenho de processos, relatórios de acompanhamento." },
      { label: "O desempenho do SGQ e as oportunidades de melhoria são reportados à Alta Direção?", clausula: "5.3", description: "Evidência: relatórios de análise crítica pela direção." },
    ],
  },
  {
    title: "5. Ações para Riscos e Oportunidades (Cláusula 6.1)",
    fields: [
      { label: "A organização considera o contexto e os requisitos das partes interessadas ao determinar riscos e oportunidades que precisam ser abordados?", clausula: "6.1.1", description: "Evidência: matriz de riscos vinculada à análise de contexto." },
      { label: "Riscos e oportunidades são determinados para assegurar que o SGQ atinja seus resultados pretendidos e previna efeitos indesejados?", clausula: "6.1.1", description: "Evidência: registro de riscos e oportunidades documentado." },
      { label: "São planejadas ações para abordar os riscos e oportunidades identificados?", clausula: "6.1.2", description: "Evidência: plano de ação vinculado à matriz de riscos." },
      { label: "As ações para abordar riscos e oportunidades são integradas nos processos do SGQ e sua eficácia é avaliada?", clausula: "6.1.2", description: "Evidência: registros de acompanhamento e avaliação de eficácia das ações." },
      { label: "O pensamento baseado em risco é evidenciado nos processos do SGQ (decisões orientadas por análise de risco)?", clausula: "6.1.2", description: "Evidência: exemplos de decisões documentadas considerando análise de risco." },
    ],
  },
  {
    title: "6. Objetivos da Qualidade e Planejamento (Cláusulas 6.2–6.3)",
    fields: [
      { label: "Os objetivos da qualidade são estabelecidos para funções, níveis e processos pertinentes ao SGQ?", clausula: "6.2.1", description: "Evidência: objetivos documentados por departamento ou processo." },
      { label: "Os objetivos da qualidade são mensuráveis, monitorados, comunicados e atualizados conforme necessário?", clausula: "6.2.1", description: "Evidência: painel de indicadores (dashboard) ou relatório de desempenho." },
      { label: "Existe planejamento sobre como atingir os objetivos (o quê, recursos, responsável, prazo, forma de avaliação)?", clausula: "6.2.2", description: "Evidência: plano de metas com os 5 elementos requeridos pela norma." },
      { label: "Os objetivos são consistentes com a Política da Qualidade e consideram os requisitos aplicáveis?", clausula: "6.2.1", description: "Evidência: rastreabilidade entre política, objetivos e indicadores." },
      { label: "Mudanças no SGQ são realizadas de forma planejada, considerando propósito, integridade, recursos disponíveis e responsabilidades?", clausula: "6.3", description: "Evidência: registros de análise de impacto de mudanças no SGQ." },
    ],
  },
  {
    title: "7. Recursos (Cláusula 7.1)",
    fields: [
      { label: "A organização determina e provê os recursos necessários para o estabelecimento, implementação, manutenção e melhoria contínua do SGQ?", clausula: "7.1.1", description: "Evidência: plano de recursos aprovado pela Alta Direção." },
      { label: "As pessoas necessárias para a implementação e operação eficaz do SGQ são determinadas e providas?", clausula: "7.1.2", description: "Evidência: quadro de pessoal adequado para as funções do SGQ." },
      { label: "A infraestrutura necessária para a operação dos processos é determinada, provida e mantida?", clausula: "7.1.3", description: "Evidência: plano de manutenção de equipamentos, instalações e sistemas." },
      { label: "O ambiente para a operação dos processos é determinado, provido e mantido conforme necessário?", clausula: "7.1.4", description: "Evidência: registros de condições ambientais monitoradas, políticas de bem-estar." },
      { label: "Os recursos de monitoramento e medição são determinados, providos e calibrados/verificados quando necessário?", clausula: "7.1.5", description: "Evidência: lista de instrumentos de medição com registros de calibração vigentes." },
      { label: "O conhecimento organizacional necessário para a operação dos processos é determinado, mantido e disponibilizado?", clausula: "7.1.6", description: "Evidência: base de conhecimento, procedimentos, lições aprendidas documentadas." },
    ],
  },
  {
    title: "8. Competência, Conscientização e Comunicação (Cláusulas 7.2–7.4)",
    fields: [
      { label: "As competências necessárias das pessoas que afetam o desempenho e a eficácia do SGQ são determinadas?", clausula: "7.2", description: "Evidência: perfis de competência, descrições de cargo com requisitos de qualificação." },
      { label: "É assegurado que as pessoas são competentes (educação, treinamento ou experiência apropriados)?", clausula: "7.2", description: "Evidência: registros de qualificações, diplomas, certificados e treinamentos." },
      { label: "Ações para adquirir a competência necessária são tomadas e sua eficácia é avaliada?", clausula: "7.2", description: "Evidência: plano de treinamento com avaliação de eficácia." },
      { label: "As pessoas estão conscientes da política, objetivos, sua contribuição para a eficácia do SGQ e as implicações de não estar em conformidade?", clausula: "7.3", description: "Evidência: registros de treinamento de conscientização, comunicados internos." },
      { label: "A organização determina as comunicações internas e externas pertinentes ao SGQ?", clausula: "7.4", description: "Evidência: plano ou matriz de comunicação documentada." },
    ],
  },
  {
    title: "9. Informação Documentada (Cláusula 7.5)",
    fields: [
      { label: "O SGQ inclui a informação documentada requerida pela norma e aquela determinada pela organização como necessária para a eficácia do SGQ?", clausula: "7.5.1", description: "Evidência: lista mestra de documentos e registros do SGQ." },
      { label: "A criação e atualização de informação documentada incluem identificação, formato adequado e análise crítica e aprovação?", clausula: "7.5.2", description: "Evidência: procedimento de controle de documentos com cabeçalho padrão." },
      { label: "A informação documentada é controlada quanto à disponibilidade, proteção e acesso adequado?", clausula: "7.5.3", description: "Evidência: controles de acesso no sistema de gestão documental." },
      { label: "A informação documentada de origem externa é identificada e controlada?", clausula: "7.5.3", description: "Evidência: normas, legislações e especificações externas registradas na lista mestra." },
      { label: "A informação documentada retida como evidência de conformidade é protegida contra modificações não intencionais?", clausula: "7.5.3", description: "Evidência: registros armazenados em formato que impede alteração." },
    ],
  },
  {
    title: "10. Planejamento e Controle Operacional (Cláusulas 8.1–8.4)",
    fields: [
      { label: "Os processos necessários para o fornecimento de produtos e serviços são planejados, implementados, controlados e mantidos?", clausula: "8.1", description: "Evidência: procedimentos operacionais, instruções de trabalho, planos de controle." },
      { label: "As saídas do planejamento operacional são apropriadas para as operações da organização e estão disponíveis?", clausula: "8.1", description: "Evidência: documentação de processos disponível nos pontos de uso." },
      { label: "Mudanças planejadas são analisadas criticamente e medidas são tomadas para mitigar efeitos adversos?", clausula: "8.1", description: "Evidência: registros de análise de impacto de mudanças operacionais." },
      { label: "Os requisitos para produtos e serviços são determinados incluindo requisitos legais, regulatórios e aqueles considerados necessários?", clausula: "8.2.2", description: "Evidência: especificações de produto/serviço, contratos, regulamentos aplicáveis." },
      { label: "A organização trata as reclamações de clientes e comunicações externas sobre seus produtos e serviços?", clausula: "8.2.1", description: "Evidência: registros de reclamações de clientes, tempo de resposta e resolução." },
      { label: "Os requisitos para produtos e serviços são analisados criticamente antes do comprometimento com o fornecimento?", clausula: "8.2.3", description: "Evidência: análise crítica de pedidos, propostas e contratos documentada." },
      { label: "A organização assegura que produtos, serviços e processos de provedores externos atendem os requisitos especificados?", clausula: "8.4.1", description: "Evidência: critérios de seleção e avaliação de fornecedores, lista de fornecedores aprovados." },
      { label: "O tipo e a extensão do controle aplicado a provedores externos e suas saídas são determinados?", clausula: "8.4.2", description: "Evidência: procedimento de qualificação de fornecedores, inspeção de recebimento." },
    ],
  },
  {
    title: "11. Controle de Produção e Saídas Não Conformes (Cláusulas 8.5–8.7)",
    fields: [
      { label: "A produção e a provisão de serviços são implementadas sob condições controladas, incluindo informações documentadas que definem as características?", clausula: "8.5.1", description: "Evidência: ordens de produção, instruções de trabalho, planos de controle." },
      { label: "A identificação e rastreabilidade das saídas são mantidas quando necessário para assegurar a conformidade?", clausula: "8.5.2", description: "Evidência: sistema de lotes, códigos de rastreabilidade, etiquetas de identificação." },
      { label: "Propriedades pertencentes a clientes ou provedores externos são identificadas, verificadas, protegidas e preservadas?", clausula: "8.5.3", description: "Evidência: registros de propriedades de clientes recebidas, controladas e devolvidas." },
      { label: "As saídas dos processos são preservadas (identificação, manuseio, armazenamento, transporte, proteção) para assegurar a conformidade?", clausula: "8.5.4", description: "Evidência: procedimentos de armazenamento e condições ambientais controladas." },
      { label: "As atividades de liberação de produtos e serviços são implementadas conforme planejado e evidenciadas por informação documentada?", clausula: "8.6", description: "Evidência: registros de inspeção final, laudos de aprovação, assinatura do responsável." },
      { label: "As saídas não conformes são identificadas e controladas para prevenir uso ou entrega não pretendidos?", clausula: "8.7", description: "Evidência: etiquetas de não conformidade, área de quarentena segregada, registros de tratamento." },
    ],
  },
  {
    title: "12. Avaliação do Desempenho (Cláusula 9)",
    fields: [
      { label: "A organização monitora, mede, analisa e avalia o desempenho e a eficácia do SGQ?", clausula: "9.1.1", description: "Evidência: indicadores de desempenho (KPIs) com metas e resultados registrados." },
      { label: "A satisfação do cliente é monitorada? Métodos para obtenção e uso da informação são determinados?", clausula: "9.1.2", description: "Evidência: pesquisas de satisfação, NPS, índice de reclamações, reuniões de feedback." },
      { label: "Auditorias internas são conduzidas em intervalos planejados para verificar se o SGQ está em conformidade e efetivamente implementado?", clausula: "9.2.1", description: "Evidência: programa de auditoria interna com intervalos definidos, relatórios de auditoria." },
      { label: "O programa de auditoria interna considera a importância dos processos, mudanças e resultados de auditorias anteriores?", clausula: "9.2.2", description: "Evidência: programa de auditoria baseado em risco, auditorias mais frequentes em processos críticos." },
      { label: "A Alta Direção analisa criticamente o SGQ em intervalos planejados para assegurar sua adequação, suficiência e eficácia contínuas?", clausula: "9.3.1", description: "Evidência: atas de reunião de análise crítica pela direção." },
      { label: "A análise crítica pela direção aborda todas as entradas requeridas pela norma?", clausula: "9.3.2", description: "Evidência: pauta e ata de análise crítica cobrindo todos os itens da cláusula 9.3.2." },
      { label: "As saídas da análise crítica incluem decisões e ações relacionadas a oportunidades de melhoria e necessidades de mudança ou recursos?", clausula: "9.3.3", description: "Evidência: plano de ação oriundo da análise crítica com responsáveis e prazos." },
    ],
  },
  {
    title: "13. Melhoria (Cláusula 10)",
    fields: [
      { label: "A organização determina e seleciona oportunidades de melhoria e implementa as ações necessárias para atender requisitos e aumentar a satisfação do cliente?", clausula: "10.1", description: "Evidência: registro de oportunidades de melhoria e ações implementadas." },
      { label: "Quando ocorre uma não conformidade, são tomadas ações para controlá-la, corrigir as consequências e determinar as causas?", clausula: "10.2.1", description: "Evidência: relatórios de não conformidade com causa-raiz identificada (5-Porquês, Ishikawa)." },
      { label: "A eficácia das ações corretivas é avaliada e mudanças no SGQ são realizadas se necessário?", clausula: "10.2.1", description: "Evidência: registro de verificação da eficácia das ações corretivas implementadas." },
      { label: "Não conformidades e ações corretivas são retidas como informação documentada?", clausula: "10.2.2", description: "Evidência: sistema de registro de NCs com histórico." },
      { label: "A organização melhora continuamente a adequação, suficiência e eficácia do SGQ usando os resultados de análises e avaliações?", clausula: "10.3", description: "Evidência: tendência de melhoria dos indicadores ao longo do tempo, ciclos PDCA documentados." },
    ],
  },
]

export async function GET(req: Request) {
  try {
    // Proteção por secret
    const url    = new URL(req.url)
    const secret = url.searchParams.get("secret")
    const env    = process.env.SEED_SECRET

    if (!env || secret !== env) {
      return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 })
    }

    // Verifica se já existe
    const existing = await prisma.checklist.findFirst({
      where: { name: TEMPLATE_NAME, isTemplate: true, deletedAt: null },
    })
    if (existing) {
      return NextResponse.json({
        ok: true,
        message: `Template já existe (id=${existing.id}). Nenhuma ação realizada.`,
      })
    }

    // Encontra o primeiro platform admin
    const admin = await prisma.user.findFirst({
      where:   { platformAdmin: true, deletedAt: null },
      orderBy: { id: "asc" },
    })
    if (!admin) {
      return NextResponse.json({
        ok: false,
        error: "Nenhum platform admin encontrado. Crie um usuário com platform_admin=1.",
      }, { status: 400 })
    }

    const totalFields = GRUPOS.reduce((s, g) => s + g.fields.length, 0)

    // Cria o template em transação
    const template = await prisma.$transaction(async (tx) => {
      const tmpl = await tx.checklist.create({
        data: {
          companyId:      null,
          name:           TEMPLATE_NAME,
          description:    TEMPLATE_DESC,
          templateSource: TEMPLATE_SOURCE,
          isTemplate:     true,
          active:         true,
          createdBy:      admin.id,
        },
      })

      let itemOrder = 1
      for (const grupo of GRUPOS) {
        const item = await tx.checklistItem.create({
          data: {
            checklistId: tmpl.id,
            label:       grupo.title,
            order:       itemOrder++,
          },
        })

        let fieldOrder = 1
        for (const campo of grupo.fields) {
          await tx.checklistItemField.create({
            data: {
              itemId:          item.id,
              label:           campo.label,
              description:     campo.description ?? null,
              type:            "SIM_NAO",
              required:        true,
              requirePhoto:    false,
              allowNa:         true,
              reference:       campo.clausula,
              referenceSource: TEMPLATE_SOURCE,
              order:           fieldOrder++,
            },
          })
        }
      }

      return tmpl
    })

    return NextResponse.json({
      ok:       true,
      message:  `Template ISO 9001:2015 criado com sucesso!`,
      id:       template.id,
      secoes:   GRUPOS.length,
      campos:   totalFields,
      criador:  admin.name,
    })

  } catch (err: any) {
    console.error("[GET /api/setup/seed-iso9001]", err)
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
  }
}
