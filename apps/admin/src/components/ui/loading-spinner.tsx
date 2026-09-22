"use client"

import { cn } from "@/lib/utils"

interface LoadingSpinnerProps {
  className?: string
  size?: "sm" | "md" | "lg"
  showContainer?: boolean
  text?: string
}

export function LoadingSpinner({ 
  className, 
  size = "md", 
  showContainer = true,
  text 
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-8 w-8", 
    lg: "h-12 w-12"
  }

  const spinner = (
    <div
      className={cn(
        "animate-spin rounded-full border-2 border-primary/20 border-t-primary border-r-primary",
        sizeClasses[size],
        className
      )}
    />
  )

  if (!showContainer) {
    if (text) {
      return (
        <div className="flex flex-col items-center gap-2">
          {spinner}
          {text && <p className="text-sm text-muted-foreground">{text}</p>}
        </div>
      )
    }
    return spinner
  }

  return (
    <div className="flex flex-col items-center justify-center gap-3 min-h-[200px]">
      {spinner}
      {text && <p className="text-sm text-muted-foreground">{text}</p>}
    </div>
  )
}
