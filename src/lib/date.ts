// date.ts — helpers de fuso horário
// Servidor roda em UTC; usuários estão em Brasília (UTC-3, sem horário de verão)
// NUNCA use new Date() cru em rotas de API para representar "hoje"

const BRT_OFFSET_MS = -3 * 60 * 60 * 1000

/** Retorna a data de "hoje" em Brasília como objeto Date com hora zerada em UTC */
export function hojeNoBrasil(): Date {
  const agora = new Date()
  const brt = new Date(agora.getTime() + BRT_OFFSET_MS)
  return new Date(
    Date.UTC(brt.getUTCFullYear(), brt.getUTCMonth(), brt.getUTCDate())
  )
}

/** Primeiro dia do mês corrente em Brasília */
export function inicioMesNoBrasil(): Date {
  const hoje = hojeNoBrasil()
  return new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), 1))
}

/** Último dia do mês corrente em Brasília */
export function fimMesNoBrasil(): Date {
  const hoje = hojeNoBrasil()
  return new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth() + 1, 0))
}

/** Converte string "YYYY-MM-DD" para Date UTC (sem deslocamento de fuso) */
export function parseDataLocal(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

/** Formata Date para exibição no padrão brasileiro (cliente) */
export function formatarData(date: Date | string | null | undefined): string {
  if (!date) return "—"
  const d = typeof date === "string" ? new Date(date) : date
  return d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })
}

/** Formata Date com hora para exibição no padrão brasileiro (cliente) */
export function formatarDataHora(date: Date | string | null | undefined): string {
  if (!date) return "—"
  const d = typeof date === "string" ? new Date(date) : date
  return d.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })
}
