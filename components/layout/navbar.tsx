'use client'
// components/layout/navbar.tsx
import Link from 'next/link'
import Image from 'next/image'
import { ShoppingCart, Menu, X } from 'lucide-react'
import { useCart } from '@/lib/cart-store'
import { useState, useEffect } from 'react'
import { UserMenu } from './user-menu'

const LINKS = [
  { href: '/maerkte',  label: 'Märkte' },
  { href: '/#how',     label: "So funktioniert's" },
  { href: 'https://echtzeiteinkauf.com/shopper', label: 'Shopper werden' },
]

export function Navbar() {
  const totalItems = useCart(s => s.totalItems())
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', h, { passive: true })
    return () => window.removeEventListener('scroll', h)
  }, [])

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  return (
    <>
      <nav className={`fixed top-0 left-0 right-0 z-50 bg-white transition-shadow ${scrolled ? 'shadow-md' : ''} border-b border-gray-200`}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 font-black text-red text-lg tracking-tight flex-shrink-0">
            <Image src="/logo.png" alt="Echtzeiteinkauf" width={36} height={36} className="rounded-full" priority />
            <span className="text-gray-900 hidden sm:inline">Echtzeiteinkauf</span>
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-7">
            {LINKS.map(l => (
              <Link
                key={l.href}
                href={l.href}
                className="text-sm font-bold text-gray-800 hover:text-red transition-colors whitespace-nowrap"
              >
                {l.label}
              </Link>
            ))}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2 sm:gap-3">
            <UserMenu />

            <button
              onClick={() => document.dispatchEvent(new Event('open-cart'))}
              className="relative flex items-center gap-2 bg-red text-white rounded-xl px-3 sm:px-5 py-2.5 text-sm font-black hover:bg-red-dark transition-all active:scale-95 shadow-[0_4px_14px_rgba(227,6,19,0.3)]"
            >
              <ShoppingCart size={16} />
              <span className="hidden lg:inline">Warenkorb</span>
              {totalItems > 0 && (
                <span className="bg-orange text-black text-xs font-black px-2 py-0.5 rounded-full min-w-5 text-center">
                  {totalItems}
                </span>
              )}
            </button>

            <button
              onClick={() => setMobileOpen(true)}
              className="md:hidden p-2 text-gray-700"
              aria-label="Menü öffnen"
            >
              <Menu size={20} />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-[60]">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <div className="absolute top-0 right-0 bottom-0 w-72 bg-white shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Image src="/logo.png" alt="" width={28} height={28} className="rounded-full" />
                <span className="font-black text-sm text-gray-900">Menü</span>
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                className="w-8 h-8 rounded-lg border border-gray-100 flex items-center justify-center"
              >
                <X size={16} className="text-gray-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-3">
              {LINKS.map(l => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setMobileOpen(false)}
                  className="block px-5 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50 hover:text-red transition-colors"
                >
                  {l.label}
                </Link>
              ))}
            </div>

            <div className="border-t border-gray-100 p-5">
              <MobileAuthLinks onNavigate={() => setMobileOpen(false)} />
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// Mobile auth section — separate so it can use its own session state
function MobileAuthLinks({ onNavigate }: { onNavigate: () => void }) {
  const [href, setHref] = useState('/anmelden')
  const [label, setLabel] = useState('Anmelden')

  useEffect(() => {
    (async () => {
      const { createBrowserClient } = await import('@supabase/ssr')
      const supabase = createBrowserClient(
        'https://wpxpgszzzfhhsaunolyq.supabase.co',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndweHBnc3p6emZoaHNhdW5vbHlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0Mzg5ODQsImV4cCI6MjA5NzAxNDk4NH0.8_DVpLNwItAlkn_gL9a4dn-lZ00I8iifX2Cb9N_W-4U'
      )
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase
        .from('users').select('full_name, role').eq('auth_id', user.id).maybeSingle()
      if (!profile) return

      setLabel(`Hallo, ${profile.full_name?.split(' ')[0] || 'Konto'}`)
      setHref(
        profile.role === 'shopper' ? '/shopper-portal'
        : ['admin', 'subadmin'].includes(profile.role) ? 'https://admin.echtzeiteinkauf.com'
        : '/konto'
      )
    })()
  }, [])

  return (
    <Link
      href={href}
      onClick={onNavigate}
      className="block w-full text-center bg-red text-white font-black rounded-xl py-3 text-sm hover:bg-red-dark transition-colors"
    >
      {label}
    </Link>
  )
}
