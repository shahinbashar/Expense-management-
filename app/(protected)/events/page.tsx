'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus, Calendar, CheckCircle, XCircle, Trash2, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Event, Profile } from '@/lib/types'
import { formatDateShort } from '@/lib/utils'
import LoadingSpinner from '@/components/LoadingSpinner'

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState('')

  async function loadData() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [profileRes, eventsRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('events').select('*, creator:profiles(*)').order('created_at', { ascending: false }),
    ])

    setProfile(profileRes.data)
    setEvents(eventsRes.data || [])
    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  async function toggleActive(eventId: string, current: boolean) {
    const supabase = createClient()
    await supabase.from('events').update({ is_active: !current }).eq('id', eventId)
    await loadData()
  }

  async function handleDelete(eventId: string) {
    if (!confirm('Delete this event? This cannot be undone.')) return
    setDeletingId(eventId)
    const supabase = createClient()
    const { error } = await supabase.from('events').delete().eq('id', eventId)
    if (error) setError(error.message)
    await loadData()
    setDeletingId(null)
  }

  if (loading) return <div className="flex items-center justify-center h-64"><LoadingSpinner size="lg" /></div>

  const isSuperAdmin = profile?.role === 'super_admin'

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Events</h1>
          <p className="text-gray-500 mt-1">Expense categories and events</p>
        </div>
        {isSuperAdmin && (
          <Link href="/events/new" className="btn-primary gap-2">
            <Plus className="w-4 h-4" />
            New Event
          </Link>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4 text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {events.length === 0 ? (
        <div className="card text-center py-16 text-gray-400">
          <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No events yet</p>
          {isSuperAdmin && (
            <p className="text-sm mt-1">
              <Link href="/events/new" className="text-blue-600 hover:underline">Create your first event</Link>
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {events.map(event => (
            <div key={event.id} className="card hover:shadow-md transition-shadow">
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-5 h-5 text-purple-600" />
                  </div>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                    event.is_active
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-500'
                  }`}>
                    {event.is_active ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                    {event.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <h3 className="font-semibold text-gray-900 mb-1">{event.name}</h3>
                {event.description && (
                  <p className="text-sm text-gray-500 mb-3 line-clamp-2">{event.description}</p>
                )}

                <div className="text-xs text-gray-400 mb-4">
                  Created by {event.creator?.full_name || 'Unknown'} · {formatDateShort(event.created_at)}
                </div>

                {isSuperAdmin && (
                  <div className="flex gap-2 pt-3 border-t border-gray-100">
                    <button
                      onClick={() => toggleActive(event.id, event.is_active)}
                      className="btn btn-secondary btn-sm flex-1"
                    >
                      {event.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      onClick={() => handleDelete(event.id)}
                      disabled={deletingId === event.id}
                      className="btn btn-danger btn-sm"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
