"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import {
  ClipboardList, RefreshCw, Loader2,
  ChevronLeft, ChevronRight, Plus, X, Search, Clock,
} from "lucide-react"
import { formatarData } from "@/lib/date"
import {
  STATUS_CFG, STATUS_GRUPO, HORA_AJUSTE_LABEL, TIPOS_EVENTO_CHAMADA,
} from "@/lib/efetivo-status"

// ─── Tipos ─────────────────────────────────────────────────────────────────

interface EventoChamada {
  id:            number
  tipo:          string
  dataInicio:    string
  dataFim:       string
  horaAjuste:    string | null
  observacao:    string | null
  criadoPorNome: string
}

interface ColabChamada {
  id:        number
  matricula: string
  nome:      string
  turno:     { id: number; codigo: string }
  area:      { id: number; nome: string }
  status:    string
  evento:    EventoChamada | null
}

interface Props {
  turnos:       { id: number; codigo: string }[]
  areas:        { id: number; nome: string }[]
  role:         string
  dataInicial:  string
}

function hojeISO() {
  const brtDate = new Date(Date.now() - 3 * 60 * 60 * 1000)
  return brtDate.toISOString().slice(0, 10)
}

// Agrupa TIPOS_EVENTO_CHAMADA por grupo para os optgroups do select
const TIPOS_POR_GRUPO = TIPOS_EVENTO_CHAMADA.reduce((acc, t) => {
  if (!acc[t.grupo]) acc[t.grupo] = []
  acc[t.grupo].push(t)
  return acc
}, {} as Record<string, typeof TIPOS_EVENTO_CHAMADA>)

// ─── Componente ────────────────────────────────────────────────────────────

export function ChamadaClient({ turnos, areas, role, dataInicial }: Props) {
  const podeEditar = role === "ADMIN" || role === "GESTOR" || role === "EXECUTOR"

  const [data,         setData]         = useState(dataInicial)
  const [colabs,       setColabs]       = useState<ColabChamada[]>([])
  const [loading,      setLoading]      = useState(true)
  const [atualizadoEm, setAtualizadoEm] = useState("")

  // Filtros
  const [turnoFiltro, setTurnoFiltro] = useState<number | null>(null)
  const [areaFiltro,  setAreaFiltro]  = useState<number | null>(null)
  const [busca,       setBusca]       = useState("")
  const [aba,         setAba]         = useState<"todos" | "trabalha" | "ausencia" | "folga">("todos")

  // Modal
  const [modalColab,   setModalColab]   = useState<ColabChamada | null>(null)
  const [evTipo,       setEvTipo]       = useState("FALTA_INJUSTIFICADA")
  const [evDataInicio, setEvDataInicio] = useState("")
  const [evDataFim,    setEvDataFim]    = useState("")
  const [evHora,       setEvHora]       = useState("")
  const [evObs,        setEvObs]        = useState("")
  const [evSaving,     setEvSaving]     = useState(false)
  const [evErro,       setEvErro]       = useState("")

  // ─── Fetch ──────────────────────────────────────────────────────

  const fetchChamada = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ data })
      if (turnoFiltro) params.set("turnoId", String(turnoFiltro))
      if (areaFiltro)  params.set("areaId",  String(areaFiltro))
      const res  = await fetch(`/api/efetivo/chamada?${params}`)
      const json = await res.json()
      if (json.ok) {
        setColabs(json.data.colaboradores)
        setAtualizadoEm(
          new Date().toLocaleTimeString("pt-BR", {
            timeZone: "America/Sao_Paulo",
            hour: "2-digit",
            minute: "2-digit",
          })
        )
      }
    } finally {
      setLoading(false)
    }
  }, [data, turnoFiltro, areaFiltro])

  useEffect(() => { fetchChamada() }, [fetchChamada])

  // ─── Navegação de data ──────────────────────────────────────────

  function navegarData(dias: number) {
    const [y, m, d] = data.split("-").map(Number)
    const dt = new Date(Date.UTC(y, m - 1, d + dias))
    setData(dt.toISOString().slice(0, 10))
  }

  const dataFormatada = new Date(data + "T12:00:00").toLocaleDateString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    weekday: "short",
    day:     "2-digit",
    month:   "2-digit",
    year:    "numeric",
  })

  // ─── Contagens para abas ────────────────────────────────────────

  const conts = useMemo(() => ({
    todos:    colabs.length,
    trabalha: colabs.filter((c) => STATUS_GRUPO[c.status] === "trabalha").length,
    ausencia: colabs.filter((c) => STATUS_GRUPO[c.status] === "ausencia").length,
    folga:    colabs.filter((c) => STATUS_GRUPO[c.status] === "folga").length,
  }), [colabs])

  // ─── Lista filtrada ─────────────────────────────────────────────

  const listaFiltrada = useMemo(() => {
    let lista = colabs
    if (aba === "trabalha")  lista = lista.filter((c) => STATUS_GRUPO[c.status] === "trabalha")
    if (aba === "ausencia")  lista = lista.filter((c) => STATUS_GRUPO[c.status] === "ausencia")
    if (aba === "folga")     lista = lista.filter((c) => STATUS_GRUPO[c.status] === "folga")
    if (busca.trim()) {
      const q = busca.toLowerCase()
      lista = lista.filter((c) => c.nome.toLowerCase().includes(q) || c.matricula.toLowerCase().includes(q))
    }
    return lista
  }, [colabs, aba, busca])

  // ─── Modal ──────────────────────────────────────────────────────

  function abrirModal(colab: ColabChamada) {
    setModalColab(colab)
    setEvTipo(STATUS_GRUPO[colab.status] === "folga" ? "TROCA_TURNO_ENTRADA" : "FALTA_INJUSTIFICADA")
    setEvDataInicio(data)
    setEvDataFim(data)
    setEvHora("")
    setEvObs("")
    setEvErro("")
  }

  async function registrar() {
    if (!modalColab) return
    setEvSaving(true)
    setEvErro("")
    try {
      const body: Record<string, unknown> = {
        colaboradorId: modalColab.id,
        tipo:          evTipo,
        dataInicio:    evDataInicio,
        dataFim:       evDataFim,
        horaAjuste:    (evHora && HORA_AJUSTE_LABEL[evTipo]) ? evHora : null,
        observacao:    evObs || null,
      }
      const res  = await fetch("/api/efetivo/eventos", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(body),
      })
      const json = await res.json()
      if (!json.ok) { setEvErro(json.message ?? "Erro ao salvar."); return }
      setModalColab(null)
      fetchChamada()
    } catch {
      setEvErro("Erro de rede.")
    } finally {
      setEvSaving(false)
    }
  }

  async function remover(id: number) {
    if (!confirm("Remover este registro? O colaborador voltará ao status calculado pela escala.")) return
    const res = await fetch(`/api/efetivo/eventos/${id}`, { method: "DELETE" })
    if (res.ok) fetchChamada()
  }

  // ─── Render ─────────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-4 max-w-screen-xl">

      {/* ── Cabeçalho ──────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <ClipboardList size={22} className="text-primary" />
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Chamada de Presença</h1>
          {atualizadoEm && (
            <p className="text-xs text-gray-400 mt-0.5">Atualizado às {atualizadoEm}</p>
          )}
        </div>
        <button
          onClick={fetchChamada}
          disabled={loading}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-600 border border-gray-300 rounded-soft hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          Atualizar
        </button>
      </div>

      {/* ── Navegação de data + filtros ─────────────────────────── */}
      <div className="flex flex-wrap gap-3 items-center">

        {/* Navegação de data */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => navegarData(-1)}
            className="p-1.5 rounded border border-gray-200 hover:bg-gray-50 transition-colors text-gray-600"
          >
            <ChevronLeft size={15} />
          </button>
          <span className="px-3 py-1.5 text-sm font-medium text-gray-800 border border-gray-200 rounded min-w-[190px] text-center capitalize">
            {dataFormatada}
          </span>
          <button
            onClick={() => navegarData(1)}
            className="p-1.5 rounded border border-gray-200 hover:bg-gray-50 transition-colors text-gray-600"
          >
            <ChevronRight size={15} />
          </button>
          <button
            onClick={() => setData(hojeISO())}
            className="ml-1 px-2 py-1 text-xs text-gray-500 border border-gray-200 rounded hover:bg-gray-50 transition-colors"
          >
            Hoje
          </button>
        </div>

        {/* Filtro turno */}
        <div className="flex gap-1 flex-wrap">
          <button
            onClick={() => setTurnoFiltro(null)}
            className={`px-2 py-0.5 text-xs rounded-full border transition-colors ${
              turnoFiltro === null
                ? "bg-primary text-white border-primary"
                : "text-gray-600 border-gray-300 hover:border-gray-500"
            }`}
          >
            Todos os turnos
          </button>
          {turnos.map((t) => (
            <button
              key={t.id}
              onClick={() => setTurnoFiltro(t.id)}
              className={`px-2 py-0.5 text-xs rounded-full border transition-colors ${
                turnoFiltro === t.id
                  ? "bg-primary text-white border-primary"
                  : "text-gray-600 border-gray-300 hover:border-gray-500"
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
          {areas.map((a) => (
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
            <button
              onClick={() => setBusca("")}
              className="absolute right-1.5 text-gray-400 hover:text-gray-600"
            >
              <X size={11} />
            </button>
          )}
        </div>
      </div>

      {/* ── Abas de status ─────────────────────────────────────── */}
      <div className="flex gap-0 border-b border-gray-200">
        {([
          ["todos",    "Todos",       conts.todos],
          ["trabalha", "Trabalhando", conts.trabalha],
          ["ausencia", "Ausências",   conts.ausencia],
          ["folga",    "Folgas",      conts.folga],
        ] as const).map(([key, label, count]) => (
          <button
            key={key}
            onClick={() => setAba(key)}
            className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors -mb-px ${
              aba === key
                ? "border-primary text-primary"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {label}
            <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] ${
              aba === key ? "bg-primary/10 text-primary" : "bg-gray-100 text-gray-500"
            }`}>
              {count}
            </span>
          </button>
        ))}
      </div>

      {/* ── Tabela ─────────────────────────────────────────────── */}
      {loading && colabs.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={28} className="animate-spin text-primary" />
        </div>
      ) : (
        <div className="border border-gray-200 rounded-soft overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-3 py-2 text-left font-medium text-gray-500 w-[35%]">Colaborador</th>
                <th className="px-2 py-2 text-left font-medium text-gray-500 w-12">Turno</th>
                <th className="px-2 py-2 text-left font-medium text-gray-500">Área</th>
                <th className="px-2 py-2 text-left font-medium text-gray-500 w-44">Status</th>
                {podeEditar && <th className="px-2 py-2 w-36" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {listaFiltrada.length === 0 ? (
                <tr>
                  <td
                    colSpan={podeEditar ? 5 : 4}
                    className="px-3 py-8 text-center text-gray-400"
                  >
                    Nenhum colaborador neste filtro.
                  </td>
                </tr>
              ) : listaFiltrada.map((c) => {
                const cfg = STATUS_CFG[c.status] ?? STATUS_CFG.FOLGA
                return (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-3 py-2">
                      <div className="font-medium text-gray-800">{c.nome}</div>
                      <div className="text-[10px] text-gray-400">{c.matricula}</div>
                    </td>
                    <td className="px-2 py-2 font-medium text-gray-700">{c.turno.codigo}</td>
                    <td className="px-2 py-2 text-gray-500 truncate max-w-[160px]">{c.area.nome}</td>
                    <td className="px-2 py-2">
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded border text-[10px] font-medium ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                        {cfg.full}
                      </span>
                      {c.evento?.horaAjuste && (
                        <div className="flex items-center gap-0.5 text-[10px] text-gray-500 mt-0.5">
                          <Clock size={9} />
                          {HORA_AJUSTE_LABEL[c.evento.tipo] ?? "Hora"}: {c.evento.horaAjuste}
                        </div>
                      )}
                      {c.evento?.observacao && (
                        <div className="text-[10px] text-gray-400 mt-0.5 truncate max-w-[150px]">
                          {c.evento.observacao}
                        </div>
                      )}
                      {c.evento && !c.evento.horaAjuste && c.evento.dataInicio !== c.evento.dataFim && (
                        <div className="text-[10px] text-gray-400 mt-0.5">
                          até {formatarData(c.evento.dataFim)}
                        </div>
                      )}
                      {c.evento && (
                        <div className="text-[10px] text-gray-300 mt-0.5">
                          por {c.evento.criadoPorNome}
                        </div>
                      )}
                    </td>
                    {podeEditar && (
                      <td className="px-2 py-2 text-right">
                        {c.evento ? (
                          <button
                            onClick={() => remover(c.evento!.id)}
                            className="flex items-center gap-1 px-2 py-1 text-[11px] text-red-500 border border-red-200 rounded hover:bg-red-50 transition-colors ml-auto"
                          >
                            <X size={11} />
                            Remover
                          </button>
                        ) : (
                          <button
                            onClick={() => abrirModal(c)}
                            className="flex items-center gap-1 px-2 py-1 text-[11px] text-gray-600 border border-gray-300 rounded hover:bg-gray-100 transition-colors ml-auto"
                          >
                            <Plus size={11} />
                            Registrar
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Modal registrar ────────────────────────────────────── */}
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
              <button
                onClick={() => setModalColab(null)}
                className="p-1 rounded hover:bg-gray-100 text-gray-400"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Tipo de registro</label>
                <select
                  value={evTipo}
                  onChange={(e) => { setEvTipo(e.target.value); setEvHora("") }}
                  className="w-full text-xs text-gray-800 bg-white border border-gray-300 rounded-soft px-2 py-1.5"
                >
                  {Object.entries(TIPOS_POR_GRUPO).map(([grupo, tipos]) => (
                    <optgroup key={grupo} label={grupo}>
                      {tipos.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </optgroup>
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

              {HORA_AJUSTE_LABEL[evTipo] && (
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    {HORA_AJUSTE_LABEL[evTipo]}
                  </label>
                  <input
                    type="time"
                    value={evHora}
                    onChange={(e) => setEvHora(e.target.value)}
                    className="w-full text-xs text-gray-800 bg-white border border-gray-300 rounded-soft px-2 py-1.5"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs text-gray-500 mb-1">Observação (opcional)</label>
                <input
                  type="text"
                  value={evObs}
                  onChange={(e) => setEvObs(e.target.value)}
                  placeholder="Motivo, CID, protocolo…"
                  className="w-full text-xs text-gray-800 bg-white border border-gray-300 rounded-soft px-2 py-1.5"
                />
              </div>

              {evErro && <p className="text-xs text-red-600">{evErro}</p>}

              <button
                onClick={registrar}
                disabled={evSaving || !evDataInicio || !evDataFim}
                className="w-full py-2 text-xs font-medium bg-primary text-white rounded-soft hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
              >
                {evSaving
                  ? <Loader2 size={12} className="animate-spin" />
                  : <ClipboardList size={12} />
                }
                Registrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
