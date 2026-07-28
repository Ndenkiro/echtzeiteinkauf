'use client'
// components/account/sidebar.tsx
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, Package, TrendingUp, MapPin,
  User, LogOut, Home, ShoppingBag
} from 'lucide-react'
import { createBrowserClient } from '@supabase/ssr'

const NAV = [
  { href: '/konto',              label: 'Übersicht',    icon: LayoutDashboard },
  { href: '/konto/bestellungen', label: 'Bestellungen', icon: Package },
  { href: '/konto/ausgaben',     label: 'Ausgaben',     icon: TrendingUp },
  { href: '/konto/adressen',     label: 'Adressen',     icon: MapPin },
  { href: '/konto/profil',       label: 'Profil',       icon: User },
]

export function KontoSidebar({ name, email }: { name: string; email: string }) {
  const pathname = usePathname()
  const router = useRouter()

  const logout = async () => {
    const supabase = createBrowserClient(
      'https://wpxpgszzzfhhsaunolyq.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndweHBnc3p6emZoaHNhdW5vbHlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0Mzg5ODQsImV4cCI6MjA5NzAxNDk4NH0.8_DVpLNwItAlkn_gL9a4dn-lZ00I8iifX2Cb9N_W-4U'
    )
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'K'

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-100 fixed top-0 bottom-0 left-0">
        <Link href="/" className="flex items-center gap-2 px-6 py-5 border-b border-gray-100">
          <Image src="/logo.png" alt="Echtzeiteinkauf" width={30} height={30} className="rounded-full" />
          <span className="font-black text-sm text-gray-900">Mein Konto</span>
        </Link>

        <div className="px-6 py-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red/10 flex items-center justify-center font-black text-red text-sm flex-shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <div className="font-bold text-sm text-gray-900 truncate">{name}</div>
              <div className="text-xs text-gray-400 truncate">{email}</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4">
          {NAV.map(item => {
            const active = pathname === item.href
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold mb-1 transition-all ${
                  active ? 'bg-red/10 text-red' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Icon size={17} /> {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="px-3 py-4 border-t border-gray-100">
          <Link
            href="/maerkte"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-all mb-1"
          >
            <ShoppingBag size={17} /> Einkaufen
          </Link>
          <Link
            href="/"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-all mb-1"
          >
            <Home size={17} /> Startseite
          </Link>
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-gray-500 hover:bg-red/5 hover:text-red transition-all"
          >
            <LogOut size={17} /> Abmelden
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-white border-b border-gray-100 px-4 py-3 z-40 flex items-center gap-3">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo.png" alt="" width={26} height={26} className="rounded-full" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="font-black text-sm text-gray-900 truncate">{name}</div>
        </div>
        <button onClick={logout} className="w-8 h-8 rounded-lg border border-gray-100 flex items-center justify-center">
          <LogOut size={15} className="text-gray-500" />
        </button>
      </div>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-40 flex">
        {NAV.map(item => {
          const active = pathname === item.href
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 transition-colors ${
                active ? 'text-red' : 'text-gray-400'
              }`}
            >
              <Icon size={18} />
              <span className="text-[9px] font-bold">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Mobile spacer */}
      <div className="md:hidden h-14" />
    </>
  )
}
