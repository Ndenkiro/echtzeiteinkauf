'use client'
// components/shop/checkout-button.tsx — free commission model
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { CreditCard, Loader2, MapPin, Package, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { useCart } from '@/lib/cart-store'
import { PromoInput } from './promo-input'
import { CommissionInput } from './commission-input'

const SUPABASE_URL = 'https://wpxpgszzzfhhsaunolyq.supabase.co'
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndweHBnc3p6emZoaHNhdW5vbHlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0Mzg5ODQsImV4cCI6MjA5NzAxNDk4NH0.8_DVpLNwItAlkn_gL9a4dn-lZ00I8iifX2Cb9N_W-4U'
const GOOGLE_MAPS_API_KEY = 'AIzaSyDExSOafkqdChm7ZkqVYAVD2W271a-mU2I'

type PromoResult = {
  id: string; code: string; discount_type: 'percent' | 'fixed'
  discount_value: number; discount_amount: number
}

const TIP_OPTIONS = [0, 1, 2, 5]

export function CheckoutSection({ storeId, storeLat, storeLng }: {
  storeId: string; storeLat?: number; storeLng?: number
}) {
  const router = useRouter()
  const items = useCart(s => s.items)
  const address = useCart(s => s.address)

  const [addressInput, setAddressInput] = useState(address || '')
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [distanceKm, setDistanceKm] = useState(0)
  const [geocoding, setGeocoding] = useState(false)

  const [commission, setCommission] = useState(0)
  const [tip, setTip] = useState(0)
  const [promo, setPromo] = useState<PromoResult | null>(null)
  const [loading, setLoading] = useState(false)

  const supabase = createBrowserClient(SUPABASE_URL, SUPABASE_ANON)

  const subtotal = items.reduce((a, i) => a + Number(i.product.price) * i.quantity, 0)
  const serviceFee = Math.round(subtotal * 0.05 * 100) / 100
  const discount = promo?.discount_amount || 0
  const total = Math.max(0, subtotal + serviceFee + commission + tip - discount)

  const haversine = (a: any, b: any) => {
    const R = 6371
    const dLat = (b.lat - a.lat) * Math.PI / 180
    const dLng = (b.lng - a.lng) * Math.PI / 180
    const x = Math.sin(dLat/2)**2 +
      Math.cos(a.lat*Math.PI/180) * Math.cos(b.lat*Math.PI/180) * Math.sin(dLng/2)**2
    return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1-x))
  }

  const checkAddress = async () => {
    if (!addressInput.trim()) { toast.error('Bitte Adresse eingeben'); return }
    if (!storeLat || !storeLng) { toast.error('Markt-Koordinaten fehlen'); return }

    setGeocoding(true)
    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(addressInput + ', Deutschland')}&region=DE&key=${GOOGLE_MAPS_API_KEY}`
      )
      const data = await res.json()
      setGeocoding(false)

      if (data.status !== 'OK' || !data.results?.[0]) {
        toast.error('Adresse nicht gefunden — bitte vollständige Adresse angeben')
        return
      }
      const l = data.results[0].geometry.location
      const c = { lat: l.lat, lng: l.lng }
      setCoords(c)
      setDistanceKm(Math.round(haversine({ lat: storeLat, lng: storeLng }, c) * 10) / 10)
    } catch {
      setGeocoding(false)
      toast.error('Fehler bei der Adresssuche')
    }
  }

  const checkout = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { toast.error('Bitte melden Sie sich an'); router.push('/anmelden?next=/'); return }
    if (!coords) { toast.error('Bitte Adresse prüfen'); return }
    if (commission <= 0) { toast.error('Bitte legen Sie eine Provision fest'); return }

    setLoading(true)
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map(i => ({ productId: i.product.id, quantity: i.quantity })),
          storeId,
          address: {
            street: addressInput, city: 'Deutschland', zip: '',
            lat: coords.lat, lng: coords.lng,
          },
          promoCode: promo?.code || null,
          commission,
          tipAmount: tip,
          distanceKm,
          customerLat: coords.lat,
          customerLng: coords.lng,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      window.location.href = data.url
    } catch (err: any) {
      toast.error(err.message)
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Address */}
      <div>
        <label className="text-xs font-black text-gray-400 uppercase tracking-wide mb-2 block">
          📍 Ihre Lieferadresse
        </label>
        <div className="flex gap-2">
          <div className="flex-1 flex items-center gap-2 border-2 border-gray-100 rounded-2xl px-4 py-3 focus-within:border-red transition-colors">
            <MapPin size={15} className="text-gray-400 flex-shrink-0" />
            <input
              value={addressInput}
              onChange={e => { setAddressInput(e.target.value); setCoords(null) }}
              onKeyDown={e => e.key === 'Enter' && checkAddress()}
              placeholder="z.B. Königstraße 10, 90402 Nürnberg"
              className="flex-1 outline-none text-sm bg-transparent"
            />
          </div>
          <button
            onClick={checkAddress}
            disabled={geocoding || !addressInput.trim()}
            className="px-4 border-2 border-gray-100 rounded-2xl text-xs font-bold text-gray-600 hover:border-red hover:text-red transition-all disabled:opacity-40 flex-shrink-0"
          >
            {geocoding ? <Loader2 size={14} className="animate-spin" /> : 'Prüfen'}
          </button>
        </div>
        {coords && (
          <p className="text-xs text-green-600 font-bold mt-1.5 flex items-center gap-1">
            <CheckCircle2 size={13} /> {distanceKm} km vom Markt entfernt
          </p>
        )}
      </div>

      {/* Commission — only once the distance is known */}
      {coords && (
        <CommissionInput
          distanceKm={distanceKm}
          itemCount={items.length}
          value={commission}
          onChange={setCommission}
        />
      )}

      {/* Promo */}
      <PromoInput subtotal={subtotal} onApply={setPromo} applied={promo} />

      {/* Tip */}
      <div>
        <div className="text-xs font-black text-gray-400 uppercase tracking-wide mb-2">
          Trinkgeld 💛 <span className="font-normal normal-case">(optional, zusätzlich)</span>
        </div>
        <div className="flex gap-2">
          {TIP_OPTIONS.map(t => (
            <button key={t} onClick={() => setTip(t)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold border-2 transition-all ${
                tip === t ? 'border-red bg-red/5 text-red' : 'border-gray-100 text-gray-500'
              }`}>{t === 0 ? 'Kein' : `${t} €`}</button>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="bg-gray-50 rounded-2xl p-4 flex flex-col gap-2 text-sm">
        <div className="flex justify-between text-gray-500">
          <span>Warenwert</span><span>{subtotal.toFixed(2)} €</span>
        </div>
        <div className="flex justify-between text-gray-500">
          <span>Servicegebühr (5 %)</span><span>{serviceFee.toFixed(2)} €</span>
        </div>
        <div className="flex justify-between text-gray-700 font-bold">
          <span>Provision für Shopper</span><span>{commission.toFixed(2)} €</span>
        </div>
        {tip > 0 && (
          <div className="flex justify-between text-gray-500">
            <span>Trinkgeld</span><span>{tip.toFixed(2)} €</span>
          </div>
        )}
        {discount > 0 && (
          <div className="flex justify-between text-green-600 font-bold">
            <span>Rabatt ({promo?.code})</span><span>−{discount.toFixed(2)} €</span>
          </div>
        )}
        <div className="border-t border-gray-200 pt-2 flex justify-between font-black text-gray-900 text-base">
          <span>Gesamt</span><span>{total.toFixed(2)} €</span>
        </div>
      </div>

      <button
        onClick={checkout}
        disabled={loading || items.length === 0 || !coords || commission <= 0}
        className="btn-red w-full py-4 text-base"
      >
        {loading ? <><Loader2 size={18} className="animate-spin" /> Wird weitergeleitet…</>
          : !coords ? 'Adresse prüfen um fortzufahren'
          : <><CreditCard size={18} /> Jetzt bezahlen — {total.toFixed(2)} €</>}
      </button>

      <p className="text-xs text-gray-400 text-center">
        🔒 Sichere Zahlung über Stripe
      </p>
    </div>
  )
}
