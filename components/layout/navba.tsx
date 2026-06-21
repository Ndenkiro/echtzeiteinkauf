'use client'
// components/layout/navbar.tsx
import Link from 'next/link'
import Image from 'next/image'
import { ShoppingCart, Menu } from 'lucide-react'
import { useCart } from '@/lib/cart-store'
import { useState, useEffect } from 'react'

export function Navbar() {
  const totalItems = useCart(s => s.totalItems())
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', h, { passive: true })
    return () => window.removeEventListener('scroll', h)
  }, [])

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 bg-white transition-shadow ${scrolled ? 'shadow-md' : ''} border-b border-gray-200`}>
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 font-black text-red text-lg tracking-tight">
          <Image src="/logo.png" alt="Echtzeiteinkauf" width={36} height={36} className="rounded-full" priority />
          <span className="text-gray-900">Echtzeiteinkauf</span>
        </Link>

        <div className="hidden md:flex items-center gap-7">
          {[['#stores','Märkte'],['#how','So funktioniert\'s'],['#shopper','Shopper werden']].map(([href,label]) => (
            <a key={href} href={href} className="text-sm font-bold text-gray-800 hover:text-red transition-colors">{label}</a>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <button className="hidden md:block text-sm font-bold text-gray-700 border border-gray-300 rounded-xl px-4 py-2.5 hover:border-red hover:text-red transition-all bg-white">
            Anmelden
          </button>
          <button
            onClick={() => document.dispatchEvent(new Event('open-cart'))}
            className="relative flex items-center gap-2 bg-red text-white rounded-xl px-5 py-2.5 text-sm font-black hover:bg-red-dark transition-all active:scale-95 shadow-[0_4px_14px_rgba(227,6,19,0.3)]"
          >
            <ShoppingCart size={16} />
            <span className="hidden sm:inline">Warenkorb</span>
            {totalItems > 0 && (
              <span className="bg-orange text-black text-xs font-black px-2 py-0.5 rounded-full min-w-5 text-center">
                {totalItems}
              </span>
            )}
          </button>
          <button className="md:hidden p-2"><Menu size={20} /></button>
        </div>
      </div>
    </nav>
  )
}
