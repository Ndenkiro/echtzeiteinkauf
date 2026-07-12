'use client'
// components/shop/promo-input.tsx
import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Tag, Check, X, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

const SUPABASE_URL = 'https://wpxpgszzzfhhsaunolyq.supabase.co'
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndweHBnc3p6emZoaHNhdW5vbHlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0Mzg5ODQsImV4cCI6MjA5NzAxNDk4NH0.8_DVpLNwItAlkn_gL9a4dn-lZ00I8iifX2Cb9N_W-4U'

type PromoResult = {
  id: string
  code: string
  discount_type: 'percent' | 'fixed'
  discount_value: number
  discount_amount: number  // calculated for this order
}

type Props = {
  subtotal: number
  onApply: (promo: PromoResult | null) => void
  applied: PromoResult | null
}

export function PromoInput({ subtotal, onApply, applied }: Props) {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)

  const supabase = createBrowserClient(SUPABASE_URL, SUPABASE_ANON)

  const validate = async () => {
    if (!code.trim()) return
    setLoading(true)

    const { data: promo } = await supabase
      .from('promo_codes')
      .select('*')
      .eq('code', code.toUpperCase().trim())
      .eq('is_active', true)
      .single()

    setLoading(false)

    if (!promo) { toast.error('Ungültiger Code'); return }

    // Check expiry
    if (promo.valid_until && new Date(promo.valid_until) < new Date()) {
      toast.error('Dieser Code ist abgelaufen'); return
    }

    // Check max uses
    if (promo.max_uses !== null && promo.used_count >= promo.max_uses) {
      toast.error('Dieser Code wurde bereits zu oft verwendet'); return
    }

    // Check min order
    if (subtotal < promo.min_order) {
      toast.error(`Mindestbestellwert: ${promo.min_order.toFixed(2)} €`); return
    }

    // Calculate discount
    let discount_amount = 0
    if (promo.discount_type === 'percent') {
      discount_amount = Math.round(subtotal * promo.discount_value / 100 * 100) / 100
    } else {
      discount_amount = Math.min(promo.discount_value, subtotal)
    }

    toast.success(`Code angewendet! Sie sparen ${discount_amount.toFixed(2)} € 🎉`)
    onApply({
      id: promo.id,
      code: promo.code,
      discount_type: promo.discount_type,
      discount_value: promo.discount_value,
      discount_amount,
    })
    setCode('')
  }

  const remove = () => {
    onApply(null)
    toast.success('Code entfernt')
  }

  if (applied) {
    return (
      <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-2xl px-4 py-3">
        <div className="flex items-center gap-2">
          <Check size={16} className="text-green-600" />
          <div>
            <span className="font-black text-green-800 text-sm tracking-widest">{applied.code}</span>
            <span className="text-green-600 text-sm ml-2">
              − {applied.discount_amount.toFixed(2)} €
            </span>
          </div>
        </div>
        <button onClick={remove} className="text-green-400 hover:text-green-700 transition-colors">
          <X size={16} />
        </button>
      </div>
    )
  }

  return (
    <div className="flex gap-2">
      <div className="flex-1 flex items-center gap-2 border-2 border-gray-100 rounded-2xl px-4 py-3 focus-within:border-red transition-colors">
        <Tag size={16} className="text-gray-400 flex-shrink-0" />
        <input
          value={code}
          onChange={e => setCode(e.target.value.toUpperCase())}
          onKeyDown={e => e.key === 'Enter' && validate()}
          placeholder="Aktionscode eingeben"
          className="flex-1 outline-none text-sm bg-transparent font-bold tracking-widest placeholder:font-normal placeholder:tracking-normal"
        />
      </div>
      <button
        onClick={validate}
        disabled={loading || !code.trim()}
        className="px-4 py-3 bg-gray-900 text-white font-bold rounded-2xl text-sm hover:bg-black transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
      >
        {loading ? <Loader2 size={15} className="animate-spin" /> : 'Anwenden'}
      </button>
    </div>
  )
}
