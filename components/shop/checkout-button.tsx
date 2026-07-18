'use client'
// components/shop/checkout-button.tsx
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { CreditCard, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useCart } from '@/lib/cart-store'
import { PromoInput } from './promo-input'

const SUPABASE_URL = 'https://wpxpgszzzfhhsaunolyq.supabase.co'
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndweHBnc3p6emZoaHNhdW5vbHlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0Mzg5ODQsImV4cCI6MjA5NzAxNDk4NH0.8_DVpLNwItAlkn_gL9a4dn-lZ00I8iifX2Cb9N_W-4U'

type PromoResult = {
  id: string; code: string; discount_type: 'percent' | 'fixed'
  discount_value: number; discount_amount: number
}

const TIP_OPTIONS = [0, 1, 2, 5]

export function CheckoutSection({ storeId, deliveryFee }: { storeId: string; deliveryFee: number }) {
  const router = useRouter()
  const items = useCart(s => s.items)
  const address = useCart(s => s.address)
  const [promo, setPromo] = useState<PromoResult | null>(null)
  const [tip, setTip] = useState(0)
  const [loading, setLoading] = useState(false)

  const subtotal = items.reduce((a, i) => a + Number(i.product.price) * i.quantity, 0)
  const serviceFee = Math.round(subtotal * 0.05 * 100) / 100
  const discount = promo?.discount_amount || 0
  const total = Math.max(0, subtotal + serviceFee + deliveryFee + tip - discount)

  const checkout = async () => {
    // Check auth first
    const supabase = createBrowserClient(SUPABASE_URL, SUPABASE_ANON)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      toast.error('Bitte melden Sie sich an, um zu bestellen')
      router.push('/anmelden?next=/')
      return
    }

    if (!address) {
      toast.error('Bitte geben Sie Ihre Lieferadresse ein')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map(i => ({ productId: i.product.id, quantity: i.quantity })),
          storeId,
          address: { street: address, city: 'Nürnberg', zip: '90402' },
          promoCode: promo?.code || null,
          tipAmount: tip,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Checkout fehlgeschlagen')

      // Redirect to Stripe
      window.location.href = data.url
    } catch (err: any) {
      toast.error(err.message)
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Promo code */}
      <PromoInput subtotal={subtotal} onApply={setPromo} applied={promo} />

      {/* Tip selector */}
      <div>
        <div className="text-xs font-black text-gray-400 uppercase tracking-wide mb-2">
          Trinkgeld für Ihren Shopper 💛
        </div>
        <div className="flex gap-2">
          {TIP_OPTIONS.map(t => (
            <button
              key={t}
              onClick={() => setTip(t)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold border-2 transition-all ${
                tip === t ? 'border-red bg-red/5 text-red' : 'border-gray-100 text-gray-500 hover:border-gray-200'
              }`}
            >{t === 0 ? 'Kein' : `${t} €`}</button>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="bg-gray-50 rounded-2xl p-4 flex flex-col gap-2 text-sm">
        <div className="flex justify-between text-gray-500">
          <span>Zwischensumme</span><span>{subtotal.toFixed(2)} €</span>
        </div>
        <div className="flex justify-between text-gray-500">
          <span>Servicegebühr (5%)</span><span>{serviceFee.toFixed(2)} €</span>
        </div>
        <div className="flex justify-between text-gray-500">
          <span>Liefergebühr</span><span>{deliveryFee.toFixed(2)} €</span>
        </div>
        {tip > 0 && (
          <div className="flex justify-between text-gray-500">
            <span>Trinkgeld</span><span>{tip.toFixed(2)} €</span>
          </div>
        )}
        {discount > 0 && (
          <div className="flex justify-between text-green-600 font-bold">
            <span>Rabatt ({promo?.code})</span><span>− {discount.toFixed(2)} €</span>
          </div>
        )}
        <div className="border-t border-gray-200 pt-2 flex justify-between font-black text-gray-900 text-base">
          <span>Gesamt</span><span>{total.toFixed(2)} €</span>
        </div>
      </div>

      {/* Checkout button */}
      <button
        onClick={checkout}
        disabled={loading || items.length === 0}
        className="btn-red w-full py-4 text-base"
      >
        {loading
          ? <><Loader2 size={18} className="animate-spin" /> Wird weitergeleitet...</>
          : <><CreditCard size={18} /> Jetzt bezahlen — {total.toFixed(2)} €</>}
      </button>

      <p className="text-xs text-gray-400 text-center">
        🔒 Sichere Zahlung über Stripe · Kreditkarte, Apple Pay, Google Pay
      </p>
    </div>
  )
}
