"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { ChevronLeft, ChevronRight, CalendarDays, Plus, X, Loader2, CheckCircle2, Search } from "lucide-react"
import { formatarData } from "@/lib/date"

// ─── Tipos ─────────────────────────────────────────────────────────────────

interface ColabEscala {
  id:        number
  matricula: string
  nome:      string
  turno:     { id: number; codigo: string }
  area:      { id: number; nome: string }
  escala:    Record<number, string>
}

interface EventoEscala {
  id:            number
  colaboradorId: number
  tipo:          string
  dataInicio:    string
  dataFim:       string
  observacao:    string | null
}

interface EscalaDados {
  mes:           string
  dias:          number[]
  diasSemana:    string[]
  colaboradores: ColabEscala[]
  eventos:       EventoEscala[]
  snapshot:      { mes: string; publicadoEm: string } | null
}

interface ModalState {
  colaboradorId:   number
  colaboradorNome: string
  dia:             number
  date:            string
}

// ─── Constantes ────────────────────────────────────────────────────────────

const STATUS_CFG: Record<string, { bg: string; text: string; border: string; label: string; full: string }> = {
  TRABALHA:          { bg: "bg-green-100",  text: "text-green-800",  border: "border-green-200",  label: "T",  full: "Trabalha" },
  FOLGA:             { bg: "bg-gray-100",   text: "text-gray-400",   border: "border-gray-200",   label: "F",  full: "Folga" },
  FERIAS:            { bg: "bg-sky-100",    text: "text-sky-700",    border: "border-sky-200",    label: "FE", full: "Férias" },
  FOLGA_FERIADO:     { bg: "bg-orange-100", text: "text-orange-700", border: "border-orange-200", label: "FF", full: "Feriado" },
  FOLGA_DOMINICAL:   { bg: "bg-amber-50",   text: "text-amber-600",  border: "border-amber-200",  label: "FD", full: "F. Dom." },
  ATESTADO:          { bg: "bg-yellow-100", text: "text-yellow-800", border: "border-yellow-200", label: "AT", full: "Atestado" },
  AFASTAMENTO_INSS:  { bg: "bg-purple-100", text: "text-purple-700", border: "border-purple-200", label: "AI", full: "INSS" },
  FALTA_JUSTIFICADA: { bg: "bg-red-100",    text: "text-red-700",    border: "border-red-200",    label: "FJ", full: "Falta Just." },
}

const TIPOS_EVENTO = [
  { value: "FERIAS",            label: "Férias" },
  { value: "FOLGA_FERIADO",     label: "Folga Feriado" },
  { value: "FOLGA_DOMINICAL",   label: "Folga Dominical" },
  { value: "ATESTADO",          label: "Atestado" },
  { value: "AFASTAMENTO_INSS",  label: "Afastamento INSS" },
  { value: "FALTA_JUSTIFICADA", label: "Falta Justificada" },
]

// ─── Helpers ───────────────────────────────────────────────────────────────

function navMes(mes: string, delta: number): string {
  const [y, m] = mes.split("-").map(Number)
  const d = new Date(Date.UTC(y, m - 1 + delta, 1))
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`
}

function labelMes(mes: string): string {
  return new Date(`${mes}-15T12:00:00Z`).toLocaleDateString("pt-BR", {
    month: "long",
    year:  "numeric",
    timeZone: "America/Sao_Paulo",
  })
}

// ─── Componente ────────────────────────────────────────────────────────────

interface Props {
  mesInicial: string
  turnos:     { id: number; codigo: string }[]
  areas:      { id: number; nome: string }[]
  role:       string
}

export function EscalaClient({ mesInicial, turnos, areas, role }: Props) {
  const podeEditar = role === "ADMIN" || role === "GESTOR"

  // ─── State de filtros ─────────────────────────────────────────────
  const [mes,          setMes]          = useState(mesInicial)
  const [turnoFiltro,  setTurnoFiltro]  = useState<number | null>(null)
  const [areaFiltro,   setAreaFiltro]   = useState<number | null>(null)
  const [busca,        setBusca]        = useState("")

  // ─── State de dados ───────────────────────────────────────────────
  const [dados,        setDados]        = useState<EscalaDados | null>(null)
  const [loading,      setLoading]      = useState(true)

  // ─── State de publicação ──────────────────────────────────────────
  const [publishing,   setPublishing]   = useState(false)
  const [pubErro,      setPubErro]      = useState("")

  // ─── State do modal ───────────────────────────────────────────────
  const [modal,        setModal]        = useState<ModalState | null>(null)
  const [evTipo,       setEvTipo]       = useState("FERIAS")
  const [evDataInicio, setEvDataInicio] = useState("")
  const [evDataFim,    setEvDataFim]    = useState("")
  const [evObs,        setEvObs]        = useState("")
  const [evSaving,     setEvSaving]     = useState(false)
  const [evErro,       setEvErro]       = useState("")

  // ─── Fetch ────────────────────────────────────────────────────────

  const fetchEscala = useCallback(async (m: string, t: number | null, a: number | null) => {
    setLoading(true)
    try {
      const qs = new URLSearchParams({ mes: m })
      if (t) qs.set("turnoId", String(t))
      if (a) qs.set("areaId",  String(a))
      const res  = await fetch(`/api/efetivo/escala?${qs}`)
      const json = await res.json()
      if (json.ok) setDados(json.data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchEscala(mes, turnoFiltro, areaFiltro)
  }, [mes, turnoFiltro, areaFiltro, fetchEscala])

  // ─── Busca client-side (nome / matrícula) ─────────────────────────

  const colaboradoresVisiveis = useMemo(() => {
    const todos = dados?.colaboradores ?? []
    if (!busca.trim()) return todos
    const q = busca.toLowerCase()
    return todos.filter(
      (c) => c.nome.toLowerCase().includes(q) || c.matricula.toLowerCase().includes(q)
    )
  }, [dados?.colaboradores, busca])

  // ─── Handlers modal ───────────────────────────────────────────────

  function abrirModal(colab: ColabEscala, dia: number) {
    const [y, m] = mes.split("-")
    const date   = `${y}-${m}-${String(dia).padStart(2, "0")}`
    setModal({ colaboradorId: colab.id, colaboradorNome: colab.nome, dia, date })
    setEvTipo("FERIAS")
    setEvDataInicio(date)
    setEvDataFim(date)
    setEvObs("")
    setEvErro("")
  }

  async function salvarEvento() {
    if (!modal) return
    setEvSaving(true)
    setEvErro("")
    try {
      const res  = await fetch("/api/efetivo/eventos", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          colaboradorId: modal.colaboradorId,
          tipo:          evTipo,
          dataInicio:    evDataInicio,
          dataFim:       evDataFim,
          observacao:    evObs || null,
        }),
      })
      const json = await res.json()
      if (!json.ok) { setEvErro(json.message ?? "Erro ao salvar."); return }
      setModal(null)
      fetchEscala(mes, turnoFiltro, areaFiltro)
    } catch {
      setEvErro("Erro de rede.")
    } finally {
      setEvSaving(false)
    }
  }

  async function removerEvento(id: number) {
    if (!confirm("Remover este evento? A célula voltará ao status calculado pelo padrão de escala.")) return
    const res = await fetch(`/api/efetivo/eventos/${id}`, { method: "DELETE" })
    if (res.ok) {
      setModal(null)
      fetchEscala(mes, turnoFiltro, areaFiltro)
    }
  }

  async function publicarEscala() {
    const acao = dados?.snapshot ? "Republicar" : "Publicar"
    if (!confirm(`${acao} escala de ${labelMes(mes)}?\nSerão processados todos os colaboradores ativos da empresa.`)) return
    setPublishing(true)
    setPubErro("")
    try {
      const res  = await fetch("/api/efetivo/escala/publicar", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ mes }),
      })
      const json = await res.json()
      if (json.ok && dados) {
        setDados({ ...dados, snapshot: { mes, publicadoEm: json.data.publicadoEm } })
      } else if (!json.ok) {
        setPubErro(json.message ?? "Erro ao publicar.")
      }
    } catch {
      setPubErro("Erro de rede.")
    } finally {
      setPublishing(false)
    }
  }

  // ─── Eventos do modal ─────────────────────────────────────────────

  const eventosDoModal = modal
    ? (dados?.eventos ?? []).filter(
        (ev) => ev.colaboradorId === modal.colaboradorId
          && ev.dataInicio <= modal.date
          && ev.dataFim    >= modal.date
      )
    : []

  // ─── Render ───────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full min-h-0">

      {/* ── Cabeçalho ─────────────────────────────────────────────── */}
      <div className="flex-shrink-0 px-6 py-3 border-b border-gray-200 bg-white flex items-center gap-3 flex-wrap">
        <CalendarDays size={20} className="text-primary flex-shrink-0" />
        <h1 className="text-base font-semibold text-gray-900">Escala de Trabalho</h1>

        <div className="ml-auto flex items-center gap-3 flex-wrap">
          {dados?.snapshot && (
            <span className="flex items-center gap-1 text-xs text-green-700 bg-green-50 border border-green-200 px-2.5 py-1 rounded-full">
              <CheckCircle2 size={12} />
              Publicada em {formatarData(dados.snapshot.publicadoEm)}
            </span>
          )}
          {pubErro && <span className="text-xs text-red-600">{pubErro}</span>}
          {podeEditar && (
            <button
              onClick={publicarEscala}
              disabled={publishing}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-primary text-white rounded-soft hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {publishing && <Loader2 size={12} className="animate-spin" />}
              {dados?.snapshot ? "Republicar Escala" : "Publicar Escala"}
            </button>
          )}
        </div>
      </div>

      {/* ── Filtros ───────────────────────────────────────────────── */}
      <div className="flex-shrink-0 px-6 py-2.5 border-b border-gray-100 bg-white space-y-2">
        {/* Linha 1: mês + turno */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Navegação mês */}
          <div className="flex items-center gap-1">
            <button onClick={() => setMes(navMes(mes, -1))} className="p-1 rounded hover:bg-gray-100 text-gray-500 transition-colors">
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm font-medium text-gray-800 w-40 text-center capitalize select-none">
              {labelMes(mes)}
            </span>
            <button onClick={() => setMes(navMes(mes, 1))} className="p-1 rounded hover:bg-gray-100 text-gray-500 transition-colors">
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="w-px h-4 bg-gray-200" />

          {/* Filtro turno */}
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-xs text-gray-400 mr-1">Turno:</span>
            <button
              onClick={() => setTurnoFiltro(null)}
              className={`px-2.5 py-0.5 text-xs rounded-full border transition-colors ${
                turnoFiltro === null
                  ? "bg-primary text-white border-primary"
                  : "text-gray-600 border-gray-300 hover:border-gray-500"
              }`}
            >
              Todos
            </button>
            {turnos.map((t) => (
              <button
                key={t.id}
                onClick={() => setTurnoFiltro(t.id)}
                className={`px-2.5 py-0.5 text-xs rounded-full border transition-colors ${
                  turnoFiltro === t.id
                    ? "bg-primary text-white border-primary"
                    : "text-gray-600 border-gray-300 hover:border-gray-500"
                }`}
              >
                {t.codigo}
              </button>
            ))}
          </div>
        </div>

        {/* Linha 2: área + busca colaborador + legenda */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Filtro área */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-400">Área:</span>
            <select
              value={areaFiltro ?? ""}
              onChange={(e) => setAreaFiltro(e.target.value ? parseInt(e.target.value) : null)}
              className="text-xs text-gray-800 bg-white border border-gray-300 rounded-soft px-2 py-1 min-w-[180px]"
            >
              <option value="">Todas as áreas</option>
              {areas.map((a) => (
                <option key={a.id} value={a.id}>{a.nome}</option>
              ))}
            </select>
          </div>

          {/* Busca colaborador */}
          <div className="relative flex items-center">
            <Search size={13} className="absolute left-2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar colaborador…"
              className="text-xs text-gray-800 bg-white border border-gray-300 rounded-soft pl-6 pr-2 py-1 w-48"
            />
            {busca && (
              <button
                onClick={() => setBusca("")}
                className="absolute right-1.5 text-gray-400 hover:text-gray-600"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {busca && (
            <span className="text-xs text-gray-400">
              {colaboradoresVisiveis.length} de {dados?.colaboradores.length ?? 0}
            </span>
          )}

          {/* Legenda */}
          <div className="ml-auto flex gap-1.5 flex-wrap">
            {Object.entries(STATUS_CFG).map(([k, v]) => (
              <span
                key={k}
                title={v.full}
                className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${v.bg} ${v.text} ${v.border}`}
              >
                {v.label} {v.full}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Matriz ────────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 size={24} className="animate-spin text-primary" />
        </div>
      ) : colaboradoresVisiveis.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-sm text-gray-400">
          {busca
            ? `Nenhum colaborador encontrado para "${busca}".`
            : "Nenhum colaborador ativo com estes filtros."}
        </div>
      ) : (
        <div className="flex-1 overflow-auto">
          <table className="border-collapse text-xs">
            <thead>
              <tr>
                <th className="sticky left-0 z-20 bg-white border-b-2 border-r border-gray-200 px-3 py-2 text-left font-medium text-gray-500 min-w-[230px] whitespace-nowrap">
                  Colaborador
                </th>
                {(dados?.dias ?? []).map((d, i) => {
                  const sem = dados!.diasSemana[i]
                  const fim = sem === "dom" || sem === "sab"
                  return (
                    <th
                      key={d}
                      className={`w-9 border-b-2 border-gray-200 pt-1 pb-0.5 text-center font-medium ${
                        fim ? "bg-gray-50 text-gray-400" : "text-gray-600"
                      }`}
                    >
                      <div className="text-[11px]">{d}</div>
                      <div className="text-[9px] uppercase tracking-wide">{sem}</div>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {colaboradoresVisiveis.map((c, ri) => {
                const rowBg = ri % 2 === 0 ? "bg-white" : "bg-gray-50/60"
                return (
                  <tr key={c.id} className={rowBg}>
                    <td className={`sticky left-0 z-10 ${rowBg} border-r border-gray-200 px-3 py-1.5 whitespace-nowrap`}>
                      <div className="font-medium text-gray-800 truncate max-w-[200px]">{c.nome}</div>
                      <div className="text-[10px] text-gray-400 truncate max-w-[200px]">
                        {c.matricula} · {c.turno.codigo} · {c.area.nome}
                      </div>
                    </td>
                    {(dados?.dias ?? []).map((d, i) => {
                      const status = c.escala[d] ?? "FOLGA"
                      const cfg    = STATUS_CFG[status] ?? STATUS_CFG.FOLGA
                      const fim    = dados!.diasSemana[i] === "dom" || dados!.diasSemana[i] === "sab"
                      return (
                        <td
                          key={d}
                          onClick={() => podeEditar && abrirModal(c, d)}
                          title={cfg.full}
                          className={[
                            "w-9 h-8 text-center text-[11px] font-semibold border-b border-gray-100",
                            cfg.bg,
                            cfg.text,
                            fim ? "opacity-80" : "",
                            podeEditar ? "cursor-pointer hover:brightness-95 transition-all" : "",
                          ].join(" ")}
                        >
                          {cfg.label}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Modal evento ──────────────────────────────────────────── */}
      {modal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setModal(null)}
        >
          <div
            className="bg-white rounded-soft shadow-xl w-full max-w-sm p-5"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabeçalho modal */}
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="font-semibold text-gray-900 text-sm leading-tight">{modal.colaboradorNome}</h2>
                <p className="text-xs text-gray-500 mt-0.5">{formatarData(modal.date)}</p>
              </div>
              <button onClick={() => setModal(null)} className="p-1 rounded hover:bg-gray-100 text-gray-400 transition-colors">
                <X size={16} />
              </button>
            </div>

            {/* Eventos existentes */}
            {eventosDoModal.length > 0 && (
              <div className="mb-4 space-y-1.5">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Eventos nesta data
                </p>
                {eventosDoModal.map((ev) => {
                  const cfg = STATUS_CFG[ev.tipo]
                  return (
                    <div
                      key={ev.id}
                      className={`flex items-center gap-2 px-2.5 py-1.5 rounded border ${cfg?.bg ?? "bg-gray-100"} ${cfg?.border ?? "border-gray-200"}`}
                    >
                      <div className="flex-1 min-w-0">
                        <span className={`text-xs font-medium ${cfg?.text ?? "text-gray-700"}`}>
                          {cfg?.full ?? ev.tipo}
                        </span>
                        <span className="text-[10px] text-gray-500 ml-1.5">
                          {formatarData(ev.dataInicio)}
                          {ev.dataInicio !== ev.dataFim && ` → ${formatarData(ev.dataFim)}`}
                        </span>
                        {ev.observacao && (
                          <p className="text-[10px] text-gray-400 truncate mt-0.5">{ev.observacao}</p>
                        )}
                      </div>
                      {podeEditar && (
                        <button
                          onClick={() => removerEvento(ev.id)}
                          title="Remover evento (volta ao padrão calculado)"
                          className="flex-shrink-0 text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <X size={13} />
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* Formulário novo evento */}
            {podeEditar && (
              <div className={eventosDoModal.length > 0 ? "border-t pt-4" : ""}>
                {eventosDoModal.length > 0 && (
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
                    Adicionar evento
                  </p>
                )}
                <div className="space-y-2.5">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Tipo</label>
                    <select
                      value={evTipo}
                      onChange={(e) => setEvTipo(e.target.value)}
                      className="w-full text-xs text-gray-800 bg-white border border-gray-300 rounded-soft px-2 py-1.5"
                    >
                      {TIPOS_EVENTO.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Início</label>
                      <input
                        type="date"
                        value={evDataInicio}
                        onChange={(e) => setEvDataInicio(e.target.value)}
                        className="w-full text-xs text-gray-800 bg-white border border-gray-300 rounded-soft px-2 py-1.5"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Fim</label>
                      <input
                        type="date"
                        value={evDataFim}
                        onChange={(e) => setEvDataFim(e.target.value)}
                        className="w-full text-xs text-gray-800 bg-white border border-gray-300 rounded-soft px-2 py-1.5"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Observação (opcional)</label>
                    <input
                      type="text"
                      value={evObs}
                      onChange={(e) => setEvObs(e.target.value)}
                      placeholder="Ex.: CID A00, protocolo INSS…"
                      className="w-full text-xs text-gray-800 bg-white border border-gray-300 rounded-soft px-2 py-1.5"
                    />
                  </div>

                  {evErro && <p className="text-xs text-red-600">{evErro}</p>}

                  <button
                    onClick={salvarEvento}
                    disabled={evSaving || !evDataInicio || !evDataFim}
                    className="w-full py-2 text-xs font-medium bg-primary text-white rounded-soft hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
                  >
                    {evSaving ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                    Salvar Evento
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
