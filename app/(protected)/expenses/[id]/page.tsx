'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, CheckCircle, XCircle, AlertCircle, Clock,
  User, Calendar, Tag, DollarSign, FileText, MessageSquare
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Expense, Profile, ExpenseStatus } from '@/lib/types'
import { formatCurrency, formatDate, ROLE_LABELS } from '@/lib/utils'
import { StatusBadge } from '@/components/StatusBadge'
import LoadingSpinner from '@/components/LoadingSpinner'

export default function ExpenseDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [expense, setExpense] = useState<Expense | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [approvalNotes, setApprovalNotes] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function loadExpense() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [profileRes, expenseRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase
        .from('expenses')
        .select('*, creator:profiles!expenses_created_by_fkey(*), event:events(*), approvals:expense_approvals(*, approver:profiles(*))')
        .eq('id', params.id)
        .single(),
    ])

    setProfile(profileRes.data)
    setExpense(expenseRes.data)
    setLoading(false)
  }

  useEffect(() => { loadExpense() }, [params.id])

  function canApprove(): boolean {
    if (!profile || !expense) return false
    if (expense.status === 'rejected' || expense.status === 'completed') return false

    const existingApproval = expense.approvals?.find(a => a.approver_id === profile.id)
    if (existingApproval) return false

    if (profile.role === 'admin') {
      return expense.status === 'pending' || expense.status === 'partially_approved'
    }
    if (profile.role === 'super_admin') {
      return expense.status === 'fully_approved'
    }
    return false
  }

  async function handleApprove() {
    if (!expense || !profile) return
    setActionLoading(true)
    setError('')

    const supabase = createClient()

    const approvedCount = (expense.approvals?.filter(a => a.action === 'approved').length ?? 0)
    let newStatus: ExpenseStatus

    if (profile.role === 'super_admin') {
      newStatus = 'super_admin_approved'
    } else if (approvedCount === 0) {
      newStatus = 'partially_approved'
    } else {
      newStatus = 'fully_approved'
    }

    const { error: approvalError } = await supabase.from('expense_approvals').insert({
      expense_id: expense.id,
      approver_id: profile.id,
      action: 'approved',
      notes: approvalNotes || null,
    })

    if (approvalError) {
      setError(approvalError.message)
      setActionLoading(false)
      return
    }

    const updateData: Record<string, string> = { status: newStatus }

    const { error: updateError } = await supabase
      .from('expenses')
      .update(updateData)
      .eq('id', expense.id)

    if (updateError) {
      setError(updateError.message)
      setActionLoading(false)
      return
    }

    if (profile.role === 'super_admin') {
      await supabase.from('transactions').insert({
        expense_id: expense.id,
        amount: expense.amount,
        description: `Approved: ${expense.title}`,
        created_by: profile.id,
      })

      const { data: balData } = await supabase.from('account_balance').select('*').single()
      if (balData) {
        await supabase.from('account_balance').update({
          balance: balData.balance - expense.amount,
          updated_by: profile.id,
          updated_at: new Date().toISOString(),
        }).eq('id', balData.id)
      }

      await supabase.from('expenses').update({ status: 'completed' }).eq('id', expense.id)
    }

    setSuccess('Expense approved successfully!')
    setApprovalNotes('')
    await loadExpense()
    setActionLoading(false)
  }

  async function handleReject() {
    if (!expense || !profile) return
    if (!rejectionReason.trim()) {
      setError('Please provide a rejection reason')
      return
    }
    setActionLoading(true)
    setError('')

    const supabase = createClient()

    const { error: approvalError } = await supabase.from('expense_approvals').insert({
      expense_id: expense.id,
      approver_id: profile.id,
      action: 'rejected',
      notes: rejectionReason,
    })

    if (approvalError) {
      setError(approvalError.message)
      setActionLoading(false)
      return
    }

    await supabase.from('expenses').update({
      status: 'rejected',
      rejection_reason: rejectionReason,
    }).eq('id', expense.id)

    setSuccess('Expense rejected.')
    setShowRejectForm(false)
    setRejectionReason('')
    await loadExpense()
    setActionLoading(false)
  }

  if (loading) return <div className="flex items-center justify-center h-64"><LoadingSpinner size="lg" /></div>
  if (!expense) return <div className="p-6 text-center text-gray-500">Expense not found</div>

  const approvedAdmins = expense.approvals?.filter(a => a.action === 'approved') || []

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <Link href="/expenses" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-4">
          <ArrowLeft className="w-4 h-4" />
          Back to Expenses
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{expense.title}</h1>
            <p className="text-gray-500 mt-1">Expense #{expense.id.slice(0, 8)}</p>
          </div>
          <StatusBadge status={expense.status} />
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4 text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-4 py-3 mb-4 text-green-700 text-sm">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <div className="card-header">
              <h2 className="font-semibold text-gray-900">Expense Details</h2>
            </div>
            <div className="card-body space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center">
                    <DollarSign className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Amount</p>
                    <p className="font-bold text-gray-900 text-lg">{formatCurrency(expense.amount)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center">
                    <Tag className="w-4 h-4 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Event</p>
                    <p className="font-medium text-gray-900 text-sm">{expense.event?.name || 'No event'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                    <User className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Submitted by</p>
                    <p className="font-medium text-gray-900 text-sm">{expense.creator?.full_name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center">
                    <Calendar className="w-4 h-4 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Submitted on</p>
                    <p className="font-medium text-gray-900 text-sm">{formatDate(expense.created_at)}</p>
                  </div>
                </div>
              </div>

              {expense.description && (
                <div className="pt-3 border-t border-gray-100">
                  <p className="text-xs text-gray-400 mb-1 flex items-center gap-1"><FileText className="w-3 h-3" /> Description</p>
                  <p className="text-sm text-gray-700">{expense.description}</p>
                </div>
              )}

              {expense.notes && (
                <div className="pt-3 border-t border-gray-100">
                  <p className="text-xs text-gray-400 mb-1 flex items-center gap-1"><MessageSquare className="w-3 h-3" /> Notes</p>
                  <p className="text-sm text-gray-700">{expense.notes}</p>
                </div>
              )}

              {expense.rejection_reason && (
                <div className="pt-3 border-t border-gray-100">
                  <p className="text-xs text-red-500 mb-1">Rejection Reason</p>
                  <p className="text-sm text-red-700 bg-red-50 rounded-lg p-3">{expense.rejection_reason}</p>
                </div>
              )}
            </div>
          </div>

          {/* Approval Timeline */}
          <div className="card">
            <div className="card-header">
              <h2 className="font-semibold text-gray-900">Approval Timeline</h2>
            </div>
            <div className="card-body">
              <div className="space-y-4">
                {/* Step 1: Admin 1 */}
                <ApprovalStep
                  label="Admin Approval #1"
                  approval={expense.approvals?.find((a, i) => i === 0)}
                  pending={expense.status === 'pending'}
                />
                {/* Step 2: Admin 2 */}
                <ApprovalStep
                  label="Admin Approval #2"
                  approval={expense.approvals?.find((a, i) => i === 1 && a.action === 'approved')}
                  pending={expense.status === 'partially_approved'}
                />
                {/* Step 3: Super Admin */}
                <ApprovalStep
                  label="Super Admin Final Approval"
                  approval={expense.approvals?.find(a => {
                    return expense.status === 'completed' || expense.status === 'super_admin_approved'
                  }) && expense.approvals?.find(a => a.approver?.role === 'super_admin')}
                  pending={expense.status === 'fully_approved'}
                  isFinal
                />
              </div>
            </div>
          </div>
        </div>

        {/* Actions Panel */}
        <div className="space-y-6">
          {/* Approval Progress */}
          <div className="card">
            <div className="card-header">
              <h2 className="font-semibold text-gray-900">Approval Progress</h2>
            </div>
            <div className="card-body space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Admin approvals</span>
                <span className="text-sm font-bold text-gray-900">
                  {approvedAdmins.filter(a => a.approver?.role !== 'super_admin').length} / 2
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, (approvedAdmins.filter(a => a.approver?.role !== 'super_admin').length / 2) * 100)}%`
                  }}
                />
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-sm text-gray-600">Super admin</span>
                <span className={`text-sm font-bold ${expense.status === 'completed' ? 'text-green-600' : 'text-gray-400'}`}>
                  {expense.status === 'completed' ? 'Approved ✓' : 'Pending'}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          {canApprove() && (
            <div className="card">
              <div className="card-header">
                <h2 className="font-semibold text-gray-900">Take Action</h2>
              </div>
              <div className="card-body space-y-4">
                <div>
                  <label className="label">Notes (optional)</label>
                  <textarea
                    value={approvalNotes}
                    onChange={e => setApprovalNotes(e.target.value)}
                    rows={2}
                    placeholder="Add a note..."
                    className="input resize-none text-sm"
                  />
                </div>

                {!showRejectForm ? (
                  <div className="flex gap-2">
                    <button
                      onClick={handleApprove}
                      disabled={actionLoading}
                      className="btn-success flex-1 gap-2"
                    >
                      <CheckCircle className="w-4 h-4" />
                      {actionLoading ? 'Processing...' : 'Approve'}
                    </button>
                    <button
                      onClick={() => setShowRejectForm(true)}
                      className="btn-danger gap-2"
                    >
                      <XCircle className="w-4 h-4" />
                      Reject
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <label className="label text-red-600">Rejection Reason <span className="text-red-500">*</span></label>
                      <textarea
                        value={rejectionReason}
                        onChange={e => setRejectionReason(e.target.value)}
                        rows={3}
                        placeholder="Explain why this is being rejected..."
                        className="input resize-none text-sm border-red-300 focus:ring-red-500"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleReject}
                        disabled={actionLoading}
                        className="btn-danger flex-1"
                      >
                        {actionLoading ? 'Rejecting...' : 'Confirm Reject'}
                      </button>
                      <button
                        onClick={() => { setShowRejectForm(false); setRejectionReason('') }}
                        className="btn-secondary"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {profile && expense.approvals?.find(a => a.approver_id === profile.id) && (
            <div className="card bg-gray-50">
              <div className="card-body text-center text-sm text-gray-500">
                <CheckCircle className="w-6 h-6 mx-auto mb-2 text-green-500" />
                You have already acted on this expense
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ApprovalStep({ label, approval, pending, isFinal }: {
  label: string
  approval: any
  pending: boolean
  isFinal?: boolean
}) {
  const isApproved = approval?.action === 'approved'
  const isRejected = approval?.action === 'rejected'

  return (
    <div className="flex items-start gap-3">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
        isApproved ? 'bg-green-100' :
        isRejected ? 'bg-red-100' :
        pending ? 'bg-yellow-100' : 'bg-gray-100'
      }`}>
        {isApproved ? <CheckCircle className="w-4 h-4 text-green-600" /> :
         isRejected ? <XCircle className="w-4 h-4 text-red-600" /> :
         pending ? <Clock className="w-4 h-4 text-yellow-600" /> :
         <Clock className="w-4 h-4 text-gray-400" />}
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-900">{label}</p>
        {isApproved && approval?.approver && (
          <p className="text-xs text-gray-500 mt-0.5">
            By {approval.approver.full_name} · {formatDate(approval.created_at)}
          </p>
        )}
        {isRejected && approval?.approver && (
          <p className="text-xs text-red-500 mt-0.5">
            Rejected by {approval.approver.full_name}
          </p>
        )}
        {pending && !isApproved && !isRejected && (
          <p className="text-xs text-yellow-600 mt-0.5">Awaiting approval</p>
        )}
        {!pending && !isApproved && !isRejected && (
          <p className="text-xs text-gray-400 mt-0.5">Not yet reached</p>
        )}
        {approval?.notes && (
          <p className="text-xs bg-gray-50 rounded p-2 mt-1 text-gray-600">&quot;{approval.notes}&quot;</p>
        )}
      </div>
    </div>
  )
}
