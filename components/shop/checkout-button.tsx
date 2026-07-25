'use client'
// components/shop/checkout-button.tsx — with dynamic delivery fee via Geocoding REST API
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { CreditCard, Loader2, MapPin, Clock, Package, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { useCart } from '@/lib/cart-store'
import { PromoInput } from './promo-input'

const SUPABASE_URL = 'https://wpxpgszzzfhhsaunolyq.supabase.co'
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndweHBnc3p6emZoaHNhdW5vbHlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0Mzg5ODQsImV4cCI6MjA5NzAxNDk4NH0.8_DVpLNwItAlkn_gL9a4dn-lZ00I8iifX2Cb9N_W-4U'
const GOOGLE_MAPS_API_KEY = 'AIzaSyDExSOafkqdChm7ZkqVYAVD2W271a-mU2I'

type PromoResult = {
  id: string; code: string; discount_type: 'percent' | 'fixed'
  discount_value: number; discount_amount: number
}

type FeeResult = {
  distanceKm: number; baseFee: number; peakSurcharge: number
  totalFee: number; isPeakHour: boolean; estimatedWeightKg: number
  peakMessage: string | null
}

const TIP_OPTIONS = [0, 1, 2, 5]

export function CheckoutSection({ storeId, storeLat, storeLng }: {
  storeId: string; storeLat?: number; storeLng?: number
}) {
  const router = useRouter()
  const items = useCart(s => s.items)
  const address = useCart(s => s.address)
  const [promo, setPromo] = useState<PromoResult | null>(null)
  const [tip, setTip] = useState(0)
  const [loading, setLoading] = useState(false)
  const [feeData, setFeeData] = useState<FeeResult | null>(null)
  const [feeLoading, setFeeLoading] = useState(false)
  const [customerCoords, setCustomerCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [addressInput, setAddressInput] = useState(address || '')

  const supabase = createBrowserClient(SUPABASE_URL, SUPABASE_ANON)
  const subtotal = items.reduce((a, i) => a + Number(i.product.price) * i.quantity, 0)

  // Geocode via REST API (no JS SDK needed)
  const geocodeAddress = async (addr: string) => {
    if (!addr.trim() || !storeLat || !storeLng) {
      if (!storeLat || !storeLng) toast.error('Store-Koordinaten fehlen')
      return
    }
    setFeeLoading(true)
    try {
      const encoded = encodeURIComponent(addr + ', Deutschland')
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encoded}&region=DE&key=${GOOGLE_MAPS_API_KEY}`
      )
      const data = await res.json()

      if (data.status !== 'OK' || !data.results?.[0]) {
        toast.error('Adresse nicht gefunden. Bitte vollständige Adresse eingeben.')
        setFeeLoading(false)
        return
      }

      const loc = data.results[0].geometry.location
      const coords = { lat: loc.lat, lng: loc.lng }
      setCustomerCoords(coords)

      // Calculate fee
      const feeRes = await fetch('/api/delivery-fee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeLat, storeLng,
          customerLat: coords.lat, customerLng: coords.lng,
          itemCount: items.length,
        }),
      })
      const feeJson = await feeRes.json()
      setFeeData(feeJson)
    } catch (err) {
      toast.error('Fehler bei der Adresssuche')
    }
    setFeeLoading(false)
  }

  // Recalculate when items change
  useEffect(() => {
    if (customerCoords && storeLat && storeLng) {
      fetch('/api/delivery-fee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeLat, storeLng,
          customerLat: customerCoords.lat, customerLng: customerCoords.lng,
          itemCount: items.length,
        }),
      }).then(r => r.json()).then(setFeeData)
    }
  }, [items.length])

  const deliveryFee = feeData?.totalFee ?? 1.99
  const serviceFee = Math.round(subtotal * 0.05 * 100) / 100
  const discount = promo?.discount_amount || 0
  const total = Math.max(0, subtotal + serviceFee + deliveryFee + tip - discount)

  const checkout = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { toast.error('Bitte melden Sie sich an'); router.push('/anmelden?next=/'); return }
    if (!addressInput.trim()) { toast.error('Bitte Lieferadresse eingeben'); return }
    if (!customerCoords) { toast.error('Bitte Adresse prüfen'); return }

    setLoading(true)
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map(i => ({ productId: i.product.id, quantity: i.quantity })),
          storeId,
          address: {
            street: addressInput,
            city: 'Deutschland',
            zip: '',
            lat: customerCoords.lat,
            lng: customerCoords.lng,
          },
          promoCode: promo?.code || null,
          tipAmount: tip,
          deliveryFee,
          distanceKm: feeData?.distanceKm,
          isPeakHour: feeData?.isPeakHour,
          customerLat: customerCoords.lat,
          customerLng: customerCoords.lng,
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
    <div className="flex flex-col gap-4">
      {/* Address input */}
      <div>
        <label className="text-xs font-black text-gray-400 uppercase tracking-wide mb-2 block">
          📍 Ihre Lieferadresse
        </label>
        <div className="flex gap-2">
          <div className="flex-1 flex items-center gap-2 border-2 border-gray-100 rounded-2xl px-4 py-3 focus-within:border-red transition-colors">
            <MapPin size={15} className="text-gray-400 flex-shrink-0" />
            <input
              value={addressInput}
              onChange={e => setAddressInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && geocodeAddress(addressInput)}
              placeholder="z.B. Königstraße 10, 90402 Nürnberg"
              className="flex-1 outline-none text-sm bg-transparent"
            />
          </div>
          <button
            onClick={() => geocodeAddress(addressInput)}
            disabled={feeLoading || !addressInput.trim()}
            className="px-4 border-2 border-gray-100 rounded-2xl text-xs font-bold text-gray-600 hover:border-red hover:text-red transition-all disabled:opacity-40 flex-shrink-0"
          >
            {feeLoading ? <Loader2 size={14} className="animate-spin" /> : 'Prüfen'}
          </button>
        </div>
        {customerCoords && (
          <p className="text-xs text-green-600 font-bold mt-1.5 flex items-center gap-1">
            ✓ Adresse gefunden — {feeData?.distanceKm} km vom Markt
          </p>
        )}
      </div>

      {/* Fee breakdown */}
      {feeData && (
        <div className="bg-blue-50 rounded-2xl p-4 flex flex-col gap-2 text-sm">
          <div className="flex items-center gap-2 font-black text-blue-900 mb-1">
            <Package size={15} /> Lieferdetails
          </div>
          <div className="flex justify-between text-blue-700 text-xs">
            <span>📏 Entfernung</span><span>{feeData.distanceKm} km</span>
          </div>
          <div className="flex justify-between text-blue-700 text-xs">
            <span>📦 Geschätztes Gewicht</span><span>~{feeData.estimatedWeightKg} kg</span>
          </div>
          <div className="flex justify-between text-blue-700 text-xs">
            <span>Grundgebühr</span><span>{feeData.baseFee.toFixed(2)} €</span>
          </div>
          {feeData.isPeakHour && (
            <div className="flex justify-between text-orange-600 text-xs font-bold">
              <span>🕐 Stoßzeit +30%</span><span>+{feeData.peakSurcharge.toFixed(2)} €</span>
            </div>
          )}
          <div className="border-t border-blue-200 pt-2 flex justify-between font-black text-blue-900">
            <span>Liefergebühr</span><span>{feeData.totalFee.toFixed(2)} €</span>
          </div>
          {feeData.isPeakHour && (
            <div className="flex items-center gap-1.5 text-[10px] text-orange-600 bg-orange-50 rounded-lg px-2 py-1">
              <AlertCircle size={11} /> Stoßzeit: 7–9 Uhr und 16–19 Uhr
            </div>
          )}
        </div>
      )}

      {/* Promo */}
      <PromoInput subtotal={subtotal} onApply={setPromo} applied={promo} />

      {/* Tip */}
      <div>
        <div className="text-xs font-black text-gray-400 uppercase tracking-wide mb-2">Trinkgeld 💛</div>
        <div className="flex gap-2">
          {TIP_OPTIONS.map(t => (
            <button key={t} onClick={() => setTip(t)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold border-2 transition-all ${tip === t ? 'border-red bg-red/5 text-red' : 'border-gray-100 text-gray-500'}`}
            >{t === 0 ? 'Kein' : `${t} €`}</button>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="bg-gray-50 rounded-2xl p-4 flex flex-col gap-2 text-sm">
        <div className="flex justify-between text-gray-500"><span>Zwischensumme</span><span>{subtotal.toFixed(2)} €</span></div>
        <div className="flex justify-between text-gray-500"><span>Servicegebühr (5%)</span><span>{serviceFee.toFixed(2)} €</span></div>
        <div className="flex justify-between text-gray-500">
          <span>Liefergebühr {feeData?.isPeakHour ? '🕐' : ''}</span>
          <span>{deliveryFee.toFixed(2)} €</span>
        </div>
        {tip > 0 && <div className="flex justify-between text-gray-500"><span>Trinkgeld</span><span>{tip.toFixed(2)} €</span></div>}
        {discount > 0 && <div className="flex justify-between text-green-600 font-bold"><span>Rabatt ({promo?.code})</span><span>−{discount.toFixed(2)} €</span></div>}
        <div className="border-t border-gray-200 pt-2 flex justify-between font-black text-gray-900 text-base">
          <span>Gesamt</span><span>{total.toFixed(2)} €</span>
        </div>
      </div>

      <button
        onClick={checkout}
        disabled={loading || items.length === 0 || !customerCoords}
        className="btn-red w-full py-4 text-base"
      >
        {loading ? <><Loader2 size={18} className="animate-spin" /> Wird weitergeleitet...</>
          : !customerCoords ? 'Adresse prüfen um fortzufahren'
          : <><CreditCard size={18} /> Jetzt bezahlen — {total.toFixed(2)} €</>}
      </button>

      {!customerCoords && items.length > 0 && (
        <p className="text-xs text-center text-gray-400">Bitte Adresse eingeben und auf "Prüfen" klicken</p>
      )}
      <p className="text-xs text-gray-400 text-center">🔒 Sichere Zahlung über Stripe</p>
    </div>
  )
}
