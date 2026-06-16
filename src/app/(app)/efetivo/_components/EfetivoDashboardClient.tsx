"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import {
  Users2, CalendarDays, AlertCircle, TrendingDown, RefreshCw,
  Loader2, Clock, Plus, X, Search, ChevronRight, ChevronDown, ChevronUp,
} from "lucide-react"
import { formatarData } from "@/lib/date"
import { STATUS_CFG, TIPOS_EVENTO_AUSENCIA } from "@/lib/efetivo-status"

// ─── Tipos ─────────────────────────────────────────────────────────────────

interface EventoHoje {
  id:         number
  tipo:       string
  dataInicio: string
  dataFim:    string
  observacao: string | null
}

interface ColabDash {
  id:         number
  matricula:  string
  nome:       string
  turno:      { id: number; codigo: string; horaInicio: string; horaFim: string; cruzaMeiaNoite: boolean }
  area:       { id: number; nome: string }
  statusHoje: string
  eventoHoje: EventoHoje | null
}

interface TurnoDash {
  id:            number
  codigo:        string
  horaInicio:    string
  horaFim:       string
  cruzaMeiaNoite: boolean
  ativoAgora:    boolean
  trabalha:      number
  ausentes:      number
}

interface Contagem {
  trabalha:           number
  folga:              number
  ferias:             number
  atestado:           number
  afastamentoInss:    number
  faltaJustificada:   number
  faltaInjustificada: number
  total:              number
}

interface DashData {
  hojeISO:       string
  horaAtualBRT:  string
  contagem:      Contagem
  turnos:        TurnoDash[]
  colaboradores: ColabDash[]
}

// ─── Componente ────────────────────────────────────────────────────────────

interface Props {
  turnos: { id: number; codigo: string }[]
  role:   string
}

export function EfetivoDashboardClient({ turnos, role }: Props) {
  const podeEditar = role === "ADMIN" || role === "GESTOR"

  const [dados,      setDados]      = useState<DashData | null>(null)
  const [loading,    setLoading]    = useState(true)
  const [atualizadoEm, setAtualizadoEm] = useState("")

  // Filtros da chamada
  const [turnoFiltro,  setTurnoFiltro]  = useState<number | null>(null)
  const [statusFiltro, setStatusFiltro] = useState<"todos" | "trabalhando" | "ausencias" | "folga">("todos")
  const [busca,        setBusca]        = useState("")
  const [chamadaAberta, setChamadaAberta] = useState(false)
  const [areaFiltro,    setAreaFiltro]    = useState<number | null>(null)

  // Modal de ausência
  const [modalColab,   setModalColab]   = useState<ColabDash | null>(null)
  const [evTipo,       setEvTipo]       = useState("FALTA_INJUSTIFICADA")
  const [evDataInicio, setEvDataInicio] = useState("")
  const [evDataFim,    setEvDataFim]    = useState("")
  const [evObs,        setEvObs]        = useState("")
  const [evSaving,     setEvSaving]     = useState(false)
  const [evErro,       setEvErro]       = useState("")

  // ─── Fetch ──────────────────────────────────────────────────────

  const fetchDash = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await fetch("/api/efetivo/dashboard")
      const json = await res.json()
      if (json.ok) {
        setDados(json.data)
        setAtualizadoEm(new Date().toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" }))
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchDash() }, [fetchDash])

  // ─── Chamada filtrada ────────────────────────────────────────────

  const chamadaFiltrada = useMemo(() => {
    if (!dados) return []
    let lista = dados.colaboradores
    if (turnoFiltro) lista = lista.filter((c) => c.turno.id === turnoFiltro)
    if (areaFiltro)  lista = lista.filter((c) => c.area.id === areaFiltro)
    if (statusFiltro === "trabalhando") lista = lista.filter((c) => c.statusHoje === "TRABALHA")
    if (statusFiltro === "ausencias")   lista = lista.filter((c) => c.statusHoje !== "TRABALHA" && c.statusHoje !== "FOLGA" && !c.statusHoje.startsWith("FOLGA_"))
    if (statusFiltro === "folga")       lista = lista.filter((c) => c.statusHoje === "FOLGA" || c.statusHoje.startsWith("FOLGA_"))
    if (busca.trim()) {
      const q = busca.toLowerCase()
      lista = lista.filter((c) => c.nome.toLowerCase().includes(q) || c.matricula.toLowerCase().includes(q))
    }
    return lista
  }, [dados, turnoFiltro, areaFiltro, statusFiltro, busca])

  // ─── Distribuição por área (client-side) ────────────────────────

  const porArea = useMemo(() => {
    if (!dados) return []
    const map = new Map<number, { id: number; nome: string; total: number; trabalha: number; ausentes: number }>()
    for (const c of dados.colaboradores) {
      const a = map.get(c.area.id) ?? { id: c.area.id, nome: c.area.nome, total: 0, trabalha: 0, ausentes: 0 }
      a.total++
      if (c.statusHoje === "TRABALHA") a.trabalha++
      else if (c.statusHoje !== "FOLGA" && !c.statusHoje.startsWith("FOLGA_")) a.ausentes++
      map.set(c.area.id, a)
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total)
  }, [dados])

  // ─── Modal ausência ─────────────────────────────────────────────

  function abrirModal(colab: ColabDash) {
    setModalColab(colab)
    setEvTipo("FALTA_INJUSTIFICADA")
    setEvDataInicio(dados?.hojeISO ?? "")
    setEvDataFim(dados?.hojeISO ?? "")
    setEvObs("")
    setEvErro("")
  }

  async function salvarAusencia() {
    if (!modalColab) return
    setEvSaving(true)
    setEvErro("")
    try {
      const res  = await fetch("/api/efetivo/eventos", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          colaboradorId: modalColab.id,
          tipo:          evTipo,
          dataInicio:    evDataInicio,
          dataFim:       evDataFim,
          observacao:    evObs || null,
        }),
      })
      const json = await res.json()
      if (!json.ok) { setEvErro(json.message ?? "Erro ao salvar."); return }
      setModalColab(null)
      fetchDash()
    } catch {
      setEvErro("Erro de rede.")
    } finally {
      setEvSaving(false)
    }
  }

  async function removerEvento(id: number) {
    if (!confirm("Remover este registro? O colaborador voltará ao status calculado pela escala.")) return
    const res = await fetch(`/api/efetivo/eventos/${id}`, { method: "DELETE" })
    if (res.ok) fetchDash()
  }

  // ─── Helpers de contagem para abas da chamada ────────────────────

  const contsChamada = useMemo(() => {
    if (!dados) return { todos: 0, trabalhando: 0, ausencias: 0, folga: 0 }
    let base = dados.colaboradores
    if (turnoFiltro) base = base.filter((c) => c.turno.id === turnoFiltro)
    if (areaFiltro)  base = base.filter((c) => c.area.id === areaFiltro)
    return {
      todos:       base.length,
      trabalhando: base.filter((c) => c.statusHoje === "TRABALHA").length,
      ausencias:   base.filter((c) => c.statusHoje !== "TRABALHA" && c.statusHoje !== "FOLGA" && !c.statusHoje.startsWith("FOLGA_")).length,
      folga:       base.filter((c) => c.statusHoje === "FOLGA" || c.statusHoje.startsWith("FOLGA_")).length,
    }
  }, [dados, turnoFiltro, areaFiltro])

  const areasDisponiveis = useMemo(() => {
    if (!dados) return []
    const map = new Map<number, string>()
    for (const c of dados.colaboradores) map.set(c.area.id, c.area.nome)
    return Array.from(map.entries()).map(([id, nome]) => ({ id, nome })).sort((a, b) => a.nome.localeCompare(b.nome))
  }, [dados])

  // ─── Render ─────────────────────────────────────────────────────

  const c = dados?.contagem

  return (
    <div className="p-6 space-y-6 max-w-screen-xl">

      {/* ── Cabeçalho ──────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <Users2 size={22} className="text-primary" />
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Dashboard — Controle de Efetivo</h1>
          {atualizadoEm && (
            <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
              <Clock size={11} />
              Dados de {dados?.hojeISO ? formatarData(dados.hojeISO) : "hoje"}, atualizados às {atualizadoEm}
            </p>
          )}
        </div>
        <button
          onClick={fetchDash}
          disabled={loading}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-600 border border-gray-300 rounded-soft hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          Atualizar
        </button>
      </div>

      {loading && !dados ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={28} className="animate-spin text-primary" />
        </div>
      ) : !dados ? null : (
        <>
          {/* ── Cards ──────────────────────────────────────────── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard
              icon={<Users2 size={18} className="text-green-600" />}
              bg="bg-green-50"
              border="border-green-200"
              label="Trabalhando hoje"
              value={c!.trabalha}
              sub={`de ${c!.total} ativos`}
            />
            <MetricCard
              icon={<CalendarDays size={18} className="text-sky-600" />}
              bg="bg-sky-50"
              border="border-sky-200"
              label="Afastamentos"
              value={c!.ferias + c!.atestado + c!.afastamentoInss}
              sub={`${c!.ferias} férias · ${c!.atestado} atestados · ${c!.afastamentoInss} INSS`}
            />
            <MetricCard
              icon={<AlertCircle size={18} className="text-red-500" />}
              bg="bg-red-50"
              border="border-red-200"
              label="Faltas registradas"
              value={c!.faltaJustificada + c!.faltaInjustificada}
              sub={`${c!.faltaJustificada} justif. · ${c!.faltaInjustificada} injustif.`}
            />
            <MetricCard
              icon={<TrendingDown size={18} className="text-gray-500" />}
              bg="bg-gray-50"
              border="border-gray-200"
              label="De folga hoje"
              value={c!.folga}
              sub="folga padrão / feriado / dominical"
            />
          </div>

          {/* ── Turnos ─────────────────────────────────────────── */}
          <section>
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Turnos</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {dados.turnos.map((t) => (
                <div
                  key={t.id}
                  className={`rounded-soft border p-3 relative ${
                    t.ativoAgora ? "border-green-300 bg-green-50" : "border-gray-200 bg-white"
                  }`}
                >
                  {t.ativoAgora && (
                    <span className="absolute top-2 right-2 flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                    </span>
                  )}
                  <div className="text-lg font-bold text-gray-900">{t.codigo}</div>
                  <div className="text-[10px] text-gray-400 mt-0.5">
                    {t.horaInicio} – {t.horaFim}
                    {t.cruzaMeiaNoite && " +1"}
                  </div>
                  <div className="mt-2 text-2xl font-bold text-primary">{t.trabalha}</div>
                  <div className="text-[10px] text-gray-500">escalados</div>
                  {t.ausentes > 0 && (
                    <div className="text-[10px] text-red-500 mt-0.5">{t.ausentes} ausência{t.ausentes > 1 ? "s" : ""}</div>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* ── Distribuição por área ───────────────────────────── */}
          <section>
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Distribuição por Área</h2>
            <div className="border border-gray-200 rounded-soft overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-3 py-2 text-left font-medium text-gray-500">Área</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-500 w-20">Total</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-500 w-24">Trabalhando</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-500 w-20">Ausentes</th>
                    <th className="px-3 py-2 w-32" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {porArea.map((a) => {
                    const pct = a.total > 0 ? Math.round((a.trabalha / a.total) * 100) : 0
                    return (
                      <tr key={a.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2 text-gray-800 font-medium">{a.nome}</td>
                        <td className="px-3 py-2 text-right text-gray-500">{a.total}</td>
                        <td className="px-3 py-2 text-right">
                          <span className="font-semibold text-green-700">{a.trabalha}</span>
                        </td>
                        <td className="px-3 py-2 text-right">
                          {a.ausentes > 0
                            ? <span className="text-red-500 font-medium">{a.ausentes}</span>
                            : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1.5">
                            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-green-400 rounded-full transition-all"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-gray-400 w-7 text-right">{pct}%</span>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* ── Chamada do dia ─────────────────────────────────── */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-sm font-semibold text-gray-700">Chamada de Hoje</h2>
              <span className="text-xs text-gray-400">({dados.colaboradores.length})</span>
              <button
                onClick={() => setChamadaAberta(!chamadaAberta)}
                className="ml-auto flex items-center gap-1 px-2 py-1 text-xs text-gray-500 border border-gray-200 rounded hover:bg-gray-50 transition-colors"
              >
                {chamadaAberta ? <><ChevronUp size={13} /> Ocultar</> : <><ChevronDown size={13} /> Expandir</>}
              </button>
            </div>

            {chamadaAberta && (
              <>
                <div className="flex items-center gap-3 mb-3 flex-wrap">
                  {/* Filtro turno */}
                  <div className="flex gap-1 flex-wrap">
                    <button
                      onClick={() => setTurnoFiltro(null)}
                      className={`px-2 py-0.5 text-xs rounded-full border transition-colors ${
                        turnoFiltro === null ? "bg-primary text-white border-primary" : "text-gray-600 border-gray-300 hover:border-gray-500"
                      }`}
                    >
                      Todos os turnos
                    </button>
                    {turnos.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setTurnoFiltro(t.id)}
                        className={`px-2 py-0.5 text-xs rounded-full border transition-colors ${
                          turnoFiltro === t.id ? "bg-primary text-white border-primary" : "text-gray-600 border-gray-300 hover:border-gray-500"
                        }`}
                      >
                        {t.codigo}
                      </button>
                    ))}
                  </div>

                  {/* Filtro área */}
                  <select
                    value={areaFiltro ?? ""}
                    onChange={(e) => setAreaFiltro(e.target.value ? Number(e.target.value) : null)}
                    className="text-xs text-gray-800 bg-white border border-gray-300 rounded-soft px-2 py-1"
                  >
                    <option value="">Todas as áreas</option>
                    {areasDisponiveis.map((a) => (
                      <option key={a.id} value={a.id}>{a.nome}</option>
                    ))}
                  </select>

                  {/* Busca */}
                  <div className="relative flex items-center ml-auto">
                    <Search size={13} className="absolute left-2 text-gray-400 pointer-events-none" />
                    <input
                      type="text"
                      value={busca}
                      onChange={(e) => setBusca(e.target.value)}
                      placeholder="Buscar…"
                      className="text-xs text-gray-800 bg-white border border-gray-300 rounded-soft pl-6 pr-2 py-1 w-40"
                    />
                    {busca && (
                      <button onClick={() => setBusca("")} className="absolute right-1.5 text-gray-400 hover:text-gray-600">
                        <X size={11} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Abas de status */}
                <div className="flex gap-0 border-b border-gray-200 mb-3">
                  {([
                    ["todos",       "Todos",        contsChamada.todos],
                    ["trabalhando", "Trabalhando",   contsChamada.trabalhando],
                    ["ausencias",   "Ausências",     contsChamada.ausencias],
                    ["folga",       "Folga",         contsChamada.folga],
                  ] as const).map(([key, label, count]) => (
                    <button
                      key={key}
                      onClick={() => setStatusFiltro(key)}
                      className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors -mb-px ${
                        statusFiltro === key
                          ? "border-primary text-primary"
                          : "border-transparent text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      {label}
                      <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] ${
                        statusFiltro === key ? "bg-primary/10 text-primary" : "bg-gray-100 text-gray-500"
                      }`}>
                        {count}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Tabela */}
                <div className="border border-gray-200 rounded-soft overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="px-3 py-2 text-left font-medium text-gray-500 w-[40%]">Colaborador</th>
                        <th className="px-2 py-2 text-left font-medium text-gray-500 w-16">Turno</th>
                        <th className="px-2 py-2 text-left font-medium text-gray-500">Área</th>
                        <th className="px-2 py-2 text-left font-medium text-gray-500 w-32">Status</th>
                        {podeEditar && <th className="px-2 py-2 w-36" />}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {chamadaFiltrada.length === 0 ? (
                        <tr>
                          <td colSpan={podeEditar ? 5 : 4} className="px-3 py-6 text-center text-gray-400">
                            Nenhum colaborador neste filtro.
                          </td>
                        </tr>
                      ) : chamadaFiltrada.map((c) => {
                        const cfg = STATUS_CFG[c.statusHoje] ?? STATUS_CFG.FOLGA
                        return (
                          <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-3 py-2">
                              <div className="font-medium text-gray-800">{c.nome}</div>
                              <div className="text-[10px] text-gray-400">{c.matricula}</div>
                            </td>
                            <td className="px-2 py-2 font-medium text-gray-700">{c.turno.codigo}</td>
                            <td className="px-2 py-2 text-gray-500 truncate max-w-[160px]">{c.area.nome}</td>
                            <td className="px-2 py-2">
                              <div className="flex items-center gap-1.5">
                                <span className={`inline-flex items-center px-1.5 py-0.5 rounded border text-[10px] font-medium ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                                  {cfg.full}
                                </span>
                              </div>
                              {c.eventoHoje && (
                                <div className="text-[10px] text-gray-400 mt-0.5 truncate max-w-[120px]">
                                  {c.eventoHoje.dataInicio !== c.eventoHoje.dataFim
                                    ? `${formatarData(c.eventoHoje.dataInicio)} → ${formatarData(c.eventoHoje.dataFim)}`
                                    : formatarData(c.eventoHoje.dataInicio)}
                                </div>
                              )}
                            </td>
                            {podeEditar && (
                              <td className="px-2 py-2 text-right">
                                {c.statusHoje === "TRABALHA" ? (
                                  <button
                                    onClick={() => abrirModal(c)}
                                    className="flex items-center gap-1 px-2 py-1 text-[11px] text-gray-600 border border-gray-300 rounded hover:bg-gray-100 transition-colors ml-auto"
                                  >
                                    <Plus size={11} />
                                    Ausência
                                  </button>
                                ) : c.eventoHoje ? (
                                  <button
                                    onClick={() => removerEvento(c.eventoHoje!.id)}
                                    className="flex items-center gap-1 px-2 py-1 text-[11px] text-red-500 border border-red-200 rounded hover:bg-red-50 transition-colors ml-auto"
                                  >
                                    <X size={11} />
                                    Remover
                                  </button>
                                ) : null}
                              </td>
                            )}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>
        </>
      )}

      {/* ── Modal registrar ausência ────────────────────────────── */}
      {modalColab && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setModalColab(null)}
        >
          <div
            className="bg-white rounded-soft shadow-xl w-full max-w-sm p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="font-semibold text-gray-900 text-sm">{modalColab.nome}</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {modalColab.matricula} · Turno {modalColab.turno.codigo} · {modalColab.area.nome}
                </p>
              </div>
              <button onClick={() => setModalColab(null)} className="p-1 rounded hover:bg-gray-100 text-gray-400">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Tipo de ausência</label>
                <select
                  value={evTipo}
                  onChange={(e) => setEvTipo(e.target.value)}
                  className="w-full text-xs text-gray-800 bg-white border border-gray-300 rounded-soft px-2 py-1.5"
                >
                  {TIPOS_EVENTO_AUSENCIA.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Início</label>
                  <input type="date" value={evDataInicio} onChange={(e) => setEvDataInicio(e.target.value)}
                    className="w-full text-xs text-gray-800 bg-white border border-gray-300 rounded-soft px-2 py-1.5" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Fim</label>
                  <input type="date" value={evDataFim} onChange={(e) => setEvDataFim(e.target.value)}
                    className="w-full text-xs text-gray-800 bg-white border border-gray-300 rounded-soft px-2 py-1.5" />
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">Observação (opcional)</label>
                <input type="text" value={evObs} onChange={(e) => setEvObs(e.target.value)}
                  placeholder="Ex.: CID A00, protocolo INSS…"
                  className="w-full text-xs text-gray-800 bg-white border border-gray-300 rounded-soft px-2 py-1.5" />
              </div>

              {evErro && <p className="text-xs text-red-600">{evErro}</p>}

              <button
                onClick={salvarAusencia}
                disabled={evSaving || !evDataInicio || !evDataFim}
                className="w-full py-2 text-xs font-medium bg-primary text-white rounded-soft hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
              >
                {evSaving ? <Loader2 size={12} className="animate-spin" /> : <ChevronRight size={12} />}
                Registrar Ausência
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Sub-componente card ────────────────────────────────────────────────────

function MetricCard({
  icon, bg, border, label, value, sub,
}: {
  icon:   React.ReactNode
  bg:     string
  border: string
  label:  string
  value:  number
  sub:    string
}) {
  return (
    <div className={`rounded-soft border ${border} ${bg} p-4`}>
      <div className="flex items-start justify-between mb-2">
        <span className="text-xs font-medium text-gray-600">{label}</span>
        <div className={`p-1.5 rounded ${bg}`}>{icon}</div>
      </div>
      <div className="text-3xl font-bold text-gray-900">{value}</div>
      <div className="text-[10px] text-gray-500 mt-1">{sub}</div>
    </div>
  )
}
