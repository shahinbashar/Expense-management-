'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Event } from '@/lib/types'

export default function NewExpensePage() {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [eventId, setEventId] = useState('')
  const [notes, setNotes] = useState('')
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  useEffect(() => {
    async function loadEvents() {
      const supabase = createClient()
      const { data } = await supabase
        .from('events')
        .select('*')
        .eq('is_active', true)
        .order('name')
      setEvents(data || [])
    }
    loadEvents()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const parsedAmount = parseFloat(amount)
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Please enter a valid amount greater than 0')
      setLoading(false)
      return
    }

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error: insertError } = await supabase.from('expenses').insert({
      title,
      description: description || null,
      amount: parsedAmount,
      event_id: eventId || null,
      notes: notes || null,
      created_by: user.id,
      status: 'pending',
    })

    if (insertError) {
      setError(insertError.message)
      setLoading(false)
    } else {
      router.push('/expenses')
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <Link href="/expenses" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-4">
          <ArrowLeft className="w-4 h-4" />
          Back to Expenses
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">New Expense Request</h1>
        <p className="text-gray-500 mt-1">Submit an expense for approval</p>
      </div>

      <div className="card">
        <div className="card-body">
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-6 text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label">Title <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                required
                placeholder="e.g. Office supplies for Q1"
                className="input"
              />
            </div>

            <div>
              <label className="label">Amount (BDT) <span className="text-red-500">*</span></label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">৳</span>
                <input
                  type="number"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  required
                  min="0.01"
                  step="0.01"
                  placeholder="0.00"
                  className="input pl-7"
                />
              </div>
            </div>

            <div>
              <label className="label">Event / Category</label>
              <select
                value={eventId}
                onChange={e => setEventId(e.target.value)}
                className="input appearance-none"
              >
                <option value="">Select an event (optional)</option>
                {events.map(event => (
                  <option key={event.id} value={event.id}>{event.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Description</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={3}
                placeholder="Provide details about this expense..."
                className="input resize-none"
              />
            </div>

            <div>
              <label className="label">Additional Notes</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={2}
                placeholder="Any additional information..."
                className="input resize-none"
              />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-700">
              <strong>Approval Process:</strong> This expense will require approval from 2 admins before it reaches the Super Admin for final approval.
            </div>

            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={loading} className="btn-primary flex-1">
                {loading ? 'Submitting...' : 'Submit Expense Request'}
              </button>
              <Link href="/expenses" className="btn-secondary">Cancel</Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
