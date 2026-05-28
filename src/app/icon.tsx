import { ImageResponse } from "next/og"

export const size = { width: 32, height: 32 }
export const contentType = "image/png"

export default function Icon() {
  const size32 = 32
  const padding = size32 * 0.15
  const oSize = (size32 - padding * 2) * 0.54
  const r = oSize / 2
  const stroke = Math.max(1.5, oSize * 0.11)
  const inner = r - stroke / 2 - 0.5
  const gap = oSize * 0.08
  const totalW = oSize * 2 + gap
  const cx1 = r
  const cx2 = oSize + gap + r
  const cy = r
  const pupilR = Math.max(1.2, oSize * 0.11)
  const pupilDx = oSize * 0.06
  const offsetX = (size32 - totalW) / 2
  const offsetY = (size32 - oSize) / 2

  return new ImageResponse(
    (
      <div
        style={{
          width: size32,
          height: size32,
          background: "#1F4E4A",
          borderRadius: size32 * 0.2,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg
          width={size32}
          height={size32}
          viewBox={`0 0 ${size32} ${size32}`}
        >
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
