'use client'
// components/shopper-portal/sidebar.tsx
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, Briefcase, Wallet, History,
  Star, FileText, User, LogOut, Home,
  AlertCircle, CheckCircle2, Bike
} from 'lucide-react'
import { createBrowserClient } from '@supabase/ssr'

const NAV = [
  { href: '/shopper-portal',             label: 'Übersicht',   icon: LayoutDashboard },
  { href: '/shopper-portal/auftraege',   label: 'Aufträge',    icon: Briefcase },
  { href: '/shopper-portal/verdienst',   label: 'Verdienst',   icon: Wallet },
  { href: '/shopper-portal/historie',    label: 'Historie',    icon: History },
  { href: '/shopper-portal/bewertungen', label: 'Bewertungen', icon: Star },
  { href: '/shopper-portal/dokumente',   label: 'Dokumente',   icon: FileText },
  { href: '/shopper-portal/profil',      label: 'Profil',      icon: User },
]
const MOBILE_NAV = [NAV[0], NAV[1], NAV[2], NAV[4], NAV[6]]

const STATUS: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  draft:             { label: 'Nicht eingereicht', color: 'text-white/50',  bg: 'bg-white/10',     icon: AlertCircle },
  documents_pending: { label: 'Dokumente fehlen',  color: 'text-orange',    bg: 'bg-orange/15',    icon: AlertCircle },
  under_review:      { label: 'Wird geprüft',      color: 'text-blue-400',  bg: 'bg-blue-500/15',  icon: AlertCircle },
  approved:          { label: 'Verifiziert',       color: 'text-green-400', bg: 'bg-green-500/15', icon: CheckCircle2 },
  rejected:          { label: 'Abgelehnt',         color: 'text-red-400',   bg: 'bg-red-500/15',   icon: AlertCircle },
}

type Props = {
  name: string
  email: string
  appStatus: string
  rating: number | null
  deliveries: number
  isOnline: boolean
}

export function ShopperSidebar({ name, email, appStatus, rating, deliveries, isOnline }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const cfg = STATUS[appStatus] || STATUS.draft
  const StatusIcon = cfg.icon

  const logout = async () => {
    const supabase = createBrowserClient(
      'https://wpxpgszzzfhhsaunolyq.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndweHBnc3p6emZoaHNhdW5vbHlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0Mzg5ODQsImV4cCI6MjA5NzAxNDk4NH0.8_DVpLNwItAlkn_gL9a4dn-lZ00I8iifX2Cb9N_W-4U'
    )
    await supabase.auth.signOut()
    router.push('/shopper')
    router.refresh()
  }

  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'S'

  return (
    <>
      {/* Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-[#0A0A0A] border-r border-white/[0.06] fixed top-0 bottom-0 left-0">
        <Link href="/shopper-portal" className="flex items-center gap-2.5 px-6 py-5 border-b border-white/[0.06]">
          <Image src="/logo.png" alt="" width={32} height={32} className="rounded-full" />
          <div>
            <div className="font-black text-sm text-white leading-tight">Echtzeiteinkauf</div>
            <div className="text-[10px] text-orange font-black tracking-wide">SHOPPER-PORTAL</div>
          </div>
        </Link>

        {/* Profile block */}
        <div className="px-5 py-5 border-b border-white/[0.06]">
          <div className="flex items-center gap-3 mb-3">
            <div className="relative flex-shrink-0">
              <div className="w-11 h-11 rounded-full bg-orange/20 flex items-center justify-center font-black text-orange">
                {initials}
              </div>
              <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[#0A0A0A] ${
                isOnline ? 'bg-green-500' : 'bg-gray-600'
              }`} />
            </div>
            <div className="min-w-0">
              <div className="font-bold text-sm text-white truncate">{name}</div>
              <div className="text-[11px] text-white/40 truncate">{email}</div>
            </div>
          </div>

          {/* Stats */}
          {appStatus === 'approved' && (
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="bg-white/[0.04] rounded-xl px-3 py-2">
                <div className="text-sm font-black text-white flex items-center gap-1">
                  {rating ? <><Star size={11} className="fill-orange text-orange" />{Number(rating).toFixed(1)}</> : '—'}
                </div>
                <div className="text-[9px] text-white/30 font-bold uppercase">Bewertung</div>
              </div>
              <div className="bg-white/[0.04] rounded-xl px-3 py-2">
                <div className="text-sm font-black text-white">{deliveries}</div>
                <div className="text-[9px] text-white/30 font-bold uppercase">Touren</div>
              </div>
            </div>
          )}

          <div className={`flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1.5 rounded-lg ${cfg.bg} ${cfg.color} w-fit`}>
            <StatusIcon size={11} /> {cfg.label}
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          {NAV.map(item => {
            const active = pathname === item.href
            const Icon = item.icon
            return (
              <Link key={item.href} href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold mb-1 transition-all ${
                  active
                    ? 'bg-orange text-black'
                    : 'text-white/50 hover:bg-white/[0.06] hover:text-white'
                }`}>
                <Icon size={17} /> {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="px-3 py-4 border-t border-white/[0.06]">
          <Link href="/shopper"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-white/50 hover:bg-white/[0.06] hover:text-white transition-all mb-1">
            <Bike size={17} /> Shopper-Infos
          </Link>
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

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-[#0A0A0A] border-b border-white/[0.06] px-4 py-3 z-40 flex items-center gap-3">
        <div className="relative flex-shrink-0">
          <Image src="/logo.png" alt="" width={30} height={30} className="rounded-full" />
          <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#0A0A0A] ${
            isOnline ? 'bg-green-500' : 'bg-gray-600'
          }`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-black text-sm text-white truncate">{name}</div>
          <div className={`text-[10px] font-bold ${isOnline ? 'text-green-400' : 'text-white/40'}`}>
            {isOnline ? '● Online' : '○ Offline'}
          </div>
        </div>
        <button onClick={logout} className="w-8 h-8 rounded-lg bg-white/[0.08] flex items-center justify-center flex-shrink-0">
          <LogOut size={15} className="text-white/70" />
        </button>
      </div>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#0A0A0A] border-t border-white/[0.06] z-40 flex">
        {MOBILE_NAV.map(item => {
          const active = pathname === item.href
          const Icon = item.icon
          return (
            <Link key={item.href} href={item.href}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 transition-colors ${
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
