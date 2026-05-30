"use client"

import { useState, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft, CheckCircle, XCircle, Camera, X,
  Loader2, ChevronDown, ChevronUp, MessageSquare,
  Mic, MicOff, Square,
} from "lucide-react"
import { cn } from "@/lib/utils"

type FieldType = "OK_NOK" | "SIM_NAO" | "NUMERIC" | "TEXT"

interface Field {
  id:           number
  label:        string
  type:         FieldType
  unit:         string | null
  required:     boolean
  requirePhoto: boolean
}

interface Item {
  id:     number
  label:  string
  fields: Field[]
}

interface FieldValue {
  valueOkNok:   boolean | null | undefined
  valueNumeric: number | null | undefined
  valueText:    string | null | undefined
  photoUrl:     string | null | undefined
  annotation:   string | null | undefined
  transcription: string | null | undefined
}

interface ExecutionData {
  id:            number
  checklistName: string
  executorName:  string
  startedAt:     string
  items:         Item[]
  savedValues:   Record<number, FieldValue>
}

export function ExecutionForm({ execution }: { execution: ExecutionData }) {
  const router = useRouter()

  // ─── Estado dos valores ───────────────────────────────────────────
  const [values, setValues] = useState<Record<number, FieldValue>>(
    execution.savedValues ?? {}
  )
  const [conclusionNote, setConclusionNote] = useState("")

  function getVal(fieldId: number): FieldValue {
    return values[fieldId] ?? {}
  }

  function setVal(fieldId: number, patch: Partial<FieldValue>) {
    setValues((prev) => ({ ...prev, [fieldId]: { ...getVal(fieldId), ...patch } }))
  }

  // ─── Upload de foto — idêntico ao ExecutionForm do projeto check-list ──────
  const photoInputRef      = useRef<HTMLInputElement>(null)
  const [pendingPhotoKey,  setPendingPhotoKey]  = useState("")   // string key "fieldId"
  const [photoUrls,        setPhotoUrls]        = useState<Record<string, string>>({})
  const [photoLoading,     setPhotoLoading]     = useState<Record<string, boolean>>({})
  const [photoError,       setPhotoError]       = useState("")

  function openCamera(fieldId: number) {
    setPendingPhotoKey(String(fieldId))
    setPhotoError("")
    photoInputRef.current!.value = ""
    photoInputRef.current!.click()
  }

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !pendingPhotoKey) return

    setPhotoLoading((prev) => ({ ...prev, [pendingPhotoKey]: true }))
    setPhotoError("")

    const formData = new FormData()
    formData.append("file", file)

    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData })
      if (res.ok) {
        const { url } = await res.json()
        setPhotoUrls((prev) => ({ ...prev, [pendingPhotoKey]: url }))
      } else {
        const json = await res.json().catch(() => ({}))
        setPhotoError(json.error ?? "Erro ao enviar a foto. Tente novamente.")
      }
    } catch {
      setPhotoError("Erro de conexão ao enviar a foto.")
    } finally {
      setPhotoLoading((prev) => ({ ...prev, [pendingPhotoKey]: false }))
    }
  }

  function removePhoto(key: string) {
    setPhotoUrls((prev) => { const n = { ...prev }; delete n[key]; return n })
  }

  // ─── Gravação de áudio ────────────────────────────────────────────
  // Padrão idêntico ao NovaDemandaForm do projeto check-list (que funciona em produção)
  const mediaRecorderRef  = useRef<MediaRecorder | null>(null)
  const audioChunksRef    = useRef<Blob[]>([])
  const streamRef         = useRef<MediaStream | null>(null)   // ← ref separada para o stream
  const [recordingFor,    setRecordingFor]    = useState<number | "conclusion" | null>(null)
  const [recordingSecs,   setRecordingSecs]   = useState(0)
  const recordingTimer    = useRef<ReturnType<typeof setInterval> | null>(null)
  const [transcribingFor, setTranscribingFor] = useState<number | "conclusion" | null>(null)
  const [audioError,      setAudioError]      = useState("")

  const startRecording = useCallback(async (target: number | "conclusion") => {
    setAudioError("")
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      // Detecta o mimeType suportado pelo browser (idêntico ao NovaDemandaForm)
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/mp4")
        ? "audio/mp4"
        : ""

      const mr = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
      mediaRecorderRef.current = mr
      audioChunksRef.current   = []

      mr.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data) }

      mr.onstop = async () => {
        streamRef.current?.getTracks().forEach((t) => t.stop())
        const blob = new Blob(audioChunksRef.current, { type: mr.mimeType || "audio/webm" })

        const ext      = (mr.mimeType || "").includes("mp4") ? "mp4" : "webm"
        const file     = new File([blob], `audio.${ext}`, { type: blob.type })
        const formData = new FormData()
        formData.append("audio", file)

        setTranscribingFor(target)
        try {
          const res  = await fetch("/api/transcribe", { method: "POST", body: formData })
          const json = await res.json()
          if (res.ok && json.data?.text) {
            if (target === "conclusion") {
              setConclusionNote((prev) => prev ? prev + " " + json.data.text : json.data.text)
            } else {
              setVal(target as number, { transcription: json.data.text })
              setShowAnnotation((prev) => ({ ...prev, [target as number]: true }))
            }
          } else {
            setAudioError("Não foi possível transcrever o áudio.")
          }
        } catch {
          setAudioError("Erro de conexão ao transcrever.")
        } finally {
          setTranscribingFor(null)
        }
      }

      mr.start(1000)   // ← coleta chunks a cada 1s (igual ao original)
      setRecordingFor(target)
      setRecordingSecs(0)
      recordingTimer.current = setInterval(() => setRecordingSecs((s) => s + 1), 1000)
    } catch (err: any) {
      if (err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError") {
        setAudioError("Permissão de microfone negada. Clique no cadeado 🔒 na barra de endereço do navegador → Microfone → Permitir → recarregue a página.")
      } else if (err?.name === "NotFoundError") {
        setAudioError("Nenhum microfone encontrado neste dispositivo.")
      } else {
        setAudioError("Não foi possível acessar o microfone.")
      }
    }
  }, [])

  const stopRecording = useCallback(() => {
    if (recordingTimer.current) clearInterval(recordingTimer.current)
    mediaRecorderRef.current?.stop()
    setRecordingFor(null)
    setRecordingSecs(0)
  }, [])

  function formatSecs(s: number) {
    return `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`
  }

  // ─── Anotação por campo (toggle) ──────────────────────────────────
  const [showAnnotation, setShowAnnotation] = useState<Record<number, boolean>>({})

  function toggleAnnotation(fieldId: number) {
    setShowAnnotation((prev) => ({ ...prev, [fieldId]: !prev[fieldId] }))
  }

  // ─── Progresso ───────────────────────────────────────────────────
  const allFields    = execution.items.flatMap((i) => i.fields)
  const required     = allFields.filter((f) => f.required)
  const filledReq    = required.filter((f) => {
    const v = getVal(f.id)
    if (f.type === "OK_NOK" || f.type === "SIM_NAO") return v.valueOkNok !== null && v.valueOkNok !== undefined
    if (f.type === "NUMERIC") return v.valueNumeric !== null && v.valueNumeric !== undefined
    if (f.type === "TEXT") return !!v.valueText?.trim()
    return false
  })
  const progress = required.length > 0 ? Math.round((filledReq.length / required.length) * 100) : 100

  // ─── Itens colapsáveis ────────────────────────────────────────────
  const [collapsed, setCollapsed] = useState<Record<number, boolean>>({})
  function toggleItem(id: number) {
    setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  // ─── Finalizar ───────────────────────────────────────────────────
  const [saving,    setSaving]    = useState(false)
  const [saveError, setSaveError] = useState("")

  async function handleFinalizar() {
    setSaveError("")

    // Validação frontend
    for (const field of required) {
      const v = getVal(field.id)
      if (field.type === "OK_NOK" || field.type === "SIM_NAO") {
        if (v.valueOkNok === null || v.valueOkNok === undefined) {
          setSaveError(`Obrigatório: "${field.label}"`)
          return
        }
      }
      if (field.type === "NUMERIC" && (v.valueNumeric === null || v.valueNumeric === undefined)) {
        setSaveError(`Obrigatório: "${field.label}"`)
        return
      }
      if (field.type === "TEXT" && !v.valueText?.trim()) {
        setSaveError(`Obrigatório: "${field.label}"`)
        return
      }
      if (field.requirePhoto && !photoUrls[String(field.id)]) {
        setSaveError(`Foto obrigatória: "${field.label}"`)
        return
      }
    }

    setSaving(true)
    try {
      const fieldValues = allFields.map((f) => {
        const v = getVal(f.id)
        return {
          fieldId:      f.id,
          valueOkNok:   (f.type === "OK_NOK" || f.type === "SIM_NAO") ? (v.valueOkNok ?? null) : null,
          valueNumeric: f.type === "NUMERIC" ? (v.valueNumeric ?? null) : null,
          valueText:    f.type === "TEXT" ? (v.valueText ?? null) : null,
          photoUrl:     photoUrls[String(f.id)] ?? null,   // ← usa photoUrls separado
          annotation:   v.annotation ?? null,
          transcription: v.transcription ?? null,
        }
      })

      const res  = await fetch(`/api/execucoes/${execution.id}/finalizar`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ fieldValues, conclusionNote: conclusionNote || null }),
      })
      const json = await res.json()

      if (res.ok) {
        router.push(`/execucoes/${execution.id}/resultado`)
      } else {
        setSaveError(json.message ?? "Erro ao finalizar.")
      }
    } catch {
      setSaveError("Erro de conexão. Tente novamente.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-3">
      {/* Input de foto — único, reutilizado */}
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handlePhotoChange}
      />

      {/* Header */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
        <Link href="/checklists" className="hover:text-primary flex items-center gap-1">
          <ArrowLeft size={14} strokeWidth={2} /> Checklists
        </Link>
      </div>

      <div className="bg-white border border-gray-200 rounded-round p-4">
        <h1 className="text-base font-semibold text-gray-900">{execution.checklistName}</h1>
        <p className="text-xs text-gray-400 mt-0.5">
          {execution.executorName} · iniciado às {new Date(execution.startedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
        </p>

        {/* Barra de progresso */}
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
            <span>{filledReq.length} de {required.length} obrigatórios preenchidos</span>
            <span className="font-medium">{progress}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-1.5">
            <div
              className={cn(
                "h-1.5 rounded-full transition-all",
                progress === 100 ? "bg-success" : "bg-primary"
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Itens */}
      {execution.items.map((item) => {
        const isCollapsed = !!collapsed[item.id]
        const itemFields  = item.fields
        const itemFilled  = itemFields.filter((f) => {
          if (!f.required) return true
          const v = getVal(f.id)
          if (f.type === "OK_NOK" || f.type === "SIM_NAO") return v.valueOkNok !== null && v.valueOkNok !== undefined
          if (f.type === "NUMERIC") return v.valueNumeric !== null && v.valueNumeric !== undefined
          if (f.type === "TEXT") return !!v.valueText?.trim()
          return true
        }).length
        const itemComplete = itemFilled === itemFields.length

        return (
          <div key={item.id} className="bg-white border border-gray-200 rounded-round overflow-hidden">
            {/* Cabeçalho do item */}
            <button
              onClick={() => toggleItem(item.id)}
              className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 border-b border-gray-200 text-left"
            >
              <div className={cn(
                "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors",
                itemComplete ? "bg-success border-success" : "border-gray-300"
              )}>
                {itemComplete && <CheckCircle size={12} className="text-white" strokeWidth={3} />}
              </div>
              <span className="flex-1 text-sm font-semibold text-gray-800">{item.label}</span>
              <span className="text-xs text-gray-400">{itemFilled}/{itemFields.length}</span>
              {isCollapsed ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronUp size={16} className="text-gray-400" />}
            </button>

            {/* Campos */}
            {!isCollapsed && (
              <div className="divide-y divide-gray-100">
                {itemFields.map((field) => {
                  const val             = getVal(field.id)
                  const photoKey        = String(field.id)
                  const photoUrl        = photoUrls[photoKey]
                  const isPhotoLoading  = photoLoading[photoKey]
                  const showAnn         = showAnnotation[field.id]

                  return (
                    <div key={field.id} className="px-4 py-4 space-y-3">
                      {/* Label */}
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-medium text-gray-800 flex-1">
                          {field.label}
                          {field.required && <span className="text-error ml-0.5">*</span>}
                          {field.requirePhoto && (
                            <span className="ml-1.5 text-[10px] bg-yellow-50 text-yellow-700 px-1.5 py-0.5 rounded">📷 obrigatória</span>
                          )}
                        </p>
                        {field.type === "NUMERIC" && field.unit && (
                          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">{field.unit}</span>
                        )}
                      </div>

                      {/* Input por tipo */}
                      {(field.type === "OK_NOK" || field.type === "SIM_NAO") && (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setVal(field.id, { valueOkNok: true })}
                            className={cn(
                              "flex-1 flex items-center justify-center gap-2 py-3.5 rounded-soft text-sm font-semibold border-2 transition-all",
                              val.valueOkNok === true
                                ? "bg-success text-white border-success shadow-sm"
                                : "bg-white text-gray-400 border-gray-200 hover:border-success hover:text-success"
                            )}
                          >
                            <CheckCircle size={18} strokeWidth={2.5} />
                            {field.type === "OK_NOK" ? "OK" : "Sim"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setVal(field.id, { valueOkNok: false })}
                            className={cn(
                              "flex-1 flex items-center justify-center gap-2 py-3.5 rounded-soft text-sm font-semibold border-2 transition-all",
                              val.valueOkNok === false
                                ? "bg-error text-white border-error shadow-sm"
                                : "bg-white text-gray-400 border-gray-200 hover:border-error hover:text-error"
                            )}
                          >
                            <XCircle size={18} strokeWidth={2.5} />
                            {field.type === "OK_NOK" ? "NOK" : "Não"}
                          </button>
                        </div>
                      )}

                      {field.type === "NUMERIC" && (
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            inputMode="decimal"
                            step="any"
                            value={val.valueNumeric ?? ""}
                            onChange={(e) => setVal(field.id, {
                              valueNumeric: e.target.value ? parseFloat(e.target.value) : null
                            })}
                            placeholder="0"
                            className="w-36 px-4 py-3 border-2 border-gray-200 rounded-soft text-lg text-gray-800 bg-white focus:outline-none focus:border-primary text-right font-medium"
                          />
                          {field.unit && (
                            <span className="text-sm text-gray-500 font-medium">{field.unit}</span>
                          )}
                        </div>
                      )}

                      {field.type === "TEXT" && (
                        <textarea
                          value={val.valueText ?? ""}
                          onChange={(e) => setVal(field.id, { valueText: e.target.value })}
                          rows={2}
                          placeholder="Digite aqui..."
                          className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-soft text-sm text-gray-800 bg-white focus:outline-none focus:border-primary resize-none"
                        />
                      )}

                      {/* Foto + Anotação */}
                      <div className="flex items-center gap-3 pt-1">
                        {/* Foto — idêntico ao ExecutionForm do check-list */}
                        {photoUrl ? (
                          <div className="flex items-center gap-2">
                            <a href={photoUrl} target="_blank" rel="noopener noreferrer">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={photoUrl}
                                alt="Foto"
                                className="w-14 h-14 rounded-soft object-cover border border-gray-200"
                              />
                            </a>
                            <button
                              type="button"
                              onClick={() => removePhoto(photoKey)}
                              className="flex items-center gap-1 text-xs text-error hover:text-error/80"
                            >
                              <X size={12} /> Remover
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => openCamera(field.id)}
                            disabled={isPhotoLoading}
                            className={cn(
                              "flex items-center gap-1.5 text-xs py-1.5 px-2.5 rounded-soft border transition-colors",
                              field.requirePhoto
                                ? "border-yellow-300 text-yellow-700 bg-yellow-50 hover:bg-yellow-100"
                                : "border-gray-200 text-gray-400 hover:text-primary hover:border-primary-200"
                            )}
                          >
                            {isPhotoLoading ? (
                              <Loader2 size={13} className="animate-spin" />
                            ) : (
                              <Camera size={13} strokeWidth={2} />
                            )}
                            {isPhotoLoading ? "Enviando..." : field.requirePhoto ? "Tirar foto *" : "Foto"}
                          </button>
                        )}

                        {/* Áudio */}
                        {recordingFor === field.id ? (
                          <button
                            type="button"
                            onClick={stopRecording}
                            className="flex items-center gap-1.5 text-xs py-1.5 px-2.5 rounded-soft border border-error text-error bg-red-50 animate-pulse"
                          >
                            <Square size={13} strokeWidth={2} />
                            {formatSecs(recordingSecs)}
                          </button>
                        ) : transcribingFor === field.id ? (
                          <span className="flex items-center gap-1.5 text-xs py-1.5 px-2.5 rounded-soft border border-gray-200 text-gray-400">
                            <Loader2 size={13} className="animate-spin" /> Transcrevendo...
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => startRecording(field.id)}
                            disabled={!!recordingFor}
                            className={cn(
                              "flex items-center gap-1.5 text-xs py-1.5 px-2.5 rounded-soft border transition-colors",
                              val.transcription
                                ? "border-primary-200 text-primary bg-primary-50"
                                : "border-gray-200 text-gray-400 hover:text-primary hover:border-primary-200 disabled:opacity-40"
                            )}
                          >
                            <Mic size={13} strokeWidth={2} />
                            {val.transcription ? "Regravar" : "Áudio"}
                          </button>
                        )}

                        {/* Anotação toggle */}
                        <button
                          type="button"
                          onClick={() => toggleAnnotation(field.id)}
                          className={cn(
                            "flex items-center gap-1.5 text-xs py-1.5 px-2.5 rounded-soft border transition-colors",
                            showAnn || val.annotation
                              ? "border-primary-200 text-primary bg-primary-50"
                              : "border-gray-200 text-gray-400 hover:text-primary hover:border-primary-200"
                          )}
                        >
                          <MessageSquare size={13} strokeWidth={2} />
                          {val.annotation ? "Ver anotação" : "Anotar"}
                        </button>
                      </div>

                      {/* Transcrição do áudio */}
                      {val.transcription && (
                        <div className="bg-primary-50/40 border border-primary-100 rounded-soft px-3 py-2 space-y-1">
                          <p className="text-[10px] font-medium text-primary flex items-center gap-1">
                            <Mic size={10} /> Transcrição do áudio
                          </p>
                          <textarea
                            value={val.transcription ?? ""}
                            onChange={(e) => setVal(field.id, { transcription: e.target.value })}
                            rows={2}
                            className="w-full text-sm text-gray-800 bg-transparent focus:outline-none resize-none"
                          />
                        </div>
                      )}

                      {/* Campo de anotação */}
                      {(showAnn || val.annotation) && (
                        <textarea
                          value={val.annotation ?? ""}
                          onChange={(e) => setVal(field.id, { annotation: e.target.value })}
                          rows={2}
                          placeholder="Anotação opcional sobre este campo..."
                          className="w-full px-3 py-2 border border-primary-200 rounded-soft text-sm text-gray-800 bg-primary-50/30 focus:outline-none focus:border-primary resize-none"
                        />
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}

      {/* Observação final */}
      <div className="bg-white border border-gray-200 rounded-round p-4 space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">Observação final (opcional)</label>

          {recordingFor === "conclusion" ? (
            <button
              type="button"
              onClick={stopRecording}
              className="flex items-center gap-1.5 text-xs py-1.5 px-2.5 rounded-soft border border-error text-error bg-red-50 animate-pulse"
            >
              <Square size={13} strokeWidth={2} />
              {formatSecs(recordingSecs)} — parar
            </button>
          ) : transcribingFor === "conclusion" ? (
            <span className="flex items-center gap-1.5 text-xs text-gray-400">
              <Loader2 size={13} className="animate-spin" /> Transcrevendo...
            </span>
          ) : (
            <button
              type="button"
              onClick={() => startRecording("conclusion")}
              disabled={!!recordingFor}
              className="flex items-center gap-1.5 text-xs py-1.5 px-2.5 rounded-soft border border-gray-200 text-gray-400 hover:text-primary hover:border-primary-200 transition-colors disabled:opacity-40"
            >
              <Mic size={13} strokeWidth={2} /> Gravar áudio
            </button>
          )}
        </div>

        <textarea
          value={conclusionNote}
          onChange={(e) => setConclusionNote(e.target.value)}
          rows={3}
          placeholder="Observações gerais sobre esta execução... ou use o microfone acima."
          className="w-full px-3 py-2.5 border border-gray-200 rounded-soft text-sm text-gray-800 bg-white focus:outline-none focus:border-primary resize-none"
        />
      </div>

      {/* Erros */}
      {photoError && (
        <div className="bg-red-50 border border-red-200 rounded-soft px-4 py-3 text-sm text-error">
          📷 {photoError}
        </div>
      )}
      {audioError && (
        <div className="bg-amber-50 border border-amber-200 rounded-soft px-4 py-3 text-sm text-amber-800">
          🎤 {audioError}
        </div>
      )}
      {saveError && (
        <div className="bg-red-50 border border-red-200 rounded-soft px-4 py-3 text-sm text-error">
          {saveError}
        </div>
      )}

      {/* Botão fixo no fundo */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 flex gap-3 z-10">
        <Link
          href="/checklists"
          className="flex-shrink-0 px-4 py-3 text-sm text-gray-500 border border-gray-200 rounded-soft hover:bg-gray-50 transition-colors"
        >
          Cancelar
        </Link>
        <button
          onClick={handleFinalizar}
          disabled={saving || progress < 100}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-3 rounded-soft text-sm font-semibold transition-all",
            progress === 100
              ? "bg-primary text-white hover:bg-primary/90 shadow-sm"
              : "bg-gray-100 text-gray-400 cursor-not-allowed"
          )}
        >
          {saving ? (
            <><Loader2 size={16} className="animate-spin" /> Finalizando...</>
          ) : (
            <><CheckCircle size={16} strokeWidth={2.5} />
            {progress === 100 ? "Finalizar execução" : `${filledReq.length}/${required.length} obrigatórios`}
            </>
          )}
        </button>
      </div>
    </div>
  )
}
