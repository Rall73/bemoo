// Biblioteca pura de cálculo de escala — sem dependências de Prisma/Next.js

export type StatusEscala =
  | "TRABALHA"
  | "FOLGA"
  | "FERIAS"
  | "FOLGA_FERIADO"
  | "FOLGA_DOMINICAL"
  | "ATESTADO"
  | "AFASTAMENTO_INSS"
  | "FALTA_JUSTIFICADA"

export interface PadraoEscalaCalc {
  modo:         "FIXO_SEMANAL" | "ROTATIVO"
  diasSemana:   string | null
  diasTrabalho: number | null
  diasFolga:    number | null
}

export interface EventoCalc {
  tipo:       string
  dataInicio: Date
  dataFim:    Date
}

// getUTCDay(): 0=dom, 1=seg, 2=ter, 3=qua, 4=qui, 5=sex, 6=sab
const DIA_SEMANA_PT = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"]

export function calculaDia(
  padrao: PadraoEscalaCalc,
  dataAncora: Date | null,
  data: Date,
  eventos: EventoCalc[]
): StatusEscala {
  const dataMs = data.getTime()
  // Eventos têm prioridade sobre o padrão calculado
  for (const ev of eventos) {
    if (ev.dataInicio.getTime() <= dataMs && dataMs <= ev.dataFim.getTime()) {
      return ev.tipo as StatusEscala
    }
  }

  if (padrao.modo === "FIXO_SEMANAL") {
    const permitidos = (padrao.diasSemana ?? "").toLowerCase().split(",").map((d) => d.trim())
    return permitidos.includes(DIA_SEMANA_PT[data.getUTCDay()]) ? "TRABALHA" : "FOLGA"
  }

  // ROTATIVO
  if (!dataAncora) return "FOLGA"
  const trabalho = padrao.diasTrabalho ?? 4
  const ciclo = trabalho + (padrao.diasFolga ?? 2)
  const diff = Math.round((data.getTime() - dataAncora.getTime()) / 86_400_000)
  const pos = ((diff % ciclo) + ciclo) % ciclo
  return pos < trabalho ? "TRABALHA" : "FOLGA"
}

/** Devolve array de Dates (UTC midnight) para cada dia do mês. mes é 1-indexed. */
export function diasDoMes(ano: number, mes: number): Date[] {
  const qtd = new Date(Date.UTC(ano, mes, 0)).getUTCDate()
  return Array.from({ length: qtd }, (_, i) => new Date(Date.UTC(ano, mes - 1, i + 1)))
}

/** Parseia "YYYY-MM" em { ano, mesNum }. */
export function parseMes(mes: string): { ano: number; mesNum: number } {
  const [ano, mesNum] = mes.split("-").map(Number)
  return { ano, mesNum }
}

/** Abreviação PT para o dia da semana de uma Date UTC. */
export function diaSemanaAbrev(data: Date): string {
  return DIA_SEMANA_PT[data.getUTCDay()]
}
