"use client"

// Logo.tsx — wordmark bemoo com "oo" como conceito A (Olho atento)
// Uso: <BemooLogo size={48} /> ou <BemooOO size={32} />

interface BemooOOProps {
  size?: number
  color?: string
  accent?: string
  className?: string
}

export function BemooOO({ size = 36, color = "currentColor", accent, className }: BemooOOProps) {
  const r       = size / 2
  const stroke  = Math.max(2, size * 0.11)
  const inner   = r - stroke / 2 - 0.5
  const gap     = size * 0.08
  const totalW  = size * 2 + gap
  const cy      = r
  const cx1     = r
  const cx2     = size + gap + r
  const acc     = accent || color
  const pupilR  = Math.max(1.6, size * 0.11)
  const pupilDx = size * 0.06

  return (
    <svg
      viewBox={`0 0 ${totalW} ${size}`}
      width={totalW}
      height={size}
      style={{ verticalAlign: "baseline", overflow: "visible", flexShrink: 0 }}
      aria-hidden="true"
      className={className}
    >
      {/* O esquerdo */}
      <circle cx={cx1} cy={cy} r={inner} fill="none" stroke={color} strokeWidth={stroke} />
      <circle cx={cx1 + pupilDx} cy={cy} r={pupilR} fill={acc} />
      {/* O direito */}
      <circle cx={cx2} cy={cy} r={inner} fill="none" stroke={color} strokeWidth={stroke} />
      <circle cx={cx2 + pupilDx} cy={cy} r={pupilR} fill={acc} />
    </svg>
  )
}

interface BemooLogoProps {
  size?: number
  color?: string
  accent?: string
  weight?: number
  className?: string
}

export function BemooLogo({
  size = 32,
  color = "currentColor",
  accent,
  weight = 600,
  className,
}: BemooLogoProps) {
  const oSize = size * 0.54

  return (
    <span
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "baseline",
        gap: size * 0.015,
        fontFamily: "var(--font-manrope), system-ui, sans-serif",
        fontWeight: weight,
        fontSize: size,
        letterSpacing: "-0.02em",
        lineHeight: 1,
        color,
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ display: "inline-block" }}>bem</span>
      <BemooOO size={oSize} color={color} accent={accent ?? "#E07A35"} />
    </span>
  )
}

// Ícone quadrado para favicon / app icon (fundo primary, oo branco)
export function BemooIcon({ size = 32 }: { size?: number }) {
  const padding = size * 0.15
  const innerSize = size - padding * 2
  const oSize = innerSize * 0.54
  const r       = oSize / 2
  const stroke  = Math.max(1.5, oSize * 0.11)
  const inner   = r - stroke / 2 - 0.5
  const gap     = oSize * 0.08
  const totalW  = oSize * 2 + gap
  const cx1     = r
  const cx2     = oSize + gap + r
  const cy      = r
  const pupilR  = Math.max(1.2, oSize * 0.11)
  const pupilDx = oSize * 0.06
  const offsetX = (size - totalW) / 2
  const offsetY = (size - oSize) / 2

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} xmlns="http://www.w3.org/2000/svg">
      <rect width={size} height={size} rx={size * 0.2} fill="#1F4E4A" />
      <g transform={`translate(${offsetX}, ${offsetY})`}>
        <circle cx={cx1} cy={cy} r={inner} fill="none" stroke="white" strokeWidth={stroke} />
        <circle cx={cx1 + pupilDx} cy={cy} r={pupilR} fill="#E07A35" />
        <circle cx={cx2} cy={cy} r={inner} fill="none" stroke="white" strokeWidth={stroke} />
        <circle cx={cx2 + pupilDx} cy={cy} r={pupilR} fill="#E07A35" />
      </g>
    </svg>
  )
}
