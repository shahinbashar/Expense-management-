export type UserRole = 'super_admin' | 'admin' | 'editor'

export type ExpenseStatus =
  | 'pending'
  | 'partially_approved'
  | 'fully_approved'
  | 'super_admin_approved'
  | 'completed'
  | 'rejected'

export type ApprovalAction = 'approved' | 'rejected'

export interface Profile {
  id: string
  full_name: string
  email: string
  role: UserRole
  created_at: string
  updated_at: string
}

export interface Event {
  id: string
  name: string
  description: string | null
  is_active: boolean
  created_by: string
  created_at: string
  updated_at: string
  creator?: Profile
}

export interface Expense {
  id: string
  title: string
  description: string | null
  amount: number
  event_id: string | null
  status: ExpenseStatus
  created_by: string
  receipt_url: string | null
  notes: string | null
  rejection_reason: string | null
  created_at: string
  updated_at: string
  creator?: Profile
  event?: Event
  approvals?: ExpenseApproval[]
}

export interface ExpenseApproval {
  id: string
  expense_id: string
  approver_id: string
  action: ApprovalAction
  notes: string | null
  created_at: string
  approver?: Profile
}

export interface AccountBalance {
  id: string
  balance: number
  updated_by: string | null
  updated_at: string
  updater?: Profile
}

export interface Transaction {
  id: string
  expense_id: string
  amount: number
  description: string | null
  transaction_date: string
  created_by: string
  created_at: string
  expense?: Expense
  creator?: Profile
}

export interface DashboardStats {
  totalExpenses: number
  pendingExpenses: number
  approvedExpenses: number
  totalTransacted: number
  currentBalance: number
}
