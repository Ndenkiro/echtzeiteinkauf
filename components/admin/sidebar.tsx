'use client'
// components/admin/sidebar.tsx
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, Users, Bike, ShoppingBag, LogOut, Home, BarChart2 } from 'lucide-react'
import { createBrowserClient } from '@supabase/ssr'

const NAV = [
  { href: '/admin',             label: 'Dashboard',     icon: LayoutDashboard },
  { href: '/admin/statistiken', label: 'Statistiken', icon: BarChart2 },
  { href: '/admin/shoppers',    label: 'Shopper',       icon: Bike },
  { href: '/admin/kunden',      label: 'Kunden',        icon: Users },
  { href: '/admin/bestellungen',label: 'Bestellungen',  icon: ShoppingBag },
]

export function AdminSidebar({ name, email }: { name: string; email: string }) {
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

  return (
    <aside className="hidden md:flex flex-col w-64 bg-[#0A0A0A] fixed top-0 bottom-0 left-0">
      <Link href="/admin" className="flex items-center gap-2 px-6 py-5 border-b border-white/10">
        <Image src="/logo.png" alt="Echtzeiteinkauf" width={30} height={30} className="rounded-full" />
        <div>
          <div className="text-white font-black text-sm">Admin Panel</div>
          <div className="text-white/30 text-[10px]">Echtzeiteinkauf</div>
        </div>
      </Link>

      <div className="px-6 py-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-red/20 flex items-center justify-center font-black text-red text-xs flex-shrink-0">
            {name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="text-white text-xs font-bold truncate">{name}</div>
            <div className="text-white/30 text-[10px] truncate">{email}</div>
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
                active ? 'bg-red/20 text-red' : 'text-white/50 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Icon size={17} /> {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="px-3 py-4 border-t border-white/10">
        <Link href="/" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-white/50 hover:bg-white/5 hover:text-white transition-all mb-1">
          <Home size={17} /> Zur Website
        </Link>
        <button onClick={logout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-white/50 hover:bg-red/10 hover:text-red transition-all">
          <LogOut size={17} /> Abmelden
        </button>
      </div>
    </aside>
  )
}
