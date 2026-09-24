import { AlertTriangle, CheckCircle2, CircleMinus, Info } from 'lucide-react'
import { cn } from '../lib/utils'
import type { DoseStatus } from '../lib/types'

type Props = { status: DoseStatus; label: string; compact?: boolean }

export function StatusBadge({ status, label, compact = false }: Props) {
  const Icon = status === 'ok' ? CheckCircle2 : status === 'low' || status === 'high' ? AlertTriangle : status === 'neutral' ? Info : CircleMinus
  return (
    <span className={cn('status-badge', `status-${status}`, compact && 'is-compact')}>
      <Icon className={compact ? 'size-3.5' : 'size-4'} />
      {label}
    </span>
  )
}
