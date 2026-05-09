'use client'
import { useEffect, useState } from 'react'
import { Wallet, TrendingUp, TrendingDown, AlertCircle, CheckCircle, History } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { AccountBalance, Transaction, Profile } from '@/lib/types'
import { formatCurrency, formatDate } from '@/lib/utils'
import LoadingSpinner from '@/components/LoadingSpinner'

export default function BalancePage() {
  const [balance, setBalance] = useState<AccountBalance | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [newBalance, setNewBalance] = useState('')
  const [adjustmentNote, setAdjustmentNote] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function loadData() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [profileRes, balanceRes, txRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('account_balance').select('*, updater:profiles(full_name)').single(),
      supabase
        .from('transactions')
        .select('*, expense:expenses(title), creator:profiles(full_name)')
        .order('created_at', { ascending: false })
        .limit(20),
    ])

    setProfile(profileRes.data)
    setBalance(balanceRes.data)
    setTransactions(txRes.data || [])
    if (balanceRes.data) setNewBalance(balanceRes.data.balance.toString())
    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  async function handleUpdateBalance(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')

    const parsedBalance = parseFloat(newBalance)
    if (isNaN(parsedBalance) || parsedBalance < 0) {
      setError('Please enter a valid balance amount')
      setSaving(false)
      return
    }

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !balance) return

    const { error: updateError } = await supabase
      .from('account_balance')
      .update({
        balance: parsedBalance,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', balance.id)

    if (updateError) {
      setError(updateError.message)
    } else {
      setSuccess('Balance updated successfully!')
      await loadData()
    }
    setSaving(false)
  }

  if (loading) return <div className="flex items-center justify-center h-64"><LoadingSpinner size="lg" /></div>

  const isSuperAdmin = profile?.role === 'super_admin'
  const totalTransacted = transactions.reduce((sum, t) => sum + t.amount, 0)

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Account Balance</h1>
        <p className="text-gray-500 mt-1">Track and manage the organization&apos;s account</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Current Balance Card */}
        <div className="lg:col-span-2 card bg-gradient-to-br from-blue-600 to-blue-700 text-white border-0">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <Wallet className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-blue-100 text-sm">Current Balance</p>
                <p className="text-white font-semibold">Account</p>
              </div>
            </div>
            <p className="text-4xl font-bold text-white mb-2">
              {formatCurrency(balance?.balance ?? 0)}
            </p>
            {balance?.updater && (
              <p className="text-blue-200 text-sm">
                Last updated by {(balance.updater as any)?.full_name} · {formatDate(balance.updated_at)}
              </p>
            )}
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-2 mb-1">
            <TrendingDown className="w-4 h-4 text-red-500" />
            <p className="text-sm text-gray-500">Total Transacted</p>
          </div>
          <p className="text-2xl font-bold text-gray-900 mb-4">{formatCurrency(totalTransacted)}</p>
          <div className="flex items-center gap-2 mb-1">
            <History className="w-4 h-4 text-gray-400" />
            <p className="text-sm text-gray-500">Transactions</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{transactions.length}</p>
        </div>
      </div>

      {/* Update Balance (Super Admin only) */}
      {isSuperAdmin && (
        <div className="card mb-8">
          <div className="card-header">
            <h2 className="font-semibold text-gray-900">Update Balance</h2>
          </div>
          <div className="card-body">
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
            <form onSubmit={handleUpdateBalance} className="flex gap-3 items-end">
              <div className="flex-1">
                <label className="label">New Balance (BDT)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">৳</span>
                  <input
                    type="number"
                    value={newBalance}
                    onChange={e => setNewBalance(e.target.value)}
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    className="input pl-7"
                  />
                </div>
              </div>
              <button type="submit" disabled={saving} className="btn-primary whitespace-nowrap">
                {saving ? 'Saving...' : 'Update Balance'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Transaction History */}
      <div className="card">
        <div className="card-header">
          <h2 className="font-semibold text-gray-900">Transaction History</h2>
        </div>
        {transactions.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <History className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p>No transactions yet</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {transactions.map(tx => (
              <div key={tx.id} className="flex items-center justify-between px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center">
                    <TrendingDown className="w-4 h-4 text-red-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {(tx.expense as any)?.title || tx.description || 'Transaction'}
                    </p>
                    <p className="text-xs text-gray-400">
                      Approved by {(tx.creator as any)?.full_name || 'Super Admin'} · {formatDate(tx.created_at)}
                    </p>
                  </div>
                </div>
                <span className="text-sm font-bold text-red-600">-{formatCurrency(tx.amount)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
