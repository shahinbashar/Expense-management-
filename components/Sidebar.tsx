'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, Receipt, Calendar, Wallet, Users,
  LogOut, Menu, X, ChevronRight
} from 'lucide-react'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { UserRole } from '@/lib/types'
import { ROLE_LABELS, ROLE_COLORS, cn } from '@/lib/utils'

interface SidebarProps {
  userRole: UserRole
  userName: string
  userEmail: string
}

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['super_admin', 'admin', 'editor'] },
  { href: '/expenses', label: 'Expenses', icon: Receipt, roles: ['super_admin', 'admin', 'editor'] },
  { href: '/events', label: 'Events', icon: Calendar, roles: ['super_admin', 'admin', 'editor'] },
  { href: '/balance', label: 'Balance', icon: Wallet, roles: ['super_admin', 'admin', 'editor'] },
  { href: '/users', label: 'Users', icon: Users, roles: ['super_admin'] },
]

export default function Sidebar({ userRole, userName, userEmail }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  const supabase = createClient()

  async function handleLogout() {
    setLoggingOut(true)
    await supabase.auth.signOut()
    router.push('/login')
  }

  const filteredNav = navItems.filter(item => item.roles.includes(userRole))

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="px-6 py-5 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center">
            <Wallet className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-white font-bold text-sm leading-tight">ExpenseMS</h1>
            <p className="text-slate-400 text-xs">Management System</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {filteredNav.map(item => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group',
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:bg-slate-700 hover:text-white'
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1">{item.label}</span>
              {isActive && <ChevronRight className="w-3 h-3 opacity-70" />}
            </Link>
          )
        })}
      </nav>

      <div className="px-3 py-4 border-t border-slate-700">
        <div className="flex items-center gap-3 px-3 py-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-bold">
              {userName.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-medium truncate">{userName}</p>
            <span className={cn('inline-block px-1.5 py-0.5 rounded text-xs font-medium mt-0.5', ROLE_COLORS[userRole])}>
              {ROLE_LABELS[userRole]}
            </span>
          </div>
        </div>
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-slate-300 hover:bg-slate-700 hover:text-white text-sm font-medium transition-all"
        >
          <LogOut className="w-4 h-4" />
          {loggingOut ? 'Signing out...' : 'Sign Out'}
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile toggle */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-slate-800 text-white rounded-lg"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside className={cn(
        'lg:hidden fixed top-0 left-0 h-full w-64 bg-slate-800 z-50 transition-transform duration-300',
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <SidebarContent />
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-slate-800 h-screen sticky top-0 flex-shrink-0">
        <SidebarContent />
      </aside>
    </>
  )
}
