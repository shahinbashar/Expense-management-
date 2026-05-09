'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus, Search, Filter, Receipt } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Expense, Profile, ExpenseStatus } from '@/lib/types'
import { formatCurrency, formatDateShort, STATUS_LABELS } from '@/lib/utils'
import { StatusBadge } from '@/components/StatusBadge'
import LoadingSpinner from '@/components/LoadingSpinner'

const STATUS_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: 'All Status' },
  { value: 'pending', label: 'Pending' },
  { value: 'partially_approved', label: 'Partially Approved' },
  { value: 'fully_approved', label: 'Awaiting Super Admin' },
  { value: 'completed', label: 'Completed' },
  { value: 'rejected', label: 'Rejected' },
]

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [profileRes, expensesRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase
          .from('expenses')
          .select('*, creator:profiles!expenses_created_by_fkey(*), event:events(*), approvals:expense_approvals(*, approver:profiles(*))')
          .order('created_at', { ascending: false }),
      ])

      setProfile(profileRes.data)
      setExpenses(expensesRes.data || [])
      setLoading(false)
    }
    load()
  }, [])

  const filtered = expenses.filter(e => {
    const matchSearch = e.title.toLowerCase().includes(search.toLowerCase()) ||
      e.creator?.full_name?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || e.status === statusFilter
    return matchSearch && matchStatus
  })

  if (loading) {
    return <div className="flex items-center justify-center h-64"><LoadingSpinner size="lg" /></div>
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Expenses</h1>
          <p className="text-gray-500 mt-1">{filtered.length} expense{filtered.length !== 1 ? 's' : ''} found</p>
        </div>
        <Link href="/expenses/new" className="btn-primary gap-2">
          <Plus className="w-4 h-4" />
          New Expense
        </Link>
      </div>

      {/* Filters */}
      <div className="card mb-6 p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by title or creator..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input pl-9"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="input pl-9 pr-8 w-full sm:w-48 appearance-none"
          >
            {STATUS_FILTER_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="card overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Receipt className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No expenses found</p>
            <p className="text-sm mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Title</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Amount</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Event</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Submitted by</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Approvals</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(expense => (
                  <tr key={expense.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <Link href={`/expenses/${expense.id}`} className="font-medium text-blue-600 hover:text-blue-700">
                        {expense.title}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                      {formatCurrency(expense.amount)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {expense.event?.name || '—'}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={expense.status} />
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {expense.creator?.full_name || '—'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {formatDateShort(expense.created_at)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        {[0, 1].map(i => (
                          <div
                            key={i}
                            className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                              expense.approvals && expense.approvals.filter(a => a.action === 'approved').length > i
                                ? 'bg-green-500 text-white'
                                : 'bg-gray-200 text-gray-400'
                            }`}
                          >
                            ✓
                          </div>
                        ))}
                        <div
                          className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                            expense.status === 'completed' || expense.status === 'super_admin_approved'
                              ? 'bg-purple-500 text-white'
                              : 'bg-gray-200 text-gray-400'
                          }`}
                        >
                          S
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
