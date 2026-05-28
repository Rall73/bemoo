import { type InputHTMLAttributes, forwardRef } from "react"
import { cn } from "@/lib/utils"

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  icon?: React.ReactNode
  iconRight?: React.ReactNode
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, icon, iconRight, className, id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined)
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={inputId} className="text-xs font-medium text-gray-700 uppercase tracking-wider">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {icon && (
            <span className="absolute left-3 text-gray-400 pointer-events-none flex items-center">
              {icon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              "w-full rounded-soft border border-gray-200 bg-white text-gray-800",
              "px-3 py-2 text-sm placeholder:text-gray-400",
              "focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "transition-colors duration-150",
              error && "border-error focus:ring-error",
              icon && "pl-9",
              iconRight && "pr-9",
              className
            )}
            {...props}
          />
          {iconRight && (
            <span className="absolute right-3 text-gray-400 pointer-events-none flex items-center">
              {iconRight}
            </span>
          )}
        </div>
        {error && <p className="text-xs text-error">{error}</p>}
        {hint && !error && <p className="text-xs text-gray-400">{hint}</p>}
      </div>
    )
  }
)
Input.displayName = "Input"

export { Input }
