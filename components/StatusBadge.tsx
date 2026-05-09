import { ExpenseStatus, UserRole } from '@/lib/types'
import { STATUS_COLORS, STATUS_LABELS, cn } from '@/lib/utils'

export function StatusBadge({ status }: { status: ExpenseStatus }) {
  return (
    <span className={cn(
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
      STATUS_COLORS[status]
    )}>
      {STATUS_LABELS[status]}
    </span>
  )
}
