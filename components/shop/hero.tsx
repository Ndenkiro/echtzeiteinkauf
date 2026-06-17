'use client'
// components/shop/hero.tsx
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MapPin, ArrowRight } from 'lucide-react'
import { useCart } from '@/lib/cart-store'
import { toast } from 'sonner'

const SUGGESTIONS = [
  { label: 'Nürnberger Str. 134', sub: '90762 Fürth' },
  { label: 'Königstraße 10',      sub: '90402 Nürnberg' },
  { label: 'Hauptmarkt 1',        sub: '90402 Nürnberg' },
]

export function Hero() {
  const [addr, setAddr] = useState('')
  const setAddress = useCart(s => s.setAddress)
  const router = useRouter()

  const go = (address: string) => {
    if (!address.trim()) { toast.error('Bitte Adresse eingeben'); return }
    setAddress(address)
    document.getElementById('stores')?.scrollIntoView({ behavior: 'smooth' })
    toast.success('Märkte in Ihrer Nähe werden angezeigt 📍')
  }

  return (
    <section className="pt-16 bg-red min-h-[580px] flex items-center relative overflow-hidden">
      {/* Background orbs */}
      <div className="absolute right-[-80px] top-[-80px] w-[400px] h-[400px] rounded-full bg-orange/15 pointer-events-none" />
      <div className="absolute left-[-60px] bottom-[-60px] w-[250px] h-[250px] rounded-full bg-orange/10 pointer-events-none" />

      <div className="max-w-6xl mx-auto px-6 py-16 w-full grid md:grid-cols-2 gap-12 items-center relative z-10">
        {/* Left */}
        <div>
          <div className="inline-flex items-center gap-1.5 bg-orange text-black text-xs font-black px-3 py-1.5 rounded-full mb-5 uppercase tracking-wide">
            ⚡ Neu in Deutschland
          </div>
          <h1 className="text-5xl md:text-6xl font-black text-white leading-[1.05] tracking-tight mb-4">
            Einkäufe in<br/><span className="text-orange">2 Stunden</span><br/>geliefert
          </h1>
          <p className="text-white/75 text-lg leading-relaxed mb-8 max-w-md">
            LIDL, ALDI, REWE und mehr — persönliche Shopper kaufen und liefern direkt zu Ihnen nach Hause.
          </p>
          <div className="flex gap-6">
            {[['2h','Lieferzeit'],['8+','Märkte'],['4.9★','Bewertung'],['1.2K','Bestellungen']].map(([n,l]) => (
              <div key={l} className="text-center">
                <div className="text-2xl font-black text-white tracking-tight">{n}</div>
                <div className="text-xs text-white/60 mt-0.5 font-medium">{l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Address card */}
        <div className="bg-white rounded-3xl p-6 shadow-2xl">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">📍 Geben Sie Ihre Adresse ein</p>

          <div className="flex items-center gap-2 border-2 border-gray-200 rounded-xl px-4 py-3 mb-4 focus-within:border-red transition-colors">
            <MapPin size={18} className="text-gray-400 flex-shrink-0" />
            <input
              type="text"
              value={addr}
              onChange={e => setAddr(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && go(addr)}
              placeholder="Straße, Hausnummer, PLZ..."
              className="flex-1 outline-none text-sm bg-transparent text-gray-900 placeholder-gray-400"
            />
          </div>

          <div className="flex flex-col gap-2 mb-4">
            {SUGGESTIONS.map(s => (
              <button
                key={s.label}
                onClick={() => { setAddr(`${s.label}, ${s.sub}`); go(`${s.label}, ${s.sub}`) }}
                className="flex items-center gap-3 px-3 py-2.5 border border-gray-100 rounded-xl text-left hover:border-red hover:bg-red/5 transition-all group"
              >
                <div className="w-8 h-8 rounded-lg bg-red/10 flex items-center justify-center flex-shrink-0">
                  <MapPin size={14} className="text-red" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-900">{s.label}</div>
                  <div className="text-xs text-gray-400">{s.sub}</div>
                </div>
                <ArrowRight size={14} className="text-gray-300 group-hover:text-red ml-auto transition-colors" />
              </button>
            ))}
          </div>

          <button
            onClick={() => go(addr)}
            disabled={addr.length < 4}
            className="btn-red w-full py-4 text-base"
          >
            Märkte in meiner Nähe anzeigen <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </section>
  )
}
