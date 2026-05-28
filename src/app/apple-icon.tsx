import { ImageResponse } from "next/og"

export const size = { width: 180, height: 180 }
export const contentType = "image/png"

export default function AppleIcon() {
  const s = 180
  const padding = s * 0.14
  const oSize = (s - padding * 2) * 0.58
  const r = oSize / 2
  const stroke = Math.max(8, oSize * 0.11)
  const inner = r - stroke / 2 - 1
  const gap = oSize * 0.08
  const totalW = oSize * 2 + gap
  const cx1 = r
  const cx2 = oSize + gap + r
  const cy = r
  const pupilR = Math.max(6, oSize * 0.11)
  const pupilDx = oSize * 0.06
  const offsetX = (s - totalW) / 2
  const offsetY = (s - oSize) / 2

  return new ImageResponse(
    (
      <div
        style={{
          width: s,
          height: s,
          background: "#1F4E4A",
          borderRadius: s * 0.2,
          display: "flex",
        }}
      >
        <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
          <g transform={`translate(${offsetX}, ${offsetY})`}>
            <circle cx={cx1} cy={cy} r={inner} fill="none" stroke="white" strokeWidth={stroke} />
            <circle cx={cx1 + pupilDx} cy={cy} r={pupilR} fill="#E07A35" />
            <circle cx={cx2} cy={cy} r={inner} fill="none" stroke="white" strokeWidth={stroke} />
            <circle cx={cx2 + pupilDx} cy={cy} r={pupilR} fill="#E07A35" />
          </g>
        </svg>
      </div>
    ),
    { ...size }
  )
}
