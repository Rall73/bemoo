"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Send, Loader2 } from "lucide-react"

interface Props {
  areas:   { id: number; name: string }[]
  produtos:{ id: number; name: string; category: string | null }[]
}

export function NovoPedidoForm({ areas, produtos }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [erro, setErro]       = useState<string | null>(null)

  const [form, setForm] = useState({
    areaId:      "",
    productId:   "",
    quantity:    "1",
    desiredDate: "",
    details:     "",
  })

  const categorias = [...new Set(produtos.map((p) => p.category).filter(Boolean))] as string[]
  const [filtroCategoria, setFiltroCategoria] = useState("")
  const produtosFiltrados = filtroCategoria
    ? produtos.filter((p) => p.category === filtroCategoria)
    : produtos

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)
    setLoading(true)
    try {
      const res = await fetch("/api/oficina/pedidos", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          areaId:      parseInt(form.areaId),
          productId:   parseInt(form.productId),
          quantity:    parseInt(form.quantity),
          desiredDate: form.desiredDate || undefined,
          details:     form.details     || undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setErro(json.message ?? "Erro ao criar pedido.")
        return
      }
      router.push(`/oficina/pedidos/${json.data.id}`)
      router.refresh()
    } catch {
      setErro("Erro de conexão. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-lg p-6 space-y-5">
      {/* Área solicitante */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Área solicitante <span className="text-red-500">*</span>
        </label>
        <select
          required
          value={form.areaId}
          onChange={(e) => setForm((f) => ({ ...f, areaId: e.target.value }))}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="">Selecione a área...</option>
          {areas.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
      </div>

      {/* Categoria (filtro) + Produto */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Produto / Serviço <span className="text-red-500">*</span>
        </label>
        {categorias.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            <button
              type="button"
              onClick={() => { setFiltroCategoria(""); setForm((f) => ({ ...f, productId: "" })) }}
              className={`px-2 py-0.5 text-xs rounded border transition-colors ${
                !filtroCategoria
                  ? "border-primary bg-primary text-white"
                  : "border-gray-300 text-gray-600 hover:border-gray-400"
              }`}
            >
              Todos
            </button>
            {categorias.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => { setFiltroCategoria(c); setForm((f) => ({ ...f, productId: "" })) }}
                className={`px-2 py-0.5 text-xs rounded border transition-colors ${
                  filtroCategoria === c
                    ? "border-primary bg-primary text-white"
                    : "border-gray-300 text-gray-600 hover:border-gray-400"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        )}
        <select
          required
          value={form.productId}
          onChange={(e) => setForm((f) => ({ ...f, productId: e.target.value }))}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="">Selecione o produto/serviço...</option>
          {produtosFiltrados.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {/* Quantidade + Prazo */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Quantidade <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            required
            min={1}
            value={form.quantity}
            onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Prazo desejado
          </label>
          <input
            type="date"
            value={form.desiredDate}
            onChange={(e) => setForm((f) => ({ ...f, desiredDate: e.target.value }))}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
      </div>

      {/* Detalhamento */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Detalhes / observações
        </label>
        <textarea
          rows={4}
          value={form.details}
          onChange={(e) => setForm((f) => ({ ...f, details: e.target.value }))}
          placeholder="Descreva especificações, medidas, referências ou outras informações relevantes..."
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
        />
      </div>

      {erro && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
          {erro}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-white text-sm font-medium rounded hover:bg-primary/90 transition-colors disabled:opacity-60"
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        {loading ? "Enviando..." : "Abrir pedido"}
      </button>
    </form>
  )
}
