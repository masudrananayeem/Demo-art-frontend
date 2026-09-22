"use client"

import { Badge } from "@/components/ui/badge"
import { getStatusVariant } from "@/lib/admin-utils"
import { cn } from "@/lib/utils"

interface StatusBadgeProps {
  status: string
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const variant = getStatusVariant(status)
  
  return (
    <Badge variant={variant} className={cn("capitalize", className)}>
      {status}
    </Badge>
  )
}
