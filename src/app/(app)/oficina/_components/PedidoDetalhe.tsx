"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft, Loader2, Send, Package, Recycle, ChevronDown,
  MessageSquare, Truck, BarChart2,
} from "lucide-react"
import Link from "next/link"
import { formatarData, formatarDataHora } from "@/lib/date"

const STATUS_LABEL: Record<string, string> = {
  NOVO:            "Novo",
  EM_ANALISE:      "Em análise",
  PENDENTE:        "Pendente",
  EM_PRODUCAO:     "Em produção",
  ENTREGA_PARCIAL: "Entrega parcial",
  CONCLUIDO:       "Concluído",
  CANCELADO:       "Cancelado",
}
const STATUS_STYLE: Record<string, string> = {
  NOVO:            "bg-gray-100 text-gray-700",
  EM_ANALISE:      "bg-blue-100 text-blue-700",
  PENDENTE:        "bg-yellow-100 text-yellow-800",
  EM_PRODUCAO:     "bg-indigo-100 text-indigo-700",
  ENTREGA_PARCIAL: "bg-orange-100 text-orange-700",
  CONCLUIDO:       "bg-green-100 text-green-700",
  CANCELADO:       "bg-red-100 text-red-600",
}
const NEXT_STATUS: Record<string, string[]> = {
  NOVO:            ["EM_ANALISE", "CANCELADO"],
  EM_ANALISE:      ["PENDENTE", "EM_PRODUCAO"],
  PENDENTE:        ["EM_ANALISE", "EM_PRODUCAO", "CANCELADO"],
  EM_PRODUCAO:     ["PENDENTE", "CONCLUIDO"],
  ENTREGA_PARCIAL: ["EM_PRODUCAO", "PENDENTE", "CONCLUIDO"],
  CONCLUIDO:       [],
  CANCELADO:       [],
}

type Aba = "log" | "entregas" | "consumos"

interface Pedido {
  id: number; areaName: string; productName: string; productCategory: string | null
  requester: { id: number; name: string }; assignee: { id: number; name: string } | null
  quantity: number; quantityDelivered: number; desiredDate: string | null
  details: string | null; status: string; pauseReasonId: number | null
  pauseReasonName: string | null; startedAt: string | null; finishedAt: string | null
  createdAt: string
  attachments: { id: number; url: string; fileName: string | null }[]
  logs: { id: number; message: string; statusFrom: string | null; statusTo: string | null; userName: string; userRole: string; createdAt: string }[]
  deliveries: { id: number; quantity: number; note: string | null; delivererName: string; createdAt: string }[]
  consumptions: { id: number; materialName: string; unit: string; unitCost: number | null; quantity: number; source: string; note: string | null; creatorName: string; createdAt: string }[]
}

interface Props {
  pedido:        Pedido
  currentUserId: number
  role:          string
  usuarios:      { id: number; name: string; role: string }[]
  materiais:     { id: number; name: string; unit: string; quantity: number }[]
  motivosPausa:  { id: number; name: string }[]
}

export function PedidoDetalhe({ pedido: initial, currentUserId, role, usuarios, materiais, motivosPausa }: Props) {
  const router   = useRouter()
  const canManage = role === "ADMIN" || role === "GESTOR"
  const isOwner   = initial.requester.id === currentUserId

  const [pedido, setPedido] = useState(initial)
  const [aba,    setAba]    = useState<Aba>("log")
  const [saving, setSaving] = useState(false)
  const [erro,   setErro]   = useState<string | null>(null)

  // Log
  const [msg, setMsg]             = useState("")
  const [enviandoMsg, setEnviandoMsg] = useState(false)

  // Mudança de status
  const [novoStatus,    setNovoStatus]    = useState("")
  const [msgStatus,     setMsgStatus]     = useState("")
  const [pauseReasonId, setPauseReasonId] = useState<string>("")
  const [assignedTo,    setAssignedTo]    = useState<string>("")
  const [showStatus,    setShowStatus]    = useState(false)

  // Entrega
  const [entregaQtd,  setEntregaQtd]  = useState("1")
  const [entregaNota, setEntregaNota] = useState("")
  const [salvandoEnt, setSalvandoEnt] = useState(false)

  // Consumo
  const [consumoMat,  setConsumoMat]  = useState("")
  const [consumoQtd,  setConsumoQtd]  = useState("1")
  const [consumoSrc,  setConsumoSrc]  = useState<"COMPRADO" | "RECICLADO">("COMPRADO")
  const [consumoNota, setConsumoNota] = useState("")
  const [salvandoCon, setSalvandoCon] = useState(false)

  async function api(path: string, body: object) {
    const res = await fetch(path, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(body),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.message ?? "Erro.")
    return json.data
  }

  async function apiPatch(path: string, body: object) {
    const res = await fetch(path, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(body),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.message ?? "Erro.")
    return json.data
  }

  async function enviarMsg() {
    if (!msg.trim()) return
    setEnviandoMsg(true); setErro(null)
    try {
      const log = await api(`/api/oficina/pedidos/${pedido.id}/logs`, { message: msg.trim() })
      setPedido((p) => ({ ...p, logs: [...p.logs, { ...log, userName: log.user.name, userRole: log.user.role }] }))
      setMsg("")
    } catch (e: any) { setErro(e.message) } finally { setEnviandoMsg(false) }
  }

  async function mudarStatus() {
    if (!novoStatus) return
    setSaving(true); setErro(null)
    try {
      await apiPatch(`/api/oficina/pedidos/${pedido.id}`, {
        status:        novoStatus,
        message:       msgStatus || undefined,
        pauseReasonId: novoStatus === "PENDENTE" && pauseReasonId ? parseInt(pauseReasonId) : null,
        assignedTo:    assignedTo ? parseInt(assignedTo) : undefined,
      })
      router.refresh()
      setShowStatus(false)
    } catch (e: any) { setErro(e.message) } finally { setSaving(false) }
  }

  async function registrarEntrega() {
    setSalvandoEnt(true); setErro(null)
    try {
      await api(`/api/oficina/pedidos/${pedido.id}/entregas`, {
        quantity: parseInt(entregaQtd),
        note:     entregaNota || undefined,
      })
      router.refresh()
      setEntregaQtd("1"); setEntregaNota("")
    } catch (e: any) { setErro(e.message) } finally { setSalvandoEnt(false) }
  }

  async function registrarConsumo() {
    if (!consumoMat) { setErro("Selecione um material."); return }
    setSalvandoCon(true); setErro(null)
    try {
      await api(`/api/oficina/pedidos/${pedido.id}/consumos`, {
        materialId: parseInt(consumoMat),
        quantity:   parseFloat(consumoQtd),
        source:     consumoSrc,
        note:       consumoNota || undefined,
      })
      router.refresh()
      setConsumoMat(""); setConsumoQtd("1"); setConsumoNota("")
    } catch (e: any) { setErro(e.message) } finally { setSalvandoCon(false) }
  }

  async function removerConsumo(consumoId: number) {
    if (!confirm("Remover este apontamento? O estoque será estornado.")) return
    try {
      await fetch(`/api/oficina/pedidos/${pedido.id}/consumos/${consumoId}`, { method: "DELETE" })
      router.refresh()
    } catch { setErro("Erro ao remover consumo.") }
  }

  const isFinalizado = pedido.status === "CONCLUIDO" || pedido.status === "CANCELADO"
  const nextOptions  = NEXT_STATUS[pedido.status] ?? []

  // Totais de consumo
  const totalComprado = pedido.consumptions.filter((c) => c.source === "COMPRADO").reduce((s, c) => s + c.quantity, 0)
  const totalReciclado = pedido.consumptions.filter((c) => c.source === "RECICLADO").reduce((s, c) => s + c.quantity, 0)
  const economiaSalva = pedido.consumptions
    .filter((c) => c.source === "RECICLADO" && c.unitCost)
    .reduce((s, c) => s + c.quantity * (c.unitCost ?? 0), 0)

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div>
        <Link href="/oficina/pedidos" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-3">
          <ArrowLeft size={14} /> Voltar aos pedidos
        </Link>
        <div className="flex items-start gap-4 justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold text-gray-900" style={{ letterSpacing: "-0.02em" }}>
                OS-{String(pedido.id).padStart(5, "0")}
              </h1>
              <span className={`text-xs px-2 py-0.5 rounded font-medium ${STATUS_STYLE[pedido.status]}`}>
                {STATUS_LABEL[pedido.status]}
              </span>
            </div>
            <p className="text-sm text-gray-600 mt-0.5">
              {pedido.productName}
              {pedido.productCategory && <span className="text-gray-400"> · {pedido.productCategory}</span>}
            </p>
          </div>

          {/* Botão de mudança de status */}
          {!isFinalizado && (canManage || (isOwner && pedido.status === "NOVO")) && nextOptions.length > 0 && (
            <button
              onClick={() => setShowStatus((v) => !v)}
              className="flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50 transition-colors"
            >
              Atualizar status <ChevronDown size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Painel de mudança de status */}
      {showStatus && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Novo status</label>
              <select
                value={novoStatus}
                onChange={(e) => setNovoStatus(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded text-gray-800 bg-white"
              >
                <option value="">Selecione...</option>
                {nextOptions.map((s) => (
                  <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                ))}
              </select>
            </div>
            {canManage && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Responsável</label>
                <select
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded text-gray-800 bg-white"
                >
                  <option value="">Sem responsável</option>
                  {usuarios.map((u) => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
          {novoStatus === "PENDENTE" && motivosPausa.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Motivo da pausa</label>
              <select
                value={pauseReasonId}
                onChange={(e) => setPauseReasonId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded text-gray-800 bg-white"
              >
                <option value="">Selecione um motivo...</option>
                {motivosPausa.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
          )}
          <textarea
            rows={2}
            value={msgStatus}
            onChange={(e) => setMsgStatus(e.target.value)}
            placeholder="Observação (opcional)..."
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded text-gray-800 bg-white resize-none"
          />
          <div className="flex gap-2">
            <button
              onClick={mudarStatus}
              disabled={saving || !novoStatus}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-sm rounded hover:bg-primary/90 disabled:opacity-60 transition-colors"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              Confirmar
            </button>
            <button onClick={() => setShowStatus(false)} className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Info do pedido */}
      <div className="grid sm:grid-cols-2 gap-4 bg-white border border-gray-200 rounded-lg p-5">
        <InfoRow label="Área solicitante"  value={pedido.areaName} />
        <InfoRow label="Solicitado por"    value={pedido.requester.name} />
        <InfoRow label="Responsável"       value={pedido.assignee?.name ?? "—"} />
        <InfoRow
          label="Quantidade"
          value={`${pedido.quantityDelivered}/${pedido.quantity} (${Math.round((pedido.quantityDelivered / pedido.quantity) * 100)}% entregue)`}
        />
        <InfoRow label="Prazo desejado"    value={pedido.desiredDate ? formatarData(pedido.desiredDate) : "—"} />
        <InfoRow label="Abertura"          value={formatarDataHora(pedido.createdAt)} />
        {pedido.startedAt  && <InfoRow label="Início produção" value={formatarDataHora(pedido.startedAt)} />}
        {pedido.finishedAt && <InfoRow label="Conclusão"       value={formatarDataHora(pedido.finishedAt)} />}
        {pedido.details && (
          <div className="sm:col-span-2">
            <p className="text-xs text-gray-500 mb-0.5">Detalhes</p>
            <p className="text-sm text-gray-800 whitespace-pre-wrap">{pedido.details}</p>
          </div>
        )}
        {pedido.attachments.length > 0 && (
          <div className="sm:col-span-2">
            <p className="text-xs text-gray-500 mb-1">Anexos</p>
            <div className="flex flex-wrap gap-2">
              {pedido.attachments.map((a) => (
                <a
                  key={a.id}
                  href={a.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary underline"
                >
                  {a.fileName ?? "Anexo"}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Erro global */}
      {erro && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{erro}</p>
      )}

      {/* Abas */}
      <div>
        <div className="flex border-b border-gray-200 gap-4">
          {(["log", "entregas", "consumos"] as Aba[]).map((a) => (
            <button
              key={a}
              onClick={() => setAba(a)}
              className={`flex items-center gap-1.5 pb-2 text-sm font-medium border-b-2 transition-colors ${
                aba === a
                  ? "border-primary text-primary"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {a === "log"      && <><MessageSquare size={14} /> Log</>}
              {a === "entregas" && <><Truck         size={14} /> Entregas ({pedido.deliveries.length})</>}
              {a === "consumos" && <><BarChart2      size={14} /> Materiais</>}
            </button>
          ))}
        </div>

        {/* Aba Log */}
        {aba === "log" && (
          <div className="pt-4 space-y-4">
            {pedido.logs.length === 0 ? (
              <p className="text-sm text-gray-400">Sem mensagens ainda.</p>
            ) : (
              <ul className="space-y-3">
                {pedido.logs.map((l) => (
                  <li key={l.id} className="flex gap-3">
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-xs font-semibold text-primary">
                      {l.userName.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-xs text-gray-500 mb-0.5">
                        <span className="font-medium text-gray-700">{l.userName}</span>
                        {l.statusTo && (
                          <span className={`px-1.5 py-0.5 rounded text-[11px] font-medium ${STATUS_STYLE[l.statusTo]}`}>
                            {STATUS_LABEL[l.statusTo]}
                          </span>
                        )}
                        <span>{formatarDataHora(l.createdAt)}</span>
                      </div>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{l.message}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {/* Novo comentário */}
            {!isFinalizado && (
              <div className="flex gap-2 pt-2">
                <textarea
                  rows={2}
                  value={msg}
                  onChange={(e) => setMsg(e.target.value)}
                  placeholder="Escrever uma observação ou mensagem..."
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded text-gray-800 bg-white resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <button
                  onClick={enviarMsg}
                  disabled={enviandoMsg || !msg.trim()}
                  className="px-3 py-2 bg-primary text-white rounded hover:bg-primary/90 disabled:opacity-60 transition-colors"
                >
                  {enviandoMsg ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Aba Entregas */}
        {aba === "entregas" && (
          <div className="pt-4 space-y-4">
            {pedido.deliveries.length === 0 ? (
              <p className="text-sm text-gray-400">Nenhuma entrega registrada.</p>
            ) : (
              <ul className="space-y-2">
                {pedido.deliveries.map((d) => (
                  <li key={d.id} className="flex items-start gap-3 bg-green-50 border border-green-100 rounded px-3 py-2 text-sm">
                    <Package size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <span className="font-medium text-green-800">{d.quantity} un</span>
                      {d.note && <span className="text-green-700"> — {d.note}</span>}
                      <div className="text-xs text-green-600 mt-0.5">
                        {d.delivererName} · {formatarDataHora(d.createdAt)}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {canManage && !isFinalizado && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
                <h3 className="text-sm font-medium text-gray-700">Registrar entrega</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Quantidade</label>
                    <input
                      type="number" min={1}
                      value={entregaQtd}
                      onChange={(e) => setEntregaQtd(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded text-gray-800 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Observação</label>
                    <input
                      type="text"
                      value={entregaNota}
                      onChange={(e) => setEntregaNota(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded text-gray-800 bg-white"
                    />
                  </div>
                </div>
                <button
                  onClick={registrarEntrega}
                  disabled={salvandoEnt}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-sm rounded hover:bg-primary/90 disabled:opacity-60"
                >
                  {salvandoEnt ? <Loader2 size={14} className="animate-spin" /> : <Truck size={14} />}
                  Confirmar entrega
                </button>
              </div>
            )}
          </div>
        )}

        {/* Aba Materiais / Consumo */}
        {aba === "consumos" && (
          <div className="pt-4 space-y-4">
            {/* Resumo ESG */}
            {(totalComprado > 0 || totalReciclado > 0) && (
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-gray-50 rounded p-3 text-center">
                  <p className="text-xs text-gray-500">Comprado</p>
                  <p className="font-semibold text-gray-900">{totalComprado.toFixed(2)}</p>
                </div>
                <div className="bg-teal-50 rounded p-3 text-center">
                  <Recycle size={14} className="mx-auto text-teal-600 mb-1" />
                  <p className="text-xs text-gray-500">Reciclado</p>
                  <p className="font-semibold text-teal-700">{totalReciclado.toFixed(2)}</p>
                </div>
                {economiaSalva > 0 && (
                  <div className="bg-green-50 rounded p-3 text-center">
                    <p className="text-xs text-gray-500">Economia ESG</p>
                    <p className="font-semibold text-green-700">
                      R$ {economiaSalva.toFixed(2)}
                    </p>
                  </div>
                )}
              </div>
            )}

            {pedido.consumptions.length === 0 ? (
              <p className="text-sm text-gray-400">Nenhum material apontado.</p>
            ) : (
              <ul className="space-y-2">
                {pedido.consumptions.map((c) => (
                  <li key={c.id} className="flex items-start gap-3 border border-gray-100 rounded px-3 py-2 text-sm bg-white">
                    {c.source === "RECICLADO"
                      ? <Recycle size={16} className="text-teal-600 mt-0.5 flex-shrink-0" />
                      : <Package  size={16} className="text-gray-400 mt-0.5 flex-shrink-0" />
                    }
                    <div className="flex-1">
                      <span className="font-medium text-gray-800">{c.materialName}</span>
                      {" "}<span className="text-gray-500">{c.quantity} {c.unit}</span>
                      {" "}<span className={`text-xs px-1.5 py-0.5 rounded ${c.source === "RECICLADO" ? "bg-teal-100 text-teal-700" : "bg-gray-100 text-gray-600"}`}>
                        {c.source === "RECICLADO" ? "Reciclado" : "Comprado"}
                      </span>
                      {c.note && <span className="text-gray-500"> — {c.note}</span>}
                      <div className="text-xs text-gray-400 mt-0.5">{c.creatorName} · {formatarDataHora(c.createdAt)}</div>
                    </div>
                    {canManage && !isFinalizado && (
                      <button
                        onClick={() => removerConsumo(c.id)}
                        className="text-xs text-red-400 hover:text-red-600 flex-shrink-0"
                      >
                        Remover
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {canManage && !isFinalizado && materiais.length > 0 && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
                <h3 className="text-sm font-medium text-gray-700">Apontar material</h3>
                <div className="grid sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-1">
                    <label className="block text-xs text-gray-500 mb-1">Material</label>
                    <select
                      value={consumoMat}
                      onChange={(e) => setConsumoMat(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded text-gray-800 bg-white"
                    >
                      <option value="">Selecione...</option>
                      {materiais.map((m) => (
                        <option key={m.id} value={m.id}>{m.name} ({m.quantity} {m.unit})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Quantidade</label>
                    <input
                      type="number" min={0.001} step="any"
                      value={consumoQtd}
                      onChange={(e) => setConsumoQtd(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded text-gray-800 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Origem</label>
                    <select
                      value={consumoSrc}
                      onChange={(e) => setConsumoSrc(e.target.value as any)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded text-gray-800 bg-white"
                    >
                      <option value="COMPRADO">Comprado</option>
                      <option value="RECICLADO">Reciclado / Reaproveitado</option>
                    </select>
                  </div>
                </div>
                <input
                  type="text"
                  value={consumoNota}
                  onChange={(e) => setConsumoNota(e.target.value)}
                  placeholder="Observação (opcional)"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded text-gray-800 bg-white"
                />
                <button
                  onClick={registrarConsumo}
                  disabled={salvandoCon}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-sm rounded hover:bg-primary/90 disabled:opacity-60"
                >
                  {salvandoCon ? <Loader2 size={14} className="animate-spin" /> : <BarChart2 size={14} />}
                  Apontar
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-sm font-medium text-gray-800 mt-0.5">{value}</p>
    </div>
  )
}
