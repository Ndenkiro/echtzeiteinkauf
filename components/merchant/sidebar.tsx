'use client'
// components/merchant/sidebar.tsx
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, Package, ShoppingBag, Settings,
  LogOut, Home, CheckCircle2, Clock, AlertCircle
} from 'lucide-react'
import { createBrowserClient } from '@supabase/ssr'

const NAV = [
  { href: '/haendler-portal',               label: 'Übersicht',     icon: LayoutDashboard },
  { href: '/haendler-portal/produkte',      label: 'Produkte',      icon: Package },
  { href: '/haendler-portal/bestellungen',  label: 'Bestellungen',  icon: ShoppingBag },
  { href: '/haendler-portal/einstellungen', label: 'Einstellungen', icon: Settings },
]

const STATUS: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  draft:        { label: 'Entwurf',        color: 'text-white/50',  bg: 'bg-white/10',     icon: AlertCircle },
  under_review: { label: 'In Prüfung',     color: 'text-blue-400',  bg: 'bg-blue-500/15',  icon: Clock },
  approved:     { label: 'Freigeschaltet', color: 'text-green-400', bg: 'bg-green-500/15', icon: CheckCircle2 },
  rejected:     { label: 'Abgelehnt',      color: 'text-red-400',   bg: 'bg-red-500/15',   icon: AlertCircle },
  suspended:    { label: 'Gesperrt',       color: 'text-red-400',   bg: 'bg-red-500/15',   icon: AlertCircle },
}

export function MerchantSidebar({ name, email, status, hasStore }: {
  name: string; email: string; status: string; hasStore: boolean
}) {
  const pathname = usePathname()
  const router = useRouter()
  const cfg = STATUS[status] || STATUS.draft
  const StatusIcon = cfg.icon

  const logout = async () => {
    const supabase = createBrowserClient(
      'https://wpxpgszzzfhhsaunolyq.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndweHBnc3p6emZoaHNhdW5vbHlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0Mzg5ODQsImV4cCI6MjA5NzAxNDk4NH0.8_DVpLNwItAlkn_gL9a4dn-lZ00I8iifX2Cb9N_W-4U'
    )
    await supabase.auth.signOut()
    router.push('/haendler')
  }

  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'H'

  return (
    <>
      <aside className="hidden md:flex flex-col w-64 bg-[#0A0A0A] border-r border-white/[0.06] fixed top-0 bottom-0 left-0">
        <Link href="/haendler-portal" className="flex items-center gap-2.5 px-6 py-5 border-b border-white/[0.06]">
          <Image src="/logo.png" alt="" width={32} height={32} className="rounded-full" />
          <div>
            <div className="font-black text-sm text-white leading-tight">Echtzeiteinkauf</div>
            <div className="text-[10px] text-orange font-black tracking-wide">HÄNDLER-PORTAL</div>
          </div>
        </Link>

        <div className="px-5 py-5 border-b border-white/[0.06]">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-11 h-11 rounded-xl bg-orange/20 flex items-center justify-center font-black text-orange flex-shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <div className="font-bold text-sm text-white truncate">{name}</div>
              <div className="text-[11px] text-white/40 truncate">{email}</div>
            </div>
          </div>
          <div className={`flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1.5 rounded-lg ${cfg.bg} ${cfg.color} w-fit`}>
            <StatusIcon size={11} /> {cfg.label}
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          {NAV.map(item => {
            const active = pathname === item.href
            const disabled = !hasStore && item.href !== '/haendler-portal'
            const Icon = item.icon

            if (disabled) return (
              <div key={item.href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold mb-1 text-white/20 cursor-not-allowed">
                <Icon size={17} /> {item.label}
              </div>
            )
            return (
              <Link key={item.href} href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold mb-1 transition-all ${
                  active ? 'bg-orange text-black' : 'text-white/50 hover:bg-white/[0.06] hover:text-white'
                }`}>
                <Icon size={17} /> {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="px-3 py-4 border-t border-white/[0.06]">
          <Link href="/"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-white/50 hover:bg-white/[0.06] hover:text-white transition-all mb-1">
            <Home size={17} /> Hauptseite
          </Link>
          <button onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-white/50 hover:bg-red/10 hover:text-red transition-all">
            <LogOut size={17} /> Abmelden
          </button>
        </div>
      </aside>

      <div className="md:hidden fixed top-0 left-0 right-0 bg-[#0A0A0A] border-b border-white/[0.06] px-4 py-3 z-40 flex items-center gap-3">
        <Image src="/logo.png" alt="" width={30} height={30} className="rounded-full flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="font-black text-sm text-white truncate">{name}</div>
          <div className={`text-[10px] font-bold ${cfg.color}`}>{cfg.label}</div>
        </div>
        <button onClick={logout} className="w-8 h-8 rounded-lg bg-white/[0.08] flex items-center justify-center flex-shrink-0">
          <LogOut size={15} className="text-white/70" />
        </button>
      </div>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#0A0A0A] border-t border-white/[0.06] z-40 flex">
        {NAV.map(item => {
          const active = pathname === item.href
          const Icon = item.icon
          return (
            <Link key={item.href} href={item.href}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 ${
                active ? 'text-orange' : 'text-white/40'
              }`}>
              <Icon size={18} />
              <span className="text-[9px] font-bold">{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </>
  )
}
