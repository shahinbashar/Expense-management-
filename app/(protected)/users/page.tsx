'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Users, AlertCircle, CheckCircle, Shield } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Profile, UserRole } from '@/lib/types'
import { ROLE_LABELS, ROLE_COLORS, formatDateShort, cn } from '@/lib/utils'
import LoadingSpinner from '@/components/LoadingSpinner'

const ROLES: UserRole[] = ['editor', 'admin', 'super_admin']

export default function UsersPage() {
  const [users, setUsers] = useState<Profile[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const router = useRouter()

  async function loadData() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const profileRes = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (profileRes.data?.role !== 'super_admin') {
      router.push('/dashboard')
      return
    }

    const usersRes = await supabase.from('profiles').select('*').order('created_at', { ascending: false })
    setProfile(profileRes.data)
    setUsers(usersRes.data || [])
    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  async function updateRole(userId: string, newRole: UserRole) {
    setUpdatingId(userId)
    setError('')
    setSuccess('')

    const supabase = createClient()
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', userId)

    if (updateError) {
      setError(updateError.message)
    } else {
      setSuccess(`User role updated to ${ROLE_LABELS[newRole]}`)
      await loadData()
    }
    setUpdatingId(null)
  }

  if (loading) return <div className="flex items-center justify-center h-64"><LoadingSpinner size="lg" /></div>

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-500 mt-1">{users.length} registered user{users.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <Shield className="w-4 h-4" />
          Super Admin Only
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

      <div className="card overflow-hidden">
        {users.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No users found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">User</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Current Role</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Joined</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Change Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map(user => (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-blue-700 text-sm font-bold">
                            {user.full_name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{user.full_name}</p>
                          {user.id === profile?.id && (
                            <p className="text-xs text-blue-500">(You)</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{user.email}</td>
                    <td className="px-6 py-4">
                      <span className={cn('inline-block px-2.5 py-1 rounded-full text-xs font-medium', ROLE_COLORS[user.role])}>
                        {ROLE_LABELS[user.role]}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{formatDateShort(user.created_at)}</td>
                    <td className="px-6 py-4">
                      {user.id === profile?.id ? (
                        <span className="text-xs text-gray-400 italic">Cannot change own role</span>
                      ) : (
                        <select
                          value={user.role}
                          onChange={e => updateRole(user.id, e.target.value as UserRole)}
                          disabled={updatingId === user.id}
                          className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 bg-white"
                        >
                          {ROLES.map(role => (
                            <option key={role} value={role}>{ROLE_LABELS[role]}</option>
                          ))}
                        </select>
                      )}
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
