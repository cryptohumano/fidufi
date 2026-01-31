/**
 * Componente de barra de progreso
 * Basado en shadcn/ui
 */

import * as React from "react"
import { cn } from "../../lib/utils"

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number
  max?: number
  showLabel?: boolean
  status?: 'safe' | 'warning' | 'critical'
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value, max = 100, showLabel = true, status, ...props }, ref) => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100)
    
    const getStatusColor = () => {
      if (status === 'critical') return 'bg-red-500'
      if (status === 'warning') return 'bg-yellow-500'
      return 'bg-green-500'
    }
    
    const getStatusBgColor = () => {
      if (status === 'critical') return 'bg-red-100'
      if (status === 'warning') return 'bg-yellow-100'
      return 'bg-green-100'
    }

    return (
      <div ref={ref} className={cn("w-full", className)} {...props}>
        {showLabel && (
          <div className="flex justify-between text-sm mb-1">
            <span className="text-muted-foreground">{value.toFixed(1)}%</span>
            <span className="text-muted-foreground">Límite: {max}%</span>
          </div>
        )}
        <div className={cn("h-3 w-full overflow-hidden rounded-full", getStatusBgColor())}>
          <div
            className={cn("h-full transition-all duration-300", getStatusColor())}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    )
  }
)
Progress.displayName = "Progress"

export { Progress }
