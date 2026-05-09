import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/Sidebar'

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar
        userRole={profile.role}
        userName={profile.full_name}
        userEmail={profile.email}
      />
      <main className="flex-1 overflow-auto lg:pl-0 pt-14 lg:pt-0">
        {children}
      </main>
    </div>
  )
}
