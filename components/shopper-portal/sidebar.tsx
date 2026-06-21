'use client'
// components/shopper-portal/sidebar.tsx
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { Briefcase, Wallet, FileText, User, LogOut, Home, AlertCircle, CheckCircle2 } from 'lucide-react'
import { supabaseBrowser } from '@/lib/supabase'

const NAV = [
  { href: '/shopper-portal',            label: 'Aufträge',  icon: Briefcase },
  { href: '/shopper-portal/verdienst',  label: 'Verdienst',  icon: Wallet },
  { href: '/shopper-portal/dokumente',  label: 'Dokumente',  icon: FileText },
  { href: '/shopper-portal/profil',     label: 'Profil',     icon: User },
]

const STATUS_CFG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  draft:              { label: 'Nicht eingereicht', color: 'text-gray-500',     bg: 'bg-gray-100',     icon: AlertCircle },
  documents_pending:  { label: 'Dokumente fehlen',   color: 'text-orange-dark', bg: 'bg-orange-light', icon: AlertCircle },
  under_review:       { label: 'Wird geprüft',       color: 'text-blue-600',    bg: 'bg-blue-50',      icon: AlertCircle },
  approved:           { label: 'Verifiziert',        color: 'text-green-700',   bg: 'bg-green-50',     icon: CheckCircle2 },
  rejected:           { label: 'Abgelehnt',          color: 'text-red',        bg: 'bg-red-light',    icon: AlertCircle },
}

export function ShopperSidebar({ name, email, appStatus }: { name: string; email: string; appStatus: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = supabaseBrowser()
  const cfg = STATUS_CFG[appStatus] || STATUS_CFG.draft
  const StatusIcon = cfg.icon

  const logout = async () => {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'S'

  return (
    <aside className="hidden md:flex flex-col w-64 bg-[#0A0A0A] fixed top-0 bottom-0 left-0">
      <Link href="/" className="flex items-center gap-2 px-6 py-5 border-b border-white/10">
        <Image src="/logo.png" alt="Echtzeiteinkauf" width={30} height={30} className="rounded-full" />
        <span className="font-black text-sm text-white">Shopper-Portal</span>
      </Link>

      <div className="px-6 py-5 border-b border-white/10">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-orange/20 flex items-center justify-center font-black text-orange text-sm flex-shrink-0">
            {initials}
          </div>
          <div className="min-w-0">
            <div className="font-bold text-sm text-white truncate">{name}</div>
            <div className="text-xs text-white/40 truncate">{email}</div>
          </div>
        </div>
        <div className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1.5 rounded-lg ${cfg.bg} ${cfg.color} w-fit`}>
          <StatusIcon size={12} /> {cfg.label}
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
                active ? 'bg-orange/15 text-orange' : 'text-white/50 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Icon size={17} /> {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="px-3 py-4 border-t border-white/10">
        <Link href="/" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-white/50 hover:bg-white/5 hover:text-white transition-all mb-1">
          <Home size={17} /> Zur Startseite
        </Link>
        <button onClick={logout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-white/50 hover:bg-red/10 hover:text-red transition-all">
          <LogOut size={17} /> Abmelden
        </button>
      </div>
    </aside>
  )
}
