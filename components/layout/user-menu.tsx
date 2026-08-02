'use client'
// components/layout/user-menu.tsx — logged-in user dropdown
import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import {
  User, Package, TrendingUp, MapPin, Settings,
  LogOut, ChevronDown, Bike, ShieldCheck, Wallet, Star
} from 'lucide-react'

const SUPABASE_URL = 'https://wpxpgszzzfhhsaunolyq.supabase.co'
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndweHBnc3p6emZoaHNhdW5vbHlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0Mzg5ODQsImV4cCI6MjA5NzAxNDk4NH0.8_DVpLNwItAlkn_gL9a4dn-lZ00I8iifX2Cb9N_W-4U'

type Profile = {
  id: string
  full_name: string | null
  email: string | null
  role: string
}

const MENU_BY_ROLE: Record<string, { href: string; label: string; icon: any }[]> = {
  customer: [
    { href: '/konto',              label: 'Mein Konto',    icon: User },
    { href: '/konto/bestellungen', label: 'Bestellungen',  icon: Package },
    { href: '/konto/ausgaben',     label: 'Ausgaben',      icon: TrendingUp },
    { href: '/konto/adressen',     label: 'Adressen',      icon: MapPin },
    { href: '/konto/profil',       label: 'Profil ändern', icon: Settings },
  ],
  shopper: [
    { href: '/shopper-portal',             label: 'Shopper-Portal', icon: Bike },
    { href: '/shopper-portal/auftraege',   label: 'Aufträge',       icon: Package },
    { href: '/shopper-portal/verdienst',   label: 'Verdienst',      icon: Wallet },
    { href: '/shopper-portal/bewertungen', label: 'Bewertungen',    icon: Star },
    { href: '/shopper-portal/profil',      label: 'Profil ändern',  icon: Settings },
  ],
}

export function UserMenu() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const supabase = createBrowserClient(SUPABASE_URL, SUPABASE_ANON)

  // Load session + profile
  useEffect(() => {
    let mounted = true

    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        if (mounted) { setProfile(null); setLoading(false) }
        return
      }
      const { data } = await supabase
        .from('users')
        .select('id, full_name, email, role')
        .eq('auth_id', user.id)
        .maybeSingle()

      if (mounted) {
        setProfile(data as Profile | null)
        setLoading(false)
      }
    }

    load()

    // React to login/logout in other tabs
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') setProfile(null)
      if (event === 'SIGNED_IN') load()
    })

    return () => { mounted = false; subscription.unsubscribe() }
  }, [])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const logout = async () => {
    await supabase.auth.signOut()
    setProfile(null)
    setOpen(false)
    router.push('/')
    router.refresh()
  }

  // ── Loading: show a subtle placeholder to avoid layout jump ──
  if (loading) {
    return <div className="hidden md:block w-28 h-10 rounded-xl bg-gray-100 animate-pulse" />
  }

  // ── Not logged in ──
  if (!profile) {
    return (
      <Link
        href="/anmelden"
        className="hidden md:block text-sm font-bold text-gray-700 border border-gray-300 rounded-xl px-4 py-2.5 hover:border-red hover:text-red transition-all bg-white"
      >
        Anmelden
      </Link>
    )
  }

  // ── Logged in ──
  const firstName = profile.full_name?.split(' ')[0] || 'Konto'
  const initials = (profile.full_name || profile.email || 'K')
    .split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

  const isAdmin = ['admin', 'subadmin'].includes(profile.role)
  const menuItems = MENU_BY_ROLE[profile.role] || MENU_BY_ROLE.customer

  const accentBg = profile.role === 'shopper' ? 'bg-orange/15' : 'bg-red/10'
  const accentText = profile.role === 'shopper' ? 'text-orange-dark' : 'text-red'

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 border border-gray-200 rounded-xl pl-2 pr-3 py-1.5 hover:border-gray-300 transition-all bg-white"
      >
        <div className={`w-7 h-7 rounded-full ${accentBg} flex items-center justify-center font-black text-[11px] ${accentText} flex-shrink-0`}>
          {initials}
        </div>
        <div className="hidden sm:block text-left leading-tight">
          <div className="text-[10px] text-gray-400 font-medium">Willkommen</div>
          <div className="text-xs font-black text-gray-900 max-w-24 truncate">{firstName}</div>
        </div>
        <ChevronDown
          size={14}
          className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-60 bg-white rounded-2xl border border-gray-100 shadow-xl overflow-hidden z-50">
          {/* Header */}
          <div className="px-4 py-3.5 border-b border-gray-50 bg-gray-50/50">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full ${accentBg} flex items-center justify-center font-black text-sm ${accentText} flex-shrink-0`}>
                {initials}
              </div>
              <div className="min-w-0">
                <div className="font-black text-sm text-gray-900 truncate">
                  {profile.full_name || 'Mein Konto'}
                </div>
                <div className="text-[11px] text-gray-400 truncate">{profile.email}</div>
              </div>
            </div>
            {profile.role === 'shopper' && (
              <div className="mt-2 inline-flex items-center gap-1 text-[10px] font-black text-orange-dark bg-orange/15 px-2 py-0.5 rounded-full">
                <Bike size={10} /> Shopper
              </div>
            )}
          </div>

          {/* Links */}
          <div className="py-1.5">
            {menuItems.map(item => {
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                >
                  <Icon size={15} className="text-gray-400" /> {item.label}
                </Link>
              )
            })}

            {isAdmin && (
              <a
                href="https://admin.echtzeiteinkauf.com"
                className="flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-red hover:bg-red/5 transition-colors border-t border-gray-50 mt-1.5 pt-3"
              >
                <ShieldCheck size={15} /> Admin Panel
              </a>
            )}
          </div>

          {/* Logout */}
          <div className="border-t border-gray-50 py-1.5">
            <button
              onClick={logout}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-gray-500 hover:bg-red/5 hover:text-red transition-colors"
            >
              <LogOut size={15} /> Abmelden
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
