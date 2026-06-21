'use client'
// components/account/sidebar.tsx
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { Package, User, MapPin, LogOut, Home } from 'lucide-react'
import { supabaseBrowser } from '@/lib/supabase'

const NAV = [
  { href: '/konto',            label: 'Bestellungen', icon: Package },
  { href: '/konto/profil',     label: 'Profil',        icon: User },
  { href: '/konto/adressen',   label: 'Adressen',       icon: MapPin },
]

export function AccountSidebar({ name, email }: { name: string; email: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = supabaseBrowser()

  const logout = async () => {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'K'

  return (
    <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-100 fixed top-0 bottom-0 left-0">
      <Link href="/" className="flex items-center gap-2 px-6 py-5 border-b border-gray-100">
        <Image src="/logo.png" alt="Echtzeiteinkauf" width={30} height={30} className="rounded-full" />
        <span className="font-black text-sm text-gray-900">Echtzeiteinkauf</span>
      </Link>

      <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-red/10 flex items-center justify-center font-black text-red text-sm flex-shrink-0">
          {initials}
        </div>
        <div className="min-w-0">
          <div className="font-bold text-sm text-gray-900 truncate">{name}</div>
          <div className="text-xs text-gray-400 truncate">{email}</div>
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
        <Link href="/" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-all mb-1">
          <Home size={17} /> Zur Startseite
        </Link>
        <button onClick={logout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-gray-500 hover:bg-red/5 hover:text-red transition-all">
          <LogOut size={17} /> Abmelden
        </button>
      </div>
    </aside>
  )
}
