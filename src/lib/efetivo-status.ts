// Configuração centralizada de status de escala — usada em EscalaClient, EfetivoDashboardClient e ChamadaClient

export type StatusEscalaUI =
  | "TRABALHA"
  | "FOLGA"
  | "FERIAS"
  | "FOLGA_FERIADO"
  | "FOLGA_DOMINICAL"
  | "ATESTADO"
  | "AFASTAMENTO_INSS"
  | "FALTA_JUSTIFICADA"
  | "FALTA_INJUSTIFICADA"
  | "ATRASO"
  | "SAIDA_ANTECIPADA"
  | "HORA_EXTRA"
  | "TROCA_TURNO_SAIDA"
  | "TROCA_TURNO_ENTRADA"

export interface StatusCfg {
  bg:     string
  text:   string
  border: string
  label:  string
  full:   string
}

export const STATUS_CFG: Record<string, StatusCfg> = {
  TRABALHA:            { bg: "bg-green-100",   text: "text-green-800",   border: "border-green-200",   label: "T",  full: "Trabalha" },
  FOLGA:               { bg: "bg-gray-100",    text: "text-gray-400",    border: "border-gray-200",    label: "F",  full: "Folga" },
  FERIAS:              { bg: "bg-sky-100",     text: "text-sky-700",     border: "border-sky-200",     label: "FE", full: "Férias" },
  FOLGA_FERIADO:       { bg: "bg-orange-100",  text: "text-orange-700",  border: "border-orange-200",  label: "FF", full: "Feriado" },
  FOLGA_DOMINICAL:     { bg: "bg-amber-50",    text: "text-amber-600",   border: "border-amber-200",   label: "FD", full: "F. Dom." },
  ATESTADO:            { bg: "bg-yellow-100",  text: "text-yellow-800",  border: "border-yellow-200",  label: "AT", full: "Atestado" },
  AFASTAMENTO_INSS:    { bg: "bg-purple-100",  text: "text-purple-700",  border: "border-purple-200",  label: "AI", full: "INSS" },
  FALTA_JUSTIFICADA:   { bg: "bg-red-100",     text: "text-red-700",     border: "border-red-200",     label: "FJ", full: "Falta Just." },
  FALTA_INJUSTIFICADA: { bg: "bg-red-200",     text: "text-red-800",     border: "border-red-300",     label: "FI", full: "Falta Inj." },
  ATRASO:              { bg: "bg-amber-100",   text: "text-amber-800",   border: "border-amber-300",   label: "Az", full: "Atraso" },
  SAIDA_ANTECIPADA:    { bg: "bg-orange-100",  text: "text-orange-800",  border: "border-orange-300",  label: "SA", full: "Saída Ant." },
  HORA_EXTRA:          { bg: "bg-blue-100",    text: "text-blue-700",    border: "border-blue-200",    label: "HE", full: "Hora Extra" },
  TROCA_TURNO_SAIDA:   { bg: "bg-slate-100",   text: "text-slate-600",   border: "border-slate-200",   label: "TS", full: "Troca/Saída" },
  TROCA_TURNO_ENTRADA: { bg: "bg-teal-100",    text: "text-teal-700",    border: "border-teal-200",    label: "TE", full: "Troca/Entr." },
}

// Categorização para abas de filtro
export const STATUS_GRUPO: Record<string, "trabalha" | "ausencia" | "folga"> = {
  TRABALHA:            "trabalha",
  ATRASO:              "trabalha",
  SAIDA_ANTECIPADA:    "trabalha",
  HORA_EXTRA:          "trabalha",
  TROCA_TURNO_ENTRADA: "trabalha",
  FALTA_JUSTIFICADA:   "ausencia",
  FALTA_INJUSTIFICADA: "ausencia",
  ATESTADO:            "ausencia",
  AFASTAMENTO_INSS:    "ausencia",
  FERIAS:              "ausencia",
  TROCA_TURNO_SAIDA:   "ausencia",
  FOLGA:               "folga",
  FOLGA_FERIADO:       "folga",
  FOLGA_DOMINICAL:     "folga",
}

// Rótulo do campo de hora para tipos que exigem registro de horário
export const HORA_AJUSTE_LABEL: Partial<Record<string, string>> = {
  ATRASO:              "Hora de chegada",
  SAIDA_ANTECIPADA:    "Hora de saída",
  HORA_EXTRA:          "Hora de término",
  TROCA_TURNO_ENTRADA: "Início da cobertura",
}

// Tipos disponíveis no modal da Chamada (agrupados por categoria)
export type TipoEventoChamada = { value: string; label: string; grupo: string }

export const TIPOS_EVENTO_CHAMADA: TipoEventoChamada[] = [
  { value: "FALTA_INJUSTIFICADA",  label: "Falta injustificada",  grupo: "Ausências" },
  { value: "FALTA_JUSTIFICADA",    label: "Falta justificada",    grupo: "Ausências" },
  { value: "ATESTADO",             label: "Atestado médico",      grupo: "Ausências" },
  { value: "AFASTAMENTO_INSS",     label: "Afastamento INSS",     grupo: "Ausências" },
  { value: "FERIAS",               label: "Férias",               grupo: "Ausências" },
  { value: "ATRASO",               label: "Chegada atrasada",     grupo: "Ajuste de ponto" },
  { value: "SAIDA_ANTECIPADA",     label: "Saída antecipada",     grupo: "Ajuste de ponto" },
  { value: "HORA_EXTRA",           label: "Hora extra",           grupo: "Ajuste de ponto" },
  { value: "TROCA_TURNO_SAIDA",    label: "Troca — cedeu o turno",  grupo: "Troca de turno" },
  { value: "TROCA_TURNO_ENTRADA",  label: "Troca — cobriu o turno", grupo: "Troca de turno" },
  { value: "FOLGA_FERIADO",        label: "Folga Feriado",        grupo: "Outros" },
  { value: "FOLGA_DOMINICAL",      label: "Folga Dominical",      grupo: "Outros" },
]

// Subconjuntos mantidos para retrocompatibilidade com EscalaClient e Dashboard
export const TIPOS_EVENTO_AUSENCIA = [
  { value: "ATESTADO",            label: "Atestado médico" },
  { value: "AFASTAMENTO_INSS",    label: "Afastamento INSS" },
  { value: "FALTA_JUSTIFICADA",   label: "Falta justificada" },
  { value: "FALTA_INJUSTIFICADA", label: "Falta injustificada" },
  { value: "FERIAS",              label: "Férias" },
]

export const TIPOS_EVENTO_TODOS = [
  ...TIPOS_EVENTO_AUSENCIA,
  { value: "FOLGA_FERIADO",   label: "Folga Feriado" },
  { value: "FOLGA_DOMINICAL", label: "Folga Dominical" },
]
