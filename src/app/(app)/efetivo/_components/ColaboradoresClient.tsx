"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Search, ChevronRight, Plus, X, Loader2 } from "lucide-react"

interface Colaborador {
  id:        number
  matricula: string
  nome:      string
  status:    "ATIVO" | "DESLIGADO"
  cargo:     { nome: string } | null
  area:      { nome: string } | null
  turno:     { codigo: string; horaInicio: string; horaFim: string } | null
}

interface Props {
  colaboradores: Colaborador[]
  areas:   { id: number; nome: string }[]
  turnos:  { id: number; codigo: string }[]
  cargos:  { id: number; nome: string }[]
  padroes: { id: number; nome: string; modo: string }[]
  role:    string
}

const STATUS_LABEL: Record<string, string> = { ATIVO: "Ativo", DESLIGADO: "Desligado" }
const STATUS_CLS:   Record<string, string> = {
  ATIVO:     "bg-green-50 text-green-700",
  DESLIGADO: "bg-gray-100 text-gray-500",
}

export function ColaboradoresClient({ colaboradores: inicial, areas, turnos, cargos, padroes, role }: Props) {
  const router    = useRouter()
  const podeEditar = role === "ADMIN" || role === "GESTOR"

  const [lista,   setLista]   = useState(inicial)
  const [q,       setQ]       = useState("")
  const [status,  setStatus]  = useState("")
  const [areaId,  setAreaId]  = useState("")
  const [turnoId, setTurnoId] = useState("")

  // ─── Modal novo colaborador ───────────────────────────────────────────────
  const [modal,     setModal]     = useState(false)
  const [saving,    setSaving]    = useState(false)
  const [erro,      setErro]      = useState<string | null>(null)
  const [fMatricula,setFMatricula]= useState("")
  const [fNome,     setFNome]     = useState("")
  const [fCargo,    setFCargo]    = useState(String(cargos[0]?.id ?? ""))
  const [fArea,     setFArea]     = useState(String(areas[0]?.id ?? ""))
  const [fTurno,    setFTurno]    = useState(String(turnos[0]?.id ?? ""))
  const [fPadrao,   setFPadrao]   = useState(String(padroes[0]?.id ?? ""))
  const [fAdmissao, setFAdmissao] = useState("")
  const [fAncora,   setFAncora]   = useState("")

  const padraoSelecionado = padroes.find((p) => String(p.id) === fPadrao)
  const precisaAncora     = padraoSelecionado?.modo === "ROTATIVO"

  function abrirModal() {
    setFMatricula(""); setFNome("")
    setFCargo(String(cargos[0]?.id ?? ""))
    setFArea(String(areas[0]?.id ?? ""))
    setFTurno(String(turnos[0]?.id ?? ""))
    setFPadrao(String(padroes[0]?.id ?? ""))
    setFAdmissao(""); setFAncora(""); setErro(null)
    setModal(true)
  }

  async function salvarNovo() {
    if (!fMatricula.trim() || !fNome.trim() || !fAdmissao) {
      setErro("Preencha matrícula, nome e data de admissão."); return
    }
    if (precisaAncora && !fAncora) {
      setErro("Data âncora é obrigatória para padrão rotativo."); return
    }
    setSaving(true); setErro(null)
    try {
      const res  = await fetch("/api/efetivo/colaboradores", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          matricula:      fMatricula.trim(),
          nome:           fNome.trim(),
          cargoId:        parseInt(fCargo),
          areaId:         parseInt(fArea),
          padraoEscalaId: parseInt(fPadrao),
          turnoId:        parseInt(fTurno),
          dataAdmissao:   fAdmissao,
          dataAncora:     fAncora || null,
        }),
      })
      const json = await res.json()
      if (!json.ok) { setErro(json.message ?? "Erro ao salvar."); return }
      setModal(false)
      router.push(`/efetivo/colaboradores/${json.data.matricula}`)
    } catch {
      setErro("Erro de rede.")
    } finally {
      setSaving(false)
    }
  }

  // A filtragem de área e turno compara o nome (colaborador traz cargo/area/turno como objetos)
  const filtradosV2 = useMemo(() => {
    const qLower    = q.toLowerCase()
    const areaNome  = areas.find((a)  => String(a.id)  === areaId)?.nome
    const turnoCode = turnos.find((t) => String(t.id) === turnoId)?.codigo
    return lista.filter((c) => {
      if (q && !c.nome.toLowerCase().includes(qLower) && !c.matricula.toLowerCase().includes(qLower)) return false
      if (status    && c.status              !== status)    return false
      if (areaNome  && c.area?.nome          !== areaNome)  return false
      if (turnoCode && c.turno?.codigo       !== turnoCode) return false
      return true
    })
  }, [lista, q, status, areaId, turnoId, areas, turnos])

  return (
    <div className="space-y-4">

      {/* Barra topo: filtros + botão novo */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text" value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="Nome ou matrícula..."
            className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 rounded text-gray-800 bg-white"
          />
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-300 rounded text-gray-800 bg-white">
          <option value="">Todos os status</option>
          <option value="ATIVO">Ativo</option>
          <option value="DESLIGADO">Desligado</option>
        </select>
        <select value={areaId} onChange={(e) => setAreaId(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-300 rounded text-gray-800 bg-white">
          <option value="">Todas as áreas</option>
          {areas.map((a) => <option key={a.id} value={String(a.id)}>{a.nome}</option>)}
        </select>
        <select value={turnoId} onChange={(e) => setTurnoId(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-300 rounded text-gray-800 bg-white">
          <option value="">Todos os turnos</option>
          {turnos.map((t) => <option key={t.id} value={String(t.id)}>Turno {t.codigo}</option>)}
        </select>

        {podeEditar && (
          <button
            onClick={abrirModal}
            className="ml-auto flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-primary text-white rounded hover:bg-primary/90 transition-colors"
          >
            <Plus size={15} />
            Novo colaborador
          </button>
        )}
      </div>

      {/* Contagem */}
      <p className="text-xs text-gray-500">
        {filtradosV2.length} de {lista.length} colaboradores
      </p>

      {/* Tabela */}
      {filtradosV2.length === 0 ? (
        <p className="text-sm text-gray-400 py-12 text-center">Nenhum colaborador encontrado.</p>
      ) : (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Matrícula</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Nome</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide hidden md:table-cell">Cargo</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide hidden lg:table-cell">Área</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide hidden sm:table-cell">Turno</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {filtradosV2.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/efetivo/colaboradores/${c.matricula}`}
                      className="font-mono text-xs text-gray-600 hover:text-primary">
                      {c.matricula}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/efetivo/colaboradores/${c.matricula}`}
                      className="font-medium text-gray-900 hover:text-primary">
                      {c.nome}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-600 hidden md:table-cell">
                    {c.cargo?.nome ?? <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-600 hidden lg:table-cell">
                    {c.area?.nome ?? <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    {c.turno ? (
                      <span className="font-mono text-xs bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded">
                        {c.turno.codigo} · {c.turno.horaInicio}–{c.turno.horaFim}
                      </span>
                    ) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_CLS[c.status]}`}>
                      {STATUS_LABEL[c.status]}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <Link href={`/efetivo/colaboradores/${c.matricula}`}
                      className="text-gray-400 hover:text-primary">
                      <ChevronRight size={16} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Modal novo colaborador ──────────────────────────────────── */}
      {modal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setModal(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-gray-900">Novo colaborador</h2>
              <button onClick={() => setModal(false)} className="p-1 rounded hover:bg-gray-100 text-gray-400">
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Matrícula <span className="text-red-500">*</span></label>
                <input
                  type="text" value={fMatricula} onChange={(e) => setFMatricula(e.target.value)}
                  placeholder="Ex.: 123456"
                  className="w-full text-sm text-gray-800 bg-white border border-gray-300 rounded px-3 py-2"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-xs text-gray-500 mb-1">Nome completo <span className="text-red-500">*</span></label>
                <input
                  type="text" value={fNome} onChange={(e) => setFNome(e.target.value)}
                  placeholder="Nome do colaborador"
                  className="w-full text-sm text-gray-800 bg-white border border-gray-300 rounded px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">Cargo <span className="text-red-500">*</span></label>
                <select value={fCargo} onChange={(e) => setFCargo(e.target.value)}
                  className="w-full text-sm text-gray-800 bg-white border border-gray-300 rounded px-3 py-2">
                  {cargos.map((c) => <option key={c.id} value={String(c.id)}>{c.nome}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">Área <span className="text-red-500">*</span></label>
                <select value={fArea} onChange={(e) => setFArea(e.target.value)}
                  className="w-full text-sm text-gray-800 bg-white border border-gray-300 rounded px-3 py-2">
                  {areas.map((a) => <option key={a.id} value={String(a.id)}>{a.nome}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">Turno <span className="text-red-500">*</span></label>
                <select value={fTurno} onChange={(e) => setFTurno(e.target.value)}
                  className="w-full text-sm text-gray-800 bg-white border border-gray-300 rounded px-3 py-2">
                  {turnos.map((t) => <option key={t.id} value={String(t.id)}>Turno {t.codigo}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">Padrão de escala <span className="text-red-500">*</span></label>
                <select value={fPadrao} onChange={(e) => setFPadrao(e.target.value)}
                  className="w-full text-sm text-gray-800 bg-white border border-gray-300 rounded px-3 py-2">
                  {padroes.map((p) => <option key={p.id} value={String(p.id)}>{p.nome}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">Data de admissão <span className="text-red-500">*</span></label>
                <input
                  type="date" value={fAdmissao} onChange={(e) => setFAdmissao(e.target.value)}
                  className="w-full text-sm text-gray-800 bg-white border border-gray-300 rounded px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  Data âncora {precisaAncora && <span className="text-red-500">*</span>}
                  {!precisaAncora && <span className="text-gray-400">(não se aplica)</span>}
                </label>
                <input
                  type="date" value={fAncora} onChange={(e) => setFAncora(e.target.value)}
                  disabled={!precisaAncora}
                  title={precisaAncora ? "Primeiro dia de trabalho do ciclo rotativo" : "Apenas para padrões rotativos"}
                  className="w-full text-sm text-gray-800 bg-white border border-gray-300 rounded px-3 py-2 disabled:opacity-40 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            {erro && <p className="mt-3 text-xs text-red-600">{erro}</p>}

            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setModal(false)}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={salvarNovo}
                disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-primary text-white rounded hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                Cadastrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
