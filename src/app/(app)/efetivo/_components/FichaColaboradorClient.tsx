"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft, Pencil, Check, X, Loader2, Plus,
  UserCheck, UserX, LogIn, Paperclip, Trash2,
} from "lucide-react"
import Link from "next/link"
import { formatarData, formatarDataHora } from "@/lib/date"

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Cargo     { id: number; nome: string }
interface Area      { id: number; nome: string }
interface Turno     { id: number; codigo: string; horaInicio: string; horaFim: string }
interface Padrao    { id: number; nome: string; modo: "FIXO_SEMANAL" | "ROTATIVO" }
interface TipoOcorr { id: number; nome: string }

interface AreaFull extends Area {
  areaPaiId: number | null
  areaPai:   { id: number; nome: string } | null
}

interface TurnoFull extends Turno {
  cruzaMeiaNoite: boolean
}

interface PadraoFull extends Padrao {
  diasTrabalho: number | null
  diasFolga:    number | null
}

interface Movimentacao {
  id:          number
  tipo:        "ADMISSAO" | "DESLIGAMENTO" | "READMISSAO"
  data:        string
  motivo:      string | null
  createdAt:   string
  registrador: { name: string }
}

interface Ocorrencia {
  id:          number
  data:        string
  descricao:   string
  anexoUrl:    string | null
  createdAt:   string
  tipo:        { id: number; nome: string }
  registrador: { name: string }
}

interface AncoraHistoricoItem {
  id:            number
  dataAncora:    string
  dataVigencia:  string
  criadoEm:      string
  criadoPorNome: string
}

interface ColaboradorProps {
  id:              number
  matricula:       string
  nome:            string
  status:          "ATIVO" | "DESLIGADO"
  dataAdmissao:    string
  dataDesligamento:string | null
  dataAncora:      string | null
  cargo:           Cargo
  area:            AreaFull
  turno:           TurnoFull
  padraoEscala:    PadraoFull
  movimentacoes:   Movimentacao[]
  ocorrencias:     Ocorrencia[]
  ancoraHistorico: AncoraHistoricoItem[]
}

interface Props {
  colaborador:     ColaboradorProps
  cargos:          Cargo[]
  areas:           Area[]
  turnos:          Turno[]
  padroes:         Padrao[]
  tiposOcorrencia: TipoOcorr[]
  role:            string
}

// ─── Helpers visuais ──────────────────────────────────────────────────────────

const STATUS_CLS: Record<string, string> = {
  ATIVO:     "bg-green-50 text-green-700 border border-green-200",
  DESLIGADO: "bg-gray-100 text-gray-500 border border-gray-200",
}
const STATUS_LABEL: Record<string, string> = { ATIVO: "Ativo", DESLIGADO: "Desligado" }

const MOV_ICON: Record<string, React.ReactNode> = {
  ADMISSAO:    <LogIn  size={16} className="text-green-600" />,
  READMISSAO:  <LogIn  size={16} className="text-blue-600" />,
  DESLIGAMENTO:<UserX  size={16} className="text-red-500" />,
}
const MOV_LABEL: Record<string, string> = {
  ADMISSAO:    "Admissão",
  READMISSAO:  "Readmissão",
  DESLIGAMENTO:"Desligamento",
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function FichaColaboradorClient({
  colaborador: inicial, cargos, areas, turnos, padroes, tiposOcorrencia, role,
}: Props) {
  const router = useRouter()
  const [colab,           setColab]           = useState(inicial)
  const [ancoraHistorico, setAncoraHistorico] = useState<AncoraHistoricoItem[]>(inicial.ancoraHistorico)
  const isGestor = role === "ADMIN" || role === "GESTOR"

  return (
    <div className="space-y-8">
      {/* Navegação */}
      <Link href="/efetivo/colaboradores"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary transition-colors">
        <ArrowLeft size={14} /> Colaboradores
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-semibold text-gray-900" style={{ letterSpacing: "-0.02em" }}>
              {colab.nome}
            </h1>
            <span className="font-mono text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
              {colab.matricula}
            </span>
            <span className={`text-xs px-2 py-1 rounded-full ${STATUS_CLS[colab.status]}`}>
              {STATUS_LABEL[colab.status]}
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {colab.cargo.nome}
            {" · "}
            {colab.area.areaPai ? `${colab.area.areaPai.nome} / ` : ""}{colab.area.nome}
            {" · "}
            Turno {colab.turno.codigo} ({colab.turno.horaInicio}–{colab.turno.horaFim})
          </p>
        </div>
      </div>

      {/* Bloco 1 — Dados cadastrais */}
      <BlocoDadosCadastrais
        colab={colab}
        cargos={cargos}
        areas={areas}
        turnos={turnos}
        padroes={padroes}
        tiposOcorrencia={tiposOcorrencia}
        isGestor={isGestor}
        onUpdate={(updated) => setColab((prev) => ({ ...prev, ...updated }))}
        onOcorrenciaAdded={(oc) => setColab((prev) => ({ ...prev, ocorrencias: [oc, ...prev.ocorrencias] }))}
      />

      {/* Bloco âncora — só para padrão ROTATIVO */}
      {colab.padraoEscala.modo === "ROTATIVO" && (
        <BlocoAncoraHistorico
          matricula={colab.matricula}
          dataAncoraBase={colab.dataAncora}
          historico={ancoraHistorico}
          isGestor={isGestor}
          onAdded={(item) => setAncoraHistorico((prev) => [item, ...prev])}
        />
      )}

      {/* Bloco 2 — Vínculo */}
      <BlocoVinculo
        colab={colab}
        isGestor={isGestor}
        onMovimentacao={(mov, novoStatus) =>
          setColab((prev) => ({
            ...prev,
            status:          novoStatus,
            dataDesligamento:novoStatus === "DESLIGADO" ? mov.data : null,
            movimentacoes:   [mov, ...prev.movimentacoes],
          }))
        }
      />

      {/* Bloco 3 — Ocorrências */}
      <BlocoOcorrencias
        colab={colab}
        tiposOcorrencia={tiposOcorrencia}
        isGestor={isGestor}
        onAdded={(oc)  => setColab((prev) => ({ ...prev, ocorrencias: [oc, ...prev.ocorrencias] }))}
        onDeleted={(id) => setColab((prev) => ({
          ...prev,
          ocorrencias: prev.ocorrencias.filter((o) => o.id !== id),
        }))}
      />
    </div>
  )
}

// ─── Bloco 1 — Dados Cadastrais ───────────────────────────────────────────────

function BlocoDadosCadastrais({
  colab, cargos, areas, turnos, padroes, tiposOcorrencia,
  isGestor, onUpdate, onOcorrenciaAdded,
}: {
  colab:            ColaboradorProps
  cargos:           Cargo[]
  areas:            Area[]
  turnos:           Turno[]
  padroes:          Padrao[]
  tiposOcorrencia:  TipoOcorr[]
  isGestor:         boolean
  onUpdate:         (updated: Partial<ColaboradorProps>) => void
  onOcorrenciaAdded:(oc: Ocorrencia) => void
}) {
  const [editing,  setEditing]  = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [erro,     setErro]     = useState<string | null>(null)
  const [modal,    setModal]    = useState<"sensivel" | null>(null)

  // form
  const [fNome,    setFNome]    = useState(colab.nome)
  const [fCargo,   setFCargo]   = useState(String(colab.cargo.id))
  const [fArea,    setFArea]    = useState(String(colab.area.id))
  const [fTurno,   setFTurno]   = useState(String(colab.turno.id))
  const [fPadrao,  setFPadrao]  = useState(String(colab.padraoEscala.id))
  const [fAncora,  setFAncora]  = useState(colab.dataAncora ? colab.dataAncora.split("T")[0] : "")
  const [fAdmissao,setFAdmissao]= useState(colab.dataAdmissao.split("T")[0])

  // modal de campo sensível
  const [mTipo,  setMTipo]  = useState(tiposOcorrencia[0]?.id.toString() ?? "")
  const [mData,  setMData]  = useState(new Date().toISOString().split("T")[0])
  const [mDesc,  setMDesc]  = useState("")

  function sensivelMudou() {
    return (
      fCargo  !== String(colab.cargo.id)        ||
      fArea   !== String(colab.area.id)         ||
      fTurno  !== String(colab.turno.id)        ||
      fPadrao !== String(colab.padraoEscala.id)
    )
  }

  function handleSalvar() {
    if (sensivelMudou()) { setModal("sensivel"); return }
    doSave(null)
  }

  async function doSave(ocorrencia: { tipoId: number; data: string; descricao: string } | null) {
    setSaving(true); setErro(null)
    try {
      const body: Record<string, unknown> = {
        nome:           fNome.trim(),
        cargoId:        parseInt(fCargo),
        areaId:         parseInt(fArea),
        turnoId:        parseInt(fTurno),
        padraoEscalaId: parseInt(fPadrao),
        dataAncora:     fAncora || null,
        dataAdmissao:   fAdmissao,
      }
      if (ocorrencia) body.ocorrencia = ocorrencia

      const res = await fetch(`/api/efetivo/colaboradores/${colab.matricula}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok) { setErro(json.message ?? "Erro."); return }

      onUpdate({
        nome:        json.data.nome,
        cargo:       json.data.cargo,
        area:        json.data.area,
        turno:       json.data.turno,
        padraoEscala:json.data.padraoEscala,
        dataAncora:  json.data.dataAncora,
        dataAdmissao:json.data.dataAdmissao,
      })

      if (ocorrencia && json.data.ocorrencias?.[0]) {
        onOcorrenciaAdded(json.data.ocorrencias[0])
      }

      setEditing(false); setModal(null)
    } catch { setErro("Erro de conexão.") } finally { setSaving(false) }
  }

  const CAMPO = "w-full px-3 py-2 text-sm border border-gray-300 rounded text-gray-800 bg-white"

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-gray-900">Dados Cadastrais</h2>
        {isGestor && !editing && (
          <button onClick={() => { setEditing(true); setErro(null) }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-50">
            <Pencil size={14} /> Editar
          </button>
        )}
      </div>

      {editing ? (
        <div className="border border-gray-200 rounded-lg p-5 space-y-4 bg-white">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Nome</label>
              <input type="text" value={fNome} onChange={(e) => setFNome(e.target.value)} className={CAMPO} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Matrícula</label>
              <input type="text" value={colab.matricula} disabled className={`${CAMPO} opacity-50 cursor-not-allowed`} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Cargo *</label>
              <select value={fCargo} onChange={(e) => setFCargo(e.target.value)} className={CAMPO}>
                {cargos.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Área *</label>
              <select value={fArea} onChange={(e) => setFArea(e.target.value)} className={CAMPO}>
                {areas.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Turno *</label>
              <select value={fTurno} onChange={(e) => setFTurno(e.target.value)} className={CAMPO}>
                {turnos.map((t) => <option key={t.id} value={t.id}>Turno {t.codigo} ({t.horaInicio}–{t.horaFim})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Padrão de Escala *</label>
              <select value={fPadrao} onChange={(e) => setFPadrao(e.target.value)} className={CAMPO}>
                {padroes.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Data de Admissão</label>
              <input type="date" value={fAdmissao} onChange={(e) => setFAdmissao(e.target.value)} className={CAMPO} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Data-âncora (ciclo)</label>
              <input type="date" value={fAncora} onChange={(e) => setFAncora(e.target.value)} className={CAMPO} />
            </div>
          </div>

          {sensivelMudou() && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
              Campos sensíveis foram alterados (cargo, área, turno ou padrão). Ao salvar, será solicitado registrar a ocorrência correspondente.
            </p>
          )}

          {erro && <p className="text-sm text-red-600">{erro}</p>}

          <div className="flex gap-2">
            <button onClick={handleSalvar} disabled={saving}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-sm rounded hover:bg-primary/90 disabled:opacity-60">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Salvar
            </button>
            <button onClick={() => { setEditing(false); setErro(null) }}
              className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800">
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <dl className="border border-gray-200 rounded-lg divide-y divide-gray-100 bg-white overflow-hidden">
          {[
            ["Matrícula", <span className="font-mono">{colab.matricula}</span>],
            ["Nome",      colab.nome],
            ["Cargo",     colab.cargo.nome],
            ["Área",      colab.area.areaPai ? `${colab.area.areaPai.nome} / ${colab.area.nome}` : colab.area.nome],
            ["Turno",     `Turno ${colab.turno.codigo} (${colab.turno.horaInicio}–${colab.turno.horaFim})`],
            ["Padrão",    colab.padraoEscala.nome],
            ["Data de admissão", formatarData(colab.dataAdmissao)],
            ["Data-âncora",      colab.dataAncora ? formatarData(colab.dataAncora) : "—"],
          ].map(([label, value]) => (
            <div key={String(label)} className="flex gap-4 px-4 py-3">
              <dt className="w-36 text-xs text-gray-500 flex-shrink-0 pt-0.5">{label}</dt>
              <dd className="text-sm text-gray-800">{value}</dd>
            </div>
          ))}
        </dl>
      )}

      {/* Modal — campo sensível */}
      {modal === "sensivel" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h3 className="font-semibold text-gray-900">Registrar alteração</h3>
            <p className="text-sm text-gray-600">
              Você alterou campos sensíveis. Registre a ocorrência correspondente para manter o histórico.
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Tipo de ocorrência</label>
                <select value={mTipo} onChange={(e) => setMTipo(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded text-gray-800 bg-white">
                  {tiposOcorrencia.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Data efetiva</label>
                <input type="date" value={mData} onChange={(e) => setMData(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded text-gray-800 bg-white" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Descrição</label>
                <textarea value={mDesc} onChange={(e) => setMDesc(e.target.value)} rows={3}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded text-gray-800 bg-white resize-none" />
              </div>
            </div>
            {erro && <p className="text-sm text-red-600">{erro}</p>}
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => doSave({ tipoId: parseInt(mTipo), data: mData, descricao: mDesc || "Alteração cadastral." })}
                disabled={saving || !mTipo}
                className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white text-sm rounded hover:bg-primary/90 disabled:opacity-60">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                Confirmar e Salvar
              </button>
              <button onClick={() => setModal(null)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

// ─── Bloco âncora — histórico de data-âncora ─────────────────────────────────

function BlocoAncoraHistorico({
  matricula, dataAncoraBase, historico, isGestor, onAdded,
}: {
  matricula:      string
  dataAncoraBase: string | null
  historico:      AncoraHistoricoItem[]
  isGestor:       boolean
  onAdded:        (item: AncoraHistoricoItem) => void
}) {
  const [showForm,    setShowForm]    = useState(false)
  const [saving,      setSaving]      = useState(false)
  const [erro,        setErro]        = useState<string | null>(null)
  const [fAncora,     setFAncora]     = useState("")
  const [fVigencia,   setFVigencia]   = useState("")

  async function salvar() {
    if (!fAncora || !fVigencia) { setErro("Preencha a nova âncora e a data de vigência."); return }
    if (fVigencia < fAncora) { setErro("A vigência não pode ser anterior à nova âncora."); return }
    setSaving(true); setErro(null)
    try {
      const res  = await fetch(`/api/efetivo/colaboradores/${matricula}/ancora`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ dataAncora: fAncora, dataVigencia: fVigencia }),
      })
      const json = await res.json()
      if (!json.ok) { setErro(json.message ?? "Erro ao salvar."); return }
      onAdded({ ...json.data, criadoEm: new Date().toISOString(), criadoPorNome: "você" })
      setShowForm(false); setFAncora(""); setFVigencia("")
    } catch { setErro("Erro de conexão.") } finally { setSaving(false) }
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Data-âncora do ciclo rotativo</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Âncora base: <span className="font-medium text-gray-600">{dataAncoraBase ? formatarData(dataAncoraBase) : "não definida"}</span>
            {" · "}Alterações valem a partir da data de vigência informada — datas anteriores não mudam.
          </p>
        </div>
        {isGestor && (
          <button
            onClick={() => { setShowForm((v) => !v); setErro(null) }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-300 text-gray-600 rounded hover:bg-gray-50"
          >
            <Plus size={14} /> Alterar âncora
          </button>
        )}
      </div>

      {showForm && (
        <div className="border border-gray-200 rounded-lg p-4 space-y-3 mb-4 bg-white">
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
            A nova âncora vale apenas para dias ≥ data de vigência. O cálculo de dias anteriores permanece inalterado.
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Nova data-âncora <span className="text-red-500">*</span></label>
              <input type="date" value={fAncora} onChange={(e) => setFAncora(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded text-gray-800 bg-white" />
              <p className="text-[11px] text-gray-400 mt-1">Primeiro dia do novo ciclo (dia 0 da rotação).</p>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Vigente a partir de <span className="text-red-500">*</span></label>
              <input type="date" value={fVigencia} onChange={(e) => setFVigencia(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded text-gray-800 bg-white" />
              <p className="text-[11px] text-gray-400 mt-1">Datas anteriores usam a âncora antiga.</p>
            </div>
          </div>
          {erro && <p className="text-sm text-red-600">{erro}</p>}
          <div className="flex gap-2">
            <button onClick={salvar} disabled={saving}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-sm rounded hover:bg-primary/90 disabled:opacity-60">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Salvar
            </button>
            <button onClick={() => { setShowForm(false); setErro(null) }}
              className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {historico.length === 0 ? (
        <p className="text-sm text-gray-400 py-4 text-center">Nenhuma alteração de âncora registrada.</p>
      ) : (
        <ul className="space-y-2">
          {historico.map((h) => (
            <li key={h.id} className="flex items-center gap-3 px-4 py-2.5 border border-gray-100 rounded-lg bg-white text-sm">
              <div className="flex-1 min-w-0">
                <span className="font-medium text-gray-800">Nova âncora: {formatarData(h.dataAncora)}</span>
                <span className="text-gray-500 mx-2">·</span>
                <span className="text-gray-600">Vigente a partir de {formatarData(h.dataVigencia)}</span>
              </div>
              <span className="text-xs text-gray-400 flex-shrink-0">
                {h.criadoPorNome} · {formatarData(h.criadoEm)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

// ─── Bloco 2 — Vínculo ───────────────────────────────────────────────────────

function BlocoVinculo({
  colab, isGestor, onMovimentacao,
}: {
  colab:         ColaboradorProps
  isGestor:      boolean
  onMovimentacao:(mov: Movimentacao, novoStatus: "ATIVO" | "DESLIGADO") => void
}) {
  const [acao,   setAcao]   = useState<"DESLIGAMENTO" | "READMISSAO" | null>(null)
  const [saving, setSaving] = useState(false)
  const [erro,   setErro]   = useState<string | null>(null)

  const [fData,   setFData]   = useState(new Date().toISOString().split("T")[0])
  const [fMotivo, setFMotivo] = useState("")

  async function registrar() {
    if (!fData) { setErro("Data obrigatória."); return }
    setSaving(true); setErro(null)
    try {
      const res = await fetch(`/api/efetivo/colaboradores/${colab.matricula}/movimentacoes`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo: acao, data: fData, motivo: fMotivo || null }),
      })
      const json = await res.json()
      if (!res.ok) { setErro(json.message ?? "Erro."); return }
      onMovimentacao(json.data.movimentacao, json.data.novoStatus)
      setAcao(null); setFData(new Date().toISOString().split("T")[0]); setFMotivo("")
    } catch { setErro("Erro de conexão.") } finally { setSaving(false) }
  }

  const ativo     = colab.status === "ATIVO"
  const desligado = colab.status === "DESLIGADO"

  return (
    <section>
      <h2 className="text-base font-semibold text-gray-900 mb-4">Vínculo</h2>

      {/* Banner de status */}
      <div className={`rounded-lg px-4 py-3 mb-4 text-sm flex items-center gap-2 ${
        ativo ? "bg-green-50 text-green-800 border border-green-200" : "bg-gray-50 text-gray-700 border border-gray-200"
      }`}>
        {ativo ? <UserCheck size={16} /> : <UserX size={16} />}
        {ativo
          ? `Ativo desde ${formatarData(colab.dataAdmissao)}`
          : `Desligado em ${colab.dataDesligamento ? formatarData(colab.dataDesligamento) : "data não registrada"}`}
      </div>

      {/* Ações */}
      {isGestor && !acao && (
        <div className="flex gap-2 mb-4">
          {ativo && (
            <button onClick={() => setAcao("DESLIGAMENTO")}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-red-200 text-red-600 rounded hover:bg-red-50">
              <UserX size={14} /> Registrar Desligamento
            </button>
          )}
          {desligado && (
            <button onClick={() => setAcao("READMISSAO")}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-green-200 text-green-600 rounded hover:bg-green-50">
              <LogIn size={14} /> Registrar Readmissão
            </button>
          )}
        </div>
      )}

      {/* Formulário de ação */}
      {acao && (
        <div className="border border-gray-200 rounded-lg p-4 space-y-3 mb-4 bg-white">
          <p className="text-sm font-medium text-gray-900">
            {acao === "DESLIGAMENTO" ? "Registrar Desligamento" : "Registrar Readmissão"}
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Data efetiva</label>
              <input type="date" value={fData} onChange={(e) => setFData(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded text-gray-800 bg-white" />
            </div>
            {acao === "DESLIGAMENTO" && (
              <div>
                <label className="block text-xs text-gray-500 mb-1">Motivo (opcional)</label>
                <input type="text" value={fMotivo} onChange={(e) => setFMotivo(e.target.value)}
                  placeholder="Ex: pedido de demissão"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded text-gray-800 bg-white" />
              </div>
            )}
          </div>
          {erro && <p className="text-sm text-red-600">{erro}</p>}
          <div className="flex gap-2">
            <button onClick={registrar} disabled={saving}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-sm rounded hover:bg-primary/90 disabled:opacity-60">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Salvar
            </button>
            <button onClick={() => { setAcao(null); setErro(null) }}
              className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Timeline */}
      {colab.movimentacoes.length === 0 ? (
        <p className="text-sm text-gray-400 py-4 text-center">Nenhuma movimentação registrada.</p>
      ) : (
        <ul className="space-y-3">
          {colab.movimentacoes.map((m) => (
            <li key={m.id} className="flex gap-3 items-start">
              <div className="mt-0.5 w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                {MOV_ICON[m.tipo]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">
                  {MOV_LABEL[m.tipo]} — {formatarData(m.data)}
                  {m.motivo && <span className="font-normal text-gray-500"> · {m.motivo}</span>}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Registrado por {m.registrador.name} · {formatarDataHora(m.createdAt)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

// ─── Bloco 3 — Ocorrências ───────────────────────────────────────────────────

function BlocoOcorrencias({
  colab, tiposOcorrencia, isGestor, onAdded, onDeleted,
}: {
  colab:           ColaboradorProps
  tiposOcorrencia: TipoOcorr[]
  isGestor:        boolean
  onAdded:         (oc: Ocorrencia) => void
  onDeleted:       (id: number) => void
}) {
  const [showForm, setShowForm] = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [erro,     setErro]     = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  const [fTipo,  setFTipo]  = useState(tiposOcorrencia[0]?.id.toString() ?? "")
  const [fData,  setFData]  = useState(new Date().toISOString().split("T")[0])
  const [fDesc,  setFDesc]  = useState("")
  const [fAnexo, setFAnexo] = useState<string | null>(null)
  const [fAnexoNome, setFAnexoNome] = useState<string>("")
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true); setErro(null)
    try {
      const reader = new FileReader()
      reader.onload = async () => {
        const base64 = reader.result as string
        const res = await fetch("/api/upload", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data: base64, folder: "efetivo/ocorrencias" }),
        })
        const json = await res.json()
        if (!res.ok) { setErro(json.message ?? "Erro no upload."); return }
        setFAnexo(json.url); setFAnexoNome(file.name)
      }
      reader.readAsDataURL(file)
    } catch { setErro("Erro ao processar arquivo.") } finally { setUploading(false) }
  }

  async function submit() {
    if (!fTipo || !fData || !fDesc.trim()) { setErro("Tipo, data e descrição são obrigatórios."); return }
    setSaving(true); setErro(null)
    try {
      const res = await fetch(`/api/efetivo/colaboradores/${colab.matricula}/ocorrencias`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipoId: parseInt(fTipo), data: fData, descricao: fDesc.trim(), anexoUrl: fAnexo }),
      })
      const json = await res.json()
      if (!res.ok) { setErro(json.message ?? "Erro."); return }
      onAdded(json.data)
      setShowForm(false); setFTipo(tiposOcorrencia[0]?.id.toString() ?? ""); setFData(new Date().toISOString().split("T")[0])
      setFDesc(""); setFAnexo(null); setFAnexoNome("")
    } catch { setErro("Erro de conexão.") } finally { setSaving(false) }
  }

  async function excluir(id: number) {
    if (!confirm("Excluir esta ocorrência? A ação ficará registrada na auditoria.")) return
    try {
      const res = await fetch(`/api/efetivo/ocorrencias/${id}`, { method: "DELETE" })
      if (res.ok) { onDeleted(id) }
      else { const json = await res.json(); setErro(json.message ?? "Erro.") }
    } catch { setErro("Erro de conexão.") }
  }

  return (
    <section className="pb-12">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-gray-900">Ocorrências</h2>
        <button onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-sm rounded hover:bg-primary/90 transition-colors">
          <Plus size={14} /> Nova
        </button>
      </div>

      {showForm && (
        <div className="border border-gray-200 rounded-lg p-5 space-y-4 mb-6 bg-white">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Tipo</label>
              <select value={fTipo} onChange={(e) => setFTipo(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded text-gray-800 bg-white">
                {tiposOcorrencia.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Data do fato</label>
              <input type="date" value={fData} onChange={(e) => setFData(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded text-gray-800 bg-white" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Descrição</label>
            <textarea value={fDesc} onChange={(e) => setFDesc(e.target.value)} rows={3}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded text-gray-800 bg-white resize-none" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Anexo (PDF ou imagem, opcional)</label>
            {fAnexo ? (
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <Paperclip size={14} className="text-gray-400" />
                <span className="truncate">{fAnexoNome}</span>
                <button onClick={() => { setFAnexo(null); setFAnexoNome("") }}
                  className="text-gray-400 hover:text-red-500"><X size={14} /></button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button onClick={() => fileRef.current?.click()} disabled={uploading}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-300 rounded text-gray-600 hover:bg-gray-50 disabled:opacity-60">
                  {uploading ? <Loader2 size={14} className="animate-spin" /> : <Paperclip size={14} />}
                  {uploading ? "Enviando..." : "Selecionar arquivo"}
                </button>
                <input ref={fileRef} type="file" accept="image/*,.pdf" onChange={handleFile} className="hidden" />
              </div>
            )}
          </div>
          {erro && <p className="text-sm text-red-600">{erro}</p>}
          <div className="flex gap-2">
            <button onClick={submit} disabled={saving || uploading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-sm rounded hover:bg-primary/90 disabled:opacity-60">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Salvar
            </button>
            <button onClick={() => { setShowForm(false); setErro(null) }}
              className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {colab.ocorrencias.length === 0 ? (
        <p className="text-sm text-gray-400 py-4 text-center">Nenhuma ocorrência registrada.</p>
      ) : (
        <ul className="space-y-4">
          {colab.ocorrencias.map((o) => (
            <li key={o.id} className="border border-gray-200 rounded-lg p-4 bg-white space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary font-medium">
                    {o.tipo.nome}
                  </span>
                  <span className="text-sm text-gray-700 font-medium">{formatarData(o.data)}</span>
                </div>
                {isGestor && (
                  <button onClick={() => excluir(o.id)}
                    className="p-1 text-gray-300 hover:text-red-500 flex-shrink-0">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
              <p className="text-sm text-gray-800 whitespace-pre-line">{o.descricao}</p>
              {o.anexoUrl && (
                <a href={o.anexoUrl} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline">
                  <Paperclip size={12} /> Ver anexo
                </a>
              )}
              <p className="text-xs text-gray-400">
                Registrado por {o.registrador.name} · {formatarDataHora(o.createdAt)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
