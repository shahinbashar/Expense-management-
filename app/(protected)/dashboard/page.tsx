'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Receipt, Clock, CheckCircle, TrendingUp, Wallet, ArrowRight, Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Expense, Profile, AccountBalance } from '@/lib/types'
import { formatCurrency, formatDateShort } from '@/lib/utils'
import { StatusBadge } from '@/components/StatusBadge'
import LoadingSpinner from '@/components/LoadingSpinner'

export default function DashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [balance, setBalance] = useState<AccountBalance | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [profileRes, expensesRes, balanceRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('expenses').select('*, creator:profiles!expenses_created_by_fkey(*), event:events(*)').order('created_at', { ascending: false }).limit(5),
        supabase.from('account_balance').select('*').single(),
      ])

      setProfile(profileRes.data)
      setExpenses(expensesRes.data || [])
      setBalance(balanceRes.data)
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return <div className="flex items-center justify-center h-64"><LoadingSpinner size="lg" /></div>
  }

  const stats = [
    {
      label: 'Total Expenses',
      value: expenses.length ? expenses.length.toString() : '0',
      icon: Receipt,
      color: 'bg-blue-50 text-blue-600',
      iconBg: 'bg-blue-100',
    },
    {
      label: 'Pending Review',
      value: expenses.filter(e => ['pending', 'partially_approved'].includes(e.status)).length.toString(),
      icon: Clock,
      color: 'bg-yellow-50 text-yellow-600',
      iconBg: 'bg-yellow-100',
    },
    {
      label: 'Completed',
      value: expenses.filter(e => e.status === 'completed').length.toString(),
      icon: CheckCircle,
      color: 'bg-green-50 text-green-600',
      iconBg: 'bg-green-100',
    },
    {
      label: 'Account Balance',
      value: formatCurrency(balance?.balance ?? 0),
      icon: Wallet,
      color: 'bg-purple-50 text-purple-600',
      iconBg: 'bg-purple-100',
    },
  ]

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {profile?.full_name?.split(' ')[0]} 👋
        </h1>
        <p className="text-gray-500 mt-1">Here&apos;s what&apos;s happening with your expenses today.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map(stat => {
          const Icon = stat.icon
          return (
            <div key={stat.label} className="card p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-gray-500 font-medium">{stat.label}</p>
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${stat.iconBg}`}>
                  <Icon className={`w-4 h-4 ${stat.color.split(' ')[1]}`} />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            </div>
          )
        })}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Link
          href="/expenses/new"
          className="card p-5 flex items-center gap-4 hover:border-blue-300 hover:shadow-md transition-all group"
        >
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-600 transition-colors">
            <Plus className="w-5 h-5 text-blue-600 group-hover:text-white transition-colors" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">New Expense</p>
            <p className="text-xs text-gray-500">Submit a new expense request</p>
          </div>
        </Link>
        <Link
          href="/expenses"
          className="card p-5 flex items-center gap-4 hover:border-blue-300 hover:shadow-md transition-all group"
        >
          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-600 transition-colors">
            <Receipt className="w-5 h-5 text-green-600 group-hover:text-white transition-colors" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">All Expenses</p>
            <p className="text-xs text-gray-500">View and manage expenses</p>
          </div>
        </Link>
        <Link
          href="/events"
          className="card p-5 flex items-center gap-4 hover:border-blue-300 hover:shadow-md transition-all group"
        >
          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center group-hover:bg-purple-600 transition-colors">
            <TrendingUp className="w-5 h-5 text-purple-600 group-hover:text-white transition-colors" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">Events</p>
            <p className="text-xs text-gray-500">Browse expense categories</p>
          </div>
        </Link>
      </div>

      {/* Recent Expenses */}
      <div className="card">
        <div className="card-header flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Recent Expenses</h2>
          <Link href="/expenses" className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1">
            View all <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        {expenses.length === 0 ? (
          <div className="card-body text-center py-12 text-gray-400">
            <Receipt className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No expenses yet</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {expenses.map(expense => (
              <Link
                key={expense.id}
                href={`/expenses/${expense.id}`}
                className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Receipt className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{expense.title}</p>
                    <p className="text-xs text-gray-400">
                      {expense.creator?.full_name} · {formatDateShort(expense.created_at)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={expense.status} />
                  <span className="text-sm font-semibold text-gray-900">{formatCurrency(expense.amount)}</span>
                  <ArrowRight className="w-4 h-4 text-gray-300" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
