import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  ImageRun, AlignmentType, HeadingLevel, BorderStyle, WidthType,
  ShadingType, VerticalAlign, PageNumber, Header, Footer, ExternalHyperlink,
  LevelFormat,
} from "docx"

// ─── Tipos ────────────────────────────────────────────────────────────────

export type FieldType = "OK_NOK" | "SIM_NAO" | "NUMERIC" | "TEXT"

export interface ReportFieldValue {
  valueOkNok:    boolean | null
  valueNumeric:  number  | null
  valueText:     string  | null
  valueNa?:      boolean | null
  photoUrl:      string  | null
  annotation:    string  | null
  transcription: string  | null
}

export interface ReportField {
  id:    number
  label: string
  type:  FieldType
  unit:  string | null
  value: ReportFieldValue | null
}

export interface ReportSection {
  label:  string
  fields: ReportField[]
}

export interface ReportData {
  checklistName:        string
  checklistDescription: string | null
  executorName:         string
  companyName:          string
  startedAt:            Date
  finishedAt:           Date | null
  conclusionNote:       string | null
  sections:             ReportSection[]
}

// ─── Helpers visuais ──────────────────────────────────────────────────────

const COLORS = {
  primary:   "1F4E4A",
  accent:    "E07A35",
  okGreen:   "1A7A4A",
  nokRed:    "C0392B",
  gray:      "6B7280",
  lightGray: "F3F4F6",
  border:    "E5E7EB",
  white:     "FFFFFF",
}

function resposta(field: ReportField): { text: string; color: string } {
  const v = field.value
  if (!v) return { text: "—", color: COLORS.gray }
  if (v.valueNa) return { text: "N/A", color: COLORS.gray }
  if (field.type === "OK_NOK") {
    if (v.valueOkNok === true)  return { text: "✓ OK",  color: COLORS.okGreen }
    if (v.valueOkNok === false) return { text: "✗ NOK", color: COLORS.nokRed }
    return { text: "—", color: COLORS.gray }
  }
  if (field.type === "SIM_NAO") {
    if (v.valueOkNok === true)  return { text: "✓ Sim", color: COLORS.okGreen }
    if (v.valueOkNok === false) return { text: "✗ Não", color: COLORS.nokRed }
    return { text: "—", color: COLORS.gray }
  }
  if (field.type === "NUMERIC") {
    if (v.valueNumeric !== null) return { text: `${v.valueNumeric}${field.unit ? " " + field.unit : ""}`, color: COLORS.primary }
    return { text: "—", color: COLORS.gray }
  }
  if (field.type === "TEXT") {
    return { text: v.valueText?.trim() || "—", color: COLORS.primary }
  }
  return { text: "—", color: COLORS.gray }
}

function formatDate(d: Date) {
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })
}

function formatDateTime(d: Date) {
  return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
}

function duration(start: Date, end: Date | null) {
  if (!end) return "—"
  const mins = Math.round((end.getTime() - start.getTime()) / 60000)
  if (mins < 60) return `${mins} min`
  return `${Math.floor(mins / 60)}h ${mins % 60}min`
}

const border = { style: BorderStyle.SINGLE, size: 1, color: COLORS.border }
const borders = { top: border, bottom: border, left: border, right: border }

// ─── Busca e embed de foto ─────────────────────────────────────────────────

async function fetchImageBuffer(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const ab = await res.arrayBuffer()
    return Buffer.from(ab)
  } catch {
    return null
  }
}

// ─── Geração do documento ──────────────────────────────────────────────────

export async function gerarRelatorioDocx(
  data:    ReportData,
  analise?: string,   // undefined = Relatório 1 (básico); string = Relatório 2 (com IA)
): Promise<Buffer> {

  // Stats de conformidade
  const allFields = data.sections.flatMap((s) => s.fields)
  const answered  = allFields.filter((f) => f.value !== null)
  const okNokFields = allFields.filter((f) => f.type === "OK_NOK" || f.type === "SIM_NAO")
  const conformes   = okNokFields.filter((f) => f.value?.valueOkNok === true).length
  const naoConformes = okNokFields.filter((f) => f.value?.valueOkNok === false).length
  const conformidade = okNokFields.length > 0
    ? Math.round((conformes / okNokFields.length) * 100)
    : null

  const children: Paragraph[] = []

  // ── Título ──────────────────────────────────────────────────────────────
  children.push(
    new Paragraph({
      children: [new TextRun({ text: "RELATÓRIO DE CHECKLIST", bold: true, size: 36, color: COLORS.primary, font: "Arial" })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    }),
    new Paragraph({
      children: [new TextRun({ text: data.checklistName, bold: true, size: 28, color: COLORS.primary, font: "Arial" })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
    }),
  )
  if (analise) {
    children.push(new Paragraph({
      children: [new TextRun({ text: "Com Análise de Conformidade por IA", size: 20, color: COLORS.gray, italics: true, font: "Arial" })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    }))
  } else {
    children.push(new Paragraph({ children: [], spacing: { after: 400 } }))
  }

  // ── Informações da execução ─────────────────────────────────────────────
  const infoRows = [
    ["Empresa",   data.companyName],
    ["Executor",  data.executorName],
    ["Data",      formatDate(data.startedAt)],
    ["Início",    formatDateTime(data.startedAt)],
    ["Término",   data.finishedAt ? formatDateTime(data.finishedAt) : "—"],
    ["Duração",   duration(data.startedAt, data.finishedAt)],
    ...(conformidade !== null ? [["Conformidade", `${conformidade}%  (${conformes} conformes, ${naoConformes} não conformes)`]] : []),
  ]

  const infoTable = new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [2500, 6860],
    rows: infoRows.map(([label, value]) =>
      new TableRow({ children: [
        new TableCell({
          borders, width: { size: 2500, type: WidthType.DXA },
          shading: { fill: "F0F4F4", type: ShadingType.CLEAR },
          margins: { top: 80, bottom: 80, left: 120, right: 120 },
          children: [new Paragraph({ children: [new TextRun({ text: label, bold: true, size: 20, font: "Arial", color: COLORS.primary })] })],
        }),
        new TableCell({
          borders, width: { size: 6860, type: WidthType.DXA },
          margins: { top: 80, bottom: 80, left: 120, right: 120 },
          children: [new Paragraph({ children: [new TextRun({ text: value, size: 20, font: "Arial", color: label === "Conformidade" && naoConformes > 0 ? COLORS.nokRed : "374151" })] })],
        }),
      ]})
    ),
  })

  children.push(infoTable as unknown as Paragraph)
  children.push(new Paragraph({ children: [], spacing: { after: 400 } }))

  // ── Descrição do checklist ──────────────────────────────────────────────
  if (data.checklistDescription) {
    children.push(new Paragraph({
      children: [new TextRun({ text: data.checklistDescription, size: 20, italics: true, color: COLORS.gray, font: "Arial" })],
      spacing: { after: 300 },
    }))
  }

  // ── Itens e campos ─────────────────────────────────────────────────────
  for (const [secIdx, section] of data.sections.entries()) {
    // Cabeçalho da seção
    children.push(new Paragraph({
      children: [
        new TextRun({ text: `${secIdx + 1}.  `, bold: true, size: 24, color: COLORS.primary, font: "Arial" }),
        new TextRun({ text: section.label, bold: true, size: 24, color: COLORS.primary, font: "Arial" }),
      ],
      spacing: { before: 300, after: 100 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: COLORS.primary } },
    }))

    for (const field of section.fields) {
      const resp = resposta(field)

      // Linha do campo
      const fieldRow = new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [6000, 3360],
        rows: [new TableRow({ children: [
          new TableCell({
            borders, width: { size: 6000, type: WidthType.DXA },
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            children: [new Paragraph({ children: [new TextRun({ text: field.label, size: 20, font: "Arial", color: "111827" })] })],
          }),
          new TableCell({
            borders, width: { size: 3360, type: WidthType.DXA },
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            shading: {
              fill: resp.color === COLORS.okGreen ? "F0FDF4"
                  : resp.color === COLORS.nokRed  ? "FEF2F2"
                  : COLORS.white,
              type: ShadingType.CLEAR,
            },
            children: [new Paragraph({
              children: [new TextRun({ text: resp.text, bold: true, size: 20, font: "Arial", color: resp.color })],
              alignment: AlignmentType.CENTER,
            })],
          }),
        ]})],
      })
      children.push(fieldRow as unknown as Paragraph)

      // Anotação
      if (field.value?.annotation?.trim()) {
        children.push(new Paragraph({
          children: [
            new TextRun({ text: "Anotação: ", bold: true, size: 18, color: COLORS.gray, font: "Arial" }),
            new TextRun({ text: field.value.annotation, size: 18, color: "374151", font: "Arial" }),
          ],
          indent: { left: 300 },
          spacing: { before: 60 },
        }))
      }

      // Transcrição de áudio
      if (field.value?.transcription?.trim()) {
        children.push(new Paragraph({
          children: [
            new TextRun({ text: "Áudio: ", bold: true, size: 18, color: COLORS.gray, font: "Arial" }),
            new TextRun({ text: field.value.transcription, size: 18, color: "374151", italics: true, font: "Arial" }),
          ],
          indent: { left: 300 },
          spacing: { before: 60 },
        }))
      }

      // Foto
      if (field.value?.photoUrl) {
        const imgBuf = await fetchImageBuffer(field.value.photoUrl)
        if (imgBuf) {
          children.push(new Paragraph({
            children: [
              new ImageRun({
                type: "png",
                data: imgBuf,
                transformation: { width: 200, height: 150 },
                altText: { title: "Foto", description: field.label, name: field.label },
              }),
            ],
            indent: { left: 300 },
            spacing: { before: 80, after: 80 },
          }))
        } else {
          // Foto não pôde ser baixada: inserir link
          children.push(new Paragraph({
            children: [
              new TextRun({ text: "Foto: ", bold: true, size: 18, color: COLORS.gray, font: "Arial" }),
              new ExternalHyperlink({
                link: field.value.photoUrl,
                children: [new TextRun({ text: "Ver foto", size: 18, color: COLORS.primary, style: "Hyperlink", font: "Arial" })],
              }),
            ],
            indent: { left: 300 },
            spacing: { before: 60 },
          }))
        }
      }
    }

    children.push(new Paragraph({ children: [], spacing: { after: 200 } }))
  }

  // ── Observação final ────────────────────────────────────────────────────
  if (data.conclusionNote?.trim()) {
    children.push(new Paragraph({
      children: [new TextRun({ text: "OBSERVAÇÃO FINAL", bold: true, size: 22, color: COLORS.primary, font: "Arial" })],
      border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: COLORS.primary } },
      spacing: { before: 300, after: 150 },
    }))
    children.push(new Paragraph({
      children: [new TextRun({ text: data.conclusionNote, size: 20, color: "374151", font: "Arial" })],
      spacing: { after: 400 },
    }))
  }

  // ── Análise por IA (Relatório 2) ────────────────────────────────────────
  if (analise?.trim()) {
    children.push(new Paragraph({
      children: [new TextRun({ text: "ANÁLISE DE CONFORMIDADE", bold: true, size: 24, color: COLORS.primary, font: "Arial" })],
      border: {
        top:    { style: BorderStyle.SINGLE, size: 6, color: COLORS.primary },
        bottom: { style: BorderStyle.SINGLE, size: 6, color: COLORS.primary },
      },
      spacing: { before: 400, after: 200 },
    }))
    children.push(new Paragraph({
      children: [new TextRun({ text: "Gerado por Inteligência Artificial com base nas respostas desta execução.", size: 16, italics: true, color: COLORS.gray, font: "Arial" })],
      spacing: { after: 200 },
    }))

    // Renderiza parágrafos da análise (separa por \n\n ou \n)
    const paras = analise.split(/\n+/).filter((p) => p.trim())
    for (const para of paras) {
      const isBullet = para.trimStart().startsWith("•") || para.trimStart().startsWith("-") || /^\d+\./.test(para.trimStart())
      children.push(new Paragraph({
        children: [new TextRun({ text: para.replace(/^[-•]\s*/, "").trim(), size: 20, color: "1F2937", font: "Arial" })],
        ...(isBullet ? {
          numbering: { reference: "bullets", level: 0 },
        } : {}),
        spacing: { after: 120 },
      }))
    }

    // Rodapé da análise
    children.push(new Paragraph({
      children: [new TextRun({ text: `Análise gerada em ${formatDateTime(new Date())}`, size: 16, italics: true, color: COLORS.gray, font: "Arial" })],
      spacing: { before: 200 },
      alignment: AlignmentType.RIGHT,
    }))
  }

  // ── Assinatura ──────────────────────────────────────────────────────────
  children.push(new Paragraph({ children: [], spacing: { before: 600 } }))
  children.push(new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [4000, 1360, 4000],
    rows: [
      new TableRow({ children: [
        new TableCell({
          borders: { top: border, bottom: { style: BorderStyle.NIL }, left: { style: BorderStyle.NIL }, right: { style: BorderStyle.NIL } },
          width: { size: 4000, type: WidthType.DXA },
          margins: { top: 80, bottom: 80 },
          children: [new Paragraph({ children: [new TextRun({ text: data.executorName, size: 18, font: "Arial", color: "374151" })], alignment: AlignmentType.CENTER })],
        }),
        new TableCell({
          borders: { top: { style: BorderStyle.NIL }, bottom: { style: BorderStyle.NIL }, left: { style: BorderStyle.NIL }, right: { style: BorderStyle.NIL } },
          width: { size: 1360, type: WidthType.DXA },
          children: [new Paragraph({ children: [] })],
        }),
        new TableCell({
          borders: { top: border, bottom: { style: BorderStyle.NIL }, left: { style: BorderStyle.NIL }, right: { style: BorderStyle.NIL } },
          width: { size: 4000, type: WidthType.DXA },
          margins: { top: 80, bottom: 80 },
          children: [new Paragraph({ children: [new TextRun({ text: formatDate(new Date()), size: 18, font: "Arial", color: "374151" })], alignment: AlignmentType.CENTER })],
        }),
      ]}),
      new TableRow({ children: [
        new TableCell({
          borders: { top: { style: BorderStyle.NIL }, bottom: { style: BorderStyle.NIL }, left: { style: BorderStyle.NIL }, right: { style: BorderStyle.NIL } },
          width: { size: 4000, type: WidthType.DXA },
          margins: { top: 40 },
          children: [new Paragraph({ children: [new TextRun({ text: "Executor", size: 16, color: COLORS.gray, font: "Arial" })], alignment: AlignmentType.CENTER })],
        }),
        new TableCell({
          borders: { top: { style: BorderStyle.NIL }, bottom: { style: BorderStyle.NIL }, left: { style: BorderStyle.NIL }, right: { style: BorderStyle.NIL } },
          width: { size: 1360, type: WidthType.DXA },
          children: [new Paragraph({ children: [] })],
        }),
        new TableCell({
          borders: { top: { style: BorderStyle.NIL }, bottom: { style: BorderStyle.NIL }, left: { style: BorderStyle.NIL }, right: { style: BorderStyle.NIL } },
          width: { size: 4000, type: WidthType.DXA },
          margins: { top: 40 },
          children: [new Paragraph({ children: [new TextRun({ text: "Data", size: 16, color: COLORS.gray, font: "Arial" })], alignment: AlignmentType.CENTER })],
        }),
      ]}),
    ],
  }) as unknown as Paragraph)

  // ── Documento ────────────────────────────────────────────────────────────
  const doc = new Document({
    numbering: {
      config: [{
        reference: "bullets",
        levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }],
      }],
    },
    sections: [{
      properties: {
        page: {
          size: { width: 11906, height: 16838 },  // A4
          margin: { top: 1134, right: 1134, bottom: 1134, left: 1134 },
        },
      },
      headers: {
        default: new Header({
          children: [new Paragraph({
            children: [
              new TextRun({ text: "bemoo", bold: true, size: 18, color: COLORS.primary, font: "Arial" }),
              new TextRun({ text: `  ·  ${data.checklistName}  ·  ${data.companyName}`, size: 16, color: COLORS.gray, font: "Arial" }),
            ],
            border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: COLORS.border } },
          })],
        }),
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            children: [
              new TextRun({ text: "Página ", size: 16, color: COLORS.gray, font: "Arial" }),
              new TextRun({ children: [PageNumber.CURRENT], size: 16, color: COLORS.gray, font: "Arial" }),
              new TextRun({ text: " de ", size: 16, color: COLORS.gray, font: "Arial" }),
              new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, color: COLORS.gray, font: "Arial" }),
            ],
            alignment: AlignmentType.RIGHT,
            border: { top: { style: BorderStyle.SINGLE, size: 2, color: COLORS.border } },
          })],
        }),
      },
      children,
    }],
  })

  return Packer.toBuffer(doc)
}
