// modules.ts — configuração central dos módulos da plataforma bemoo

export type ModuleKey =
  | "checklists"
  | "intercorrencias"
  | "rastreabilidade"
  | "planos"
  | "captura"
  | "oficina"
  | "efetivo"

export interface ModuleConfig {
  key: ModuleKey
  label: string
  description: string
  icon: string
  href: string
  color: string
}

export const MODULES_CONFIG: ModuleConfig[] = [
  {
    key: "checklists",
    label: "Checklists",
    description: "Listas de verificação com controle de temperatura e ocorrências",
    icon: "CheckSquare",
    href: "/checklists",
    color: "#1F4E4A",
  },
  {
    key: "intercorrencias",
    label: "Intercorrências",
    description: "Registro e acompanhamento de eventos e desvios",
    icon: "AlertTriangle",
    href: "/intercorrencias",
    color: "#D9A23A",
  },
  {
    key: "rastreabilidade",
    label: "Rastreabilidade",
    description: "Controle de ativos, equipamentos e insumos",
    icon: "Tag",
    href: "/rastreabilidade",
    color: "#3D8C84",
  },
  {
    key: "planos",
    label: "Planos de Ação",
    description: "Gestão de ações corretivas e preventivas",
    icon: "Target",
    href: "/planos",
    color: "#2A6B65",
  },
  {
    key: "captura",
    label: "Captura",
    description: "Demandas, tarefas e ideias em um só lugar",
    icon: "Inbox",
    href: "/captura",
    color: "#E07A35",
  },
  {
    key: "oficina",
    label: "Oficina",
    description: "Ordens de serviço, estoque de insumos e indicadores de reaproveitamento",
    icon: "Wrench",
    href: "/oficina",
    color: "#7C5C3E",
  },
  {
    key: "efetivo",
    label: "Controle de Efetivo",
    description: "Gestao de colaboradores, escalas e presenca por turno",
    icon: "Users2",
    href: "/efetivo",
    color: "#1F4E4A",
  },
]

export function getModule(key: ModuleKey): ModuleConfig | undefined {
  return MODULES_CONFIG.find((m) => m.key === key)
}
