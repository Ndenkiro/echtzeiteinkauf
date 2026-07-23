'use client'
// components/shop/hero.tsx
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MapPin, ArrowRight, Navigation, Loader2 } from 'lucide-react'
import { useCart } from '@/lib/cart-store'
import { toast } from 'sonner'

const SUGGESTIONS = [
  { label: 'Nürnberger Str. 134', sub: '90762 Fürth' },
  { label: 'Königstraße 10',      sub: '90402 Nürnberg' },
  { label: 'Hauptmarkt 1',        sub: '90402 Nürnberg' },
]

const FLOATING_ITEMS = [
  { emoji: '🥦', top: '10%', left: '2%',  size: 46, delay: '0s',   rot: -8  },
  { emoji: '🍅', top: '78%', left: '1%',  size: 40, delay: '0.6s', rot: 10  },
  { emoji: '🥛', top: '12%', left: '94%', size: 42, delay: '0.3s', rot: 6   },
  { emoji: '🧀', top: '80%', left: '95%', size: 38, delay: '1.2s', rot: 14  },
]

export function Hero() {
  const [addr, setAddr] = useState('')
  const [locating, setLocating] = useState(false)
  const setAddress = useCart(s => s.setAddress)
  const router = useRouter()

  const go = (address: string) => {
    if (!address.trim()) { toast.error('Bitte Adresse eingeben'); return }
    setAddress(address)
    router.push(`/maerkte?q=${encodeURIComponent(address)}`)
  }

  const useMyLocation = () => {
    if (!navigator.geolocation) { toast.error('Standort nicht verfügbar'); return }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      pos => {
        setLocating(false)
        setAddress('Mein Standort')
        // Pass coordinates directly
        router.push(`/maerkte?lat=${pos.coords.latitude}&lng=${pos.coords.longitude}`)
      },
      () => {
        setLocating(false)
        toast.error('Standortzugriff verweigert. Bitte in den Browser-Einstellungen erlauben.')
      }
    )
  }

  return (
    <section className="relative pt-16 overflow-hidden bg-[#0A0A0A]">
      <div className="absolute inset-0 bg-gradient-to-br from-red via-[#C00A5C] to-[#6E0339]" />
      <div className="absolute -right-32 -top-32 w-[560px] h-[560px] rounded-full bg-orange/20 blur-3xl" />
      <div className="absolute -left-24 bottom-0 w-[380px] h-[380px] rounded-full bg-black/30 blur-3xl" />
      <div className="absolute inset-0 opacity-[0.04]" style={{
        backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
        backgroundSize: '28px 28px',
      }} />

      <div className="absolute inset-y-0 left-0 w-[10%] pointer-events-none hidden xl:block">
        {FLOATING_ITEMS.filter(it => parseInt(it.left) < 50).map((it, i) => (
          <div key={i} className="absolute opacity-80 animate-float" style={{
            top: it.top, left: it.left, fontSize: it.size,
            animationDelay: it.delay, transform: `rotate(${it.rot}deg)`,
            filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.35))',
          }}>{it.emoji}</div>
        ))}
      </div>
      <div className="absolute inset-y-0 right-0 w-[8%] pointer-events-none hidden xl:block">
        {FLOATING_ITEMS.filter(it => parseInt(it.left) >= 50).map((it, i) => (
          <div key={i} className="absolute opacity-80 animate-float" style={{
            top: it.top, right: `${100 - parseInt(it.left)}%`, fontSize: it.size,
            animationDelay: it.delay, transform: `rotate(${it.rot}deg)`,
            filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.35))',
          }}>{it.emoji}</div>
        ))}
      </div>

      <div className="max-w-6xl mx-auto px-6 pt-14 pb-0 w-full grid md:grid-cols-2 gap-12 items-center relative z-10">
        {/* Left */}
        <div>
          <div className="inline-flex items-center gap-2 bg-orange text-black text-xs font-black px-3.5 py-2 rounded-full mb-5 uppercase tracking-wide shadow-[0_4px_20px_rgba(247,168,0,0.4)]">
            <span className="w-1.5 h-1.5 rounded-full bg-black animate-pulse" />
            Neu in Deutschland
          </div>
          <h1 className="text-[2.3rem] md:text-[3rem] font-black text-white leading-[1.02] tracking-[-0.02em] mb-4">
            Einkäufe<br/>
            <span className="relative inline-block px-1">
              <span className="absolute inset-0 bg-orange -z-10 rounded-md" aria-hidden="true" />
              <span className="relative text-black">in 2 Stunden</span>
            </span><br/>
            geliefert
          </h1>
          <p className="text-white/70 text-base leading-relaxed mb-7 max-w-md font-medium">
            LIDL, ALDI, REWE und mehr — persönliche Shopper kaufen und liefern direkt zu Ihnen nach Hause.
          </p>
          <div className="flex gap-7">
            {[['2h','Lieferzeit'],['8+','Märkte'],['4.9★','Bewertung'],['1.2K','Bestellungen']].map(([n,l]) => (
              <div key={l} className="text-left">
                <div className="text-[1.5rem] font-black text-white tracking-tight leading-none">{n}</div>
                <div className="text-[0.68rem] text-white/55 mt-1.5 font-bold uppercase tracking-wide">{l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Address card */}
        <div className="bg-white rounded-[28px] p-7 shadow-[0_24px_64px_rgba(0,0,0,0.45)] relative">
          <div className="absolute -top-3 -right-3 w-12 h-12 rounded-full bg-orange flex items-center justify-center text-xl shadow-lg rotate-12">🛒</div>
          <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-4">📍 Geben Sie Ihre Adresse ein</p>

          {/* Standort button */}
          <button
            onClick={useMyLocation}
            disabled={locating}
            className="w-full flex items-center gap-3 border-2 border-red/20 bg-red/5 text-red rounded-2xl px-4 py-3 mb-4 font-bold text-sm hover:bg-red hover:text-white hover:border-red transition-all disabled:opacity-60"
          >
            {locating ? <Loader2 size={18} className="animate-spin flex-shrink-0" /> : <Navigation size={18} className="flex-shrink-0" />}
            <span>{locating ? 'Standort wird ermittelt...' : 'Meinen Standort verwenden'}</span>
          </button>

          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-gray-100" />
            <span className="text-xs text-gray-400 font-bold">oder Adresse eingeben</span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>

          <div className="flex items-center gap-2 border-2 border-gray-100 bg-gray-50 rounded-2xl px-4 py-3.5 mb-4 focus-within:border-red focus-within:bg-white transition-all">
            <MapPin size={18} className="text-gray-400 flex-shrink-0" />
            <input
              type="text"
              value={addr}
              onChange={e => setAddr(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && go(addr)}
              placeholder="Straße, Hausnummer, PLZ..."
              className="flex-1 outline-none text-sm bg-transparent text-gray-900 placeholder-gray-400 font-medium"
            />
          </div>

          <div className="flex flex-col gap-2 mb-5">
            {SUGGESTIONS.map(s => (
              <button
                key={s.label}
                onClick={() => go(`${s.label}, ${s.sub}`)}
                className="flex items-center gap-3 px-3.5 py-3 border border-gray-100 rounded-2xl text-left hover:border-red hover:bg-red/[0.04] transition-all group"
              >
                <div className="w-9 h-9 rounded-xl bg-red/10 flex items-center justify-center flex-shrink-0 group-hover:bg-red group-hover:scale-110 transition-all">
                  <MapPin size={14} className="text-red group-hover:text-white transition-colors" />
                </div>
                <div>
                  <div className="text-sm font-bold text-gray-900">{s.label}</div>
                  <div className="text-xs text-gray-400">{s.sub}</div>
                </div>
                <ArrowRight size={14} className="text-gray-300 group-hover:text-red group-hover:translate-x-1 ml-auto transition-all" />
              </button>
            ))}
          </div>

          <button
            onClick={() => go(addr)}
            disabled={addr.length < 4}
            className="w-full bg-red text-white font-black rounded-2xl px-5 py-4 text-base flex items-center justify-center gap-2 transition-all hover:bg-red-dark hover:shadow-[0_8px_24px_rgba(227,6,19,0.35)] active:scale-[0.98] disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
          >
            Märkte in meiner Nähe anzeigen <ArrowRight size={18} />
          </button>
        </div>
      </div>

      <div className="relative z-10 mt-12 w-full h-[260px] md:h-[340px] overflow-hidden bg-black/20">
        <img
          src="/hero-delivery.jpg"
          alt="Echtzeiteinkauf Lieferung"
          className="w-full h-full object-cover object-center"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-transparent to-transparent pointer-events-none" />
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(var(--rot, 0deg)); }
          50% { transform: translateY(-18px) rotate(var(--rot, 0deg)); }
        }
        .animate-float { animation: float 5s ease-in-out infinite; }
      `}</style>
    </section>
  )
}
