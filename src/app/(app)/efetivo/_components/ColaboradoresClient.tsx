"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { Search, Filter, ChevronRight } from "lucide-react"

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
  areas:  { id: number; nome: string }[]
  turnos: { id: number; codigo: string }[]
}

const STATUS_LABEL: Record<string, string> = { ATIVO: "Ativo", DESLIGADO: "Desligado" }
const STATUS_CLS:   Record<string, string> = {
  ATIVO:     "bg-green-50 text-green-700",
  DESLIGADO: "bg-gray-100 text-gray-500",
}

export function ColaboradoresClient({ colaboradores, areas, turnos }: Props) {
  const [q,       setQ]       = useState("")
  const [status,  setStatus]  = useState("")
  const [areaId,  setAreaId]  = useState("")
  const [turnoId, setTurnoId] = useState("")

  const filtrados = useMemo(() => {
    const qLower = q.toLowerCase()
    return colaboradores.filter((c) => {
      if (q && !c.nome.toLowerCase().includes(qLower) && !c.matricula.toLowerCase().includes(qLower)) return false
      if (status  && c.status      !== status)              return false
      if (areaId  && String(areas.find((a) => String(a.id) === areaId)?.id)  !== String(areaId))  return false
      if (turnoId && String(turnos.find((t) => String(t.id) === turnoId)?.id) !== String(turnoId)) return false
      return true
    })
  }, [colaboradores, q, status, areaId, turnoId])

  // A filtragem de área e turno precisa comparar o nome, não o id, porque colaborador tem cargo/area/turno como objetos
  const filtradosV2 = useMemo(() => {
    const qLower = q.toLowerCase()
    const areaNome  = areas.find((a)  => String(a.id)  === areaId)?.nome
    const turnoCode = turnos.find((t) => String(t.id) === turnoId)?.codigo
    return colaboradores.filter((c) => {
      if (q && !c.nome.toLowerCase().includes(qLower) && !c.matricula.toLowerCase().includes(qLower)) return false
      if (status    && c.status              !== status)    return false
      if (areaNome  && c.area?.nome          !== areaNome)  return false
      if (turnoCode && c.turno?.codigo       !== turnoCode) return false
      return true
    })
  }, [colaboradores, q, status, areaId, turnoId, areas, turnos])

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
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
      </div>

      {/* Contagem */}
      <p className="text-xs text-gray-500">
        {filtradosV2.length} de {colaboradores.length} colaboradores
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
    </div>
  )
}
