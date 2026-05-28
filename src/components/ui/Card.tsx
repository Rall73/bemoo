import { cn } from "@/lib/utils"

interface CardProps {
  children: React.ReactNode
  className?: string
  padding?: "none" | "sm" | "md" | "lg"
  hover?: boolean
}

const paddingClasses = {
  none: "",
  sm:   "p-3",
  md:   "p-4",
  lg:   "p-6",
}

export function Card({ children, className, padding = "md", hover = false }: CardProps) {
  return (
    <div
      className={cn(
        "bg-white rounded-round border border-gray-200",
        paddingClasses[padding],
        hover && "transition-shadow hover:shadow-md cursor-pointer",
        className
      )}
    >
      {children}
    </div>
  )
}

export function CardHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-center justify-between gap-3 mb-4", className)}>
      {children}
    </div>
  )
}

export function CardTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <h3 className={cn("font-semibold text-gray-900 text-sm", className)}>
      {children}
    </h3>
  )
}
