import Link from "next/link"
import { BemooLogo } from "@/components/Logo"
import { CheckSquare, AlertTriangle, Tag, Target, Inbox, ArrowRight, Check } from "lucide-react"

const modules = [
  {
    icon: CheckSquare,
    name: "Checklists",
    desc: "Listas de verificação com controle de temperatura e registro de ocorrências em tempo real.",
    color: "text-primary",
    bg: "bg-primary-50",
  },
  {
    icon: AlertTriangle,
    name: "Intercorrências",
    desc: "Registre e acompanhe eventos e desvios operacionais com histórico completo.",
    color: "text-warn",
    bg: "bg-yellow-50",
  },
  {
    icon: Tag,
    name: "Rastreabilidade",
    desc: "Controle ativos, equipamentos e insumos com trilha de auditoria.",
    color: "text-primary-500",
    bg: "bg-primary-50",
  },
  {
    icon: Target,
    name: "Planos de Ação",
    desc: "Gerencie ações corretivas e preventivas com prazos e responsáveis.",
    color: "text-primary-700",
    bg: "bg-primary-50",
  },
  {
    icon: Inbox,
    name: "Captura",
    desc: "Centralize demandas, tarefas e ideias da equipe em um único lugar.",
    color: "text-accent",
    bg: "bg-accent-100",
  },
]

const benefits = [
  "Multi-módulo: ative só o que precisa",
  "Multi-empresa: cada empresa no seu espaço",
  "Controle de acesso por perfil",
  "Histórico completo e soft delete",
  "Interface limpa, rápida e responsiva",
]

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="border-b border-gray-100 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <BemooLogo size={28} color="#1F4E4A" />
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors px-3 py-1.5"
            >
              Entrar
            </Link>
            <Link
              href="/login"
              className="text-sm font-medium bg-primary text-white px-4 py-2 rounded-soft hover:bg-primary-700 transition-colors"
            >
              Começar grátis
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 py-24 text-center">
        <div className="inline-flex items-center gap-2 bg-primary-50 text-primary text-xs font-medium px-3 py-1.5 rounded-full mb-6">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          Plataforma de gestão operacional
        </div>
        <h1
          className="text-5xl font-semibold text-gray-900 mb-6 leading-tight"
          style={{ letterSpacing: "-0.025em" }}
        >
          Tudo o que a sua operação
          <br />
          precisa, em um só lugar.
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-10">
          Checklists, intercorrências, rastreabilidade, planos de ação e captura de demandas —
          cinco módulos integrados, cada um ativado conforme a necessidade da sua empresa.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-soft font-medium hover:bg-primary-700 transition-colors"
          >
            Acessar plataforma
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* Módulos */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2" style={{ letterSpacing: "-0.01em" }}>
            Cinco módulos. Uma plataforma.
          </h2>
          <p className="text-gray-500 mb-10">
            Ative os módulos que fazem sentido para o seu negócio hoje, e adicione os demais quando precisar.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {modules.map((mod) => {
              const Icon = mod.icon
              return (
                <div
                  key={mod.name}
                  className="bg-white rounded-round p-6 border border-gray-200 hover:shadow-md transition-shadow"
                >
                  <div className={`inline-flex items-center justify-center w-10 h-10 rounded-soft mb-4 ${mod.bg}`}>
                    <Icon size={20} className={mod.color} strokeWidth={2} />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1">{mod.name}</h3>
                  <p className="text-sm text-gray-500">{mod.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Benefícios */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4" style={{ letterSpacing: "-0.01em" }}>
              Construído para empresas que levam a sério a operação.
            </h2>
            <p className="text-gray-500 mb-8">
              Multi-módulo, multi-tenant e com controle de acesso granular — o bemoo adapta-se
              ao porte e ao fluxo da sua empresa.
            </p>
            <ul className="space-y-3">
              {benefits.map((b) => (
                <li key={b} className="flex items-start gap-3 text-sm text-gray-700">
                  <div className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-primary-100 flex items-center justify-center">
                    <Check size={11} className="text-primary" strokeWidth={2.5} />
                  </div>
                  {b}
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-primary rounded-round p-8 flex flex-col items-center justify-center text-center min-h-[260px]">
            <BemooLogo size={40} color="white" accent="#E07A35" />
            <p className="text-primary-100 text-sm mt-4 max-w-xs leading-relaxed">
              &ldquo;bemoo cuida do que está bem — e dos bens da sua operação.&rdquo;
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between text-sm text-gray-400">
          <BemooLogo size={20} color="#8D9298" />
          <span>© {new Date().getFullYear()} bemoo</span>
        </div>
      </footer>
    </div>
  )
}
