// Configuração centralizada de status de escala — usada em EscalaClient e EfetivoDashboardClient

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

export interface StatusCfg {
  bg:     string
  text:   string
  border: string
  label:  string
  full:   string
}

export const STATUS_CFG: Record<string, StatusCfg> = {
  TRABALHA:           { bg: "bg-green-100",  text: "text-green-800",  border: "border-green-200",  label: "T",  full: "Trabalha" },
  FOLGA:              { bg: "bg-gray-100",   text: "text-gray-400",   border: "border-gray-200",   label: "F",  full: "Folga" },
  FERIAS:             { bg: "bg-sky-100",    text: "text-sky-700",    border: "border-sky-200",    label: "FE", full: "Férias" },
  FOLGA_FERIADO:      { bg: "bg-orange-100", text: "text-orange-700", border: "border-orange-200", label: "FF", full: "Feriado" },
  FOLGA_DOMINICAL:    { bg: "bg-amber-50",   text: "text-amber-600",  border: "border-amber-200",  label: "FD", full: "F. Dom." },
  ATESTADO:           { bg: "bg-yellow-100", text: "text-yellow-800", border: "border-yellow-200", label: "AT", full: "Atestado" },
  AFASTAMENTO_INSS:   { bg: "bg-purple-100", text: "text-purple-700", border: "border-purple-200", label: "AI", full: "INSS" },
  FALTA_JUSTIFICADA:  { bg: "bg-red-100",    text: "text-red-700",    border: "border-red-200",    label: "FJ", full: "Falta Just." },
  FALTA_INJUSTIFICADA:{ bg: "bg-red-200",    text: "text-red-800",    border: "border-red-300",    label: "FI", full: "Falta Inj." },
}

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
