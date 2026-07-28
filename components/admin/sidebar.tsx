'use client'
// components/admin/sidebar.tsx — host-aware: clean URLs on admin subdomain
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  LayoutDashboard, BarChart2, Bike, Users,
  ShoppingBag, Tag, UserCog, LogOut, Home
} from 'lucide-react'
import { createBrowserClient } from '@supabase/ssr'

// Paths are declared WITHOUT the /admin prefix.
// On admin.echtzeiteinkauf.com  → /shoppers
// On echtzeiteinkauf.com        → /admin/shoppers
const NAV = [
  { path: '',              label: 'Dashboard',    icon: LayoutDashboard },
  { path: '/statistiken',  label: 'Statistiken',  icon: BarChart2 },
  { path: '/shoppers',     label: 'Shopper',      icon: Bike },
  { path: '/kunden',       label: 'Kunden',       icon: Users },
  { path: '/bestellungen', label: 'Bestellungen', icon: ShoppingBag },
  { path: '/promo',        label: 'Aktionscodes', icon: Tag },
  { path: '/users',        label: 'Benutzer',     icon: UserCog },
]

export function AdminSidebar({ name, email, role }: {
  name: string; email: string; role?: string
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [isSubdomain, setIsSubdomain] = useState(false)

  useEffect(() => {
    setIsSubdomain(window.location.hostname.startsWith('admin.'))
  }, [])

  // Build href depending on where we are
  const hrefFor = (path: string) =>
    isSubdomain ? (path || '/') : `/admin${path}`

  // Active check — pathname is always the rewritten /admin/... form
  const isActive = (path: string) => {
    const full = `/admin${path}`
    return path === '' ? pathname === '/admin' : pathname === full
  }

  const logout = async () => {
    const supabase = createBrowserClient(
      'https://wpxpgszzzfhhsaunolyq.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndweHBnc3p6emZoaHNhdW5vbHlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0Mzg5ODQsImV4cCI6MjA5NzAxNDk4NH0.8_DVpLNwItAlkn_gL9a4dn-lZ00I8iifX2Cb9N_W-4U'
    )
    await supabase.auth.signOut()
    window.location.href = 'https://echtzeiteinkauf.com/'
  }

  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'A'
  const roleLabel = role === 'subadmin' ? 'Sub-Admin' : 'Administrator'

  return (
    <>
      {/* Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-[#0A0A0A] fixed top-0 bottom-0 left-0">
        <Link href={hrefFor('')} className="flex items-center gap-2 px-6 py-5 border-b border-white/10">
          <Image src="/logo.png" alt="Echtzeiteinkauf" width={30} height={30} className="rounded-full" />
          <div>
            <div className="text-white font-black text-sm">Admin Panel</div>
            <div className="text-white/30 text-[10px]">Echtzeiteinkauf</div>
          </div>
        </Link>

        <div className="px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-red/20 flex items-center justify-center font-black text-red text-xs flex-shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <div className="text-white text-xs font-bold truncate">{name}</div>
              <div className="text-white/30 text-[10px] truncate">{roleLabel}</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          {NAV.map(item => {
            const active = isActive(item.path)
            const Icon = item.icon
            return (
              <Link
                key={item.path}
                href={hrefFor(item.path)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold mb-1 transition-all ${
                  active ? 'bg-red/20 text-red' : 'text-white/50 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon size={17} /> {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="px-3 py-4 border-t border-white/10">
          <a
            href="https://echtzeiteinkauf.com"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-white/50 hover:bg-white/5 hover:text-white transition-all mb-1"
          >
            <Home size={17} /> Zur Website
          </a>
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-white/50 hover:bg-red/10 hover:text-red transition-all"
          >
            <LogOut size={17} /> Abmelden
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-[#0A0A0A] px-4 py-3 z-40 flex items-center gap-3">
        <Image src="/logo.png" alt="" width={26} height={26} className="rounded-full" />
        <div className="flex-1 min-w-0">
          <div className="font-black text-sm text-white">Admin Panel</div>
          <div className="text-[10px] text-white/40 truncate">{name}</div>
        </div>
        <button onClick={logout} className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
          <LogOut size={15} className="text-white/70" />
        </button>
      </div>

      {/* Mobile bottom nav — 5 most used */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#0A0A0A] z-40 flex">
        {NAV.slice(0, 5).map(item => {
          const active = isActive(item.path)
          const Icon = item.icon
          return (
            <Link
              key={item.path}
              href={hrefFor(item.path)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 transition-colors ${
                active ? 'text-red' : 'text-white/40'
              }`}
            >
              <Icon size={18} />
              <span className="text-[9px] font-bold">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="md:hidden h-14" />
    </>
  )
}
