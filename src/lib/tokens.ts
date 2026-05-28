// tokens.ts — bemoo design tokens (TypeScript, Paleta A ativa)

export const palette = {
  primary900: "#143733",
  primary:    "#1F4E4A",
  primary700: "#2A6B65",
  primary500: "#3D8C84",
  primary100: "#D6EBE8",
  primary050: "#EEF6F4",
  accent:     "#E07A35",
  accent100:  "#FBE6D6",
  success:    "#2F9E64",
  error:      "#C44545",
  warn:       "#D9A23A",
  gray900:    "#1A1F23",
  gray700:    "#4A5057",
  gray400:    "#8D9298",
  gray200:    "#D9DEE3",
  gray100:    "#F2F4F6",
  gray050:    "#F8F9FB",
  white:      "#FFFFFF",
} as const

export const fonts = {
  manrope:      "var(--font-manrope)",
  inter:        "var(--font-inter)",
  mono:         "var(--font-mono)",
} as const

export const radii = {
  none:   "0px",
  soft:   "6px",
  round:  "10px",
  full:   "999px",
} as const

// Módulos da plataforma — usado em NavSidebar e MODULES_CONFIG
export const MODULE_ICONS = {
  checklists:      "checksquare",
  intercorrencias: "alert-triangle",
  rastreabilidade: "tag",
  planos:          "target",
  captura:         "inbox",
} as const
