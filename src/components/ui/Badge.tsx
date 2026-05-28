import { cn } from "@/lib/utils"

type Tone = "neutral" | "primary" | "success" | "warn" | "error" | "accent"

interface BadgeProps {
  tone?: Tone
  children: React.ReactNode
  className?: string
  dot?: boolean
}

const toneClasses: Record<Tone, { wrap: string; dot: string }> = {
  neutral: {
    wrap: "bg-gray-100 text-gray-700",
    dot:  "bg-gray-400",
  },
  primary: {
    wrap: "bg-primary-100 text-primary",
    dot:  "bg-primary",
  },
  success: {
    wrap: "bg-green-50 text-success",
    dot:  "bg-success",
  },
  warn: {
    wrap: "bg-yellow-50 text-warn",
    dot:  "bg-warn",
  },
  error: {
    wrap: "bg-red-50 text-error",
    dot:  "bg-error",
  },
  accent: {
    wrap: "bg-accent-100 text-accent",
    dot:  "bg-accent",
  },
}

export function Badge({ tone = "neutral", children, className, dot = true }: BadgeProps) {
  const { wrap, dot: dotColor } = toneClasses[tone]
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        wrap,
        className
      )}
    >
      {dot && (
        <span className={cn("h-1.5 w-1.5 rounded-full flex-shrink-0", dotColor)} />
      )}
      {children}
    </span>
  )
}
