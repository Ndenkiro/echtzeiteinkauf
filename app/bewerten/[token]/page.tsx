'use client'
// app/bewerten/[token]/page.tsx
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { Star } from 'lucide-react'
import { toast } from 'sonner'
import Image from 'next/image'

const SUPABASE_URL = 'https://wpxpgszzzfhhsaunolyq.supabase.co'
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndweHBnc3p6emZoaHNhdW5vbHlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0Mzg5ODQsImV4cCI6MjA5NzAxNDk4NH0.8_DVpLNwItAlkn_gL9a4dn-lZ00I8iifX2Cb9N_W-4U'

export default function BewertenPage() {
  const { token } = useParams<{ token: string }>()
  const router = useRouter()
  const [stars, setStars] = useState(0)
  const [hover, setHover] = useState(0)
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [order, setOrder] = useState<any>(null)
  const [error, setError] = useState('')

  const supabase = createBrowserClient(SUPABASE_URL, SUPABASE_ANON)

  useEffect(() => {
    (async () => {
      // Validate token
      const { data: tokenRow } = await supabase
        .from('rating_tokens')
        .select('*, orders(id, customer_id, shopper_id, stores(name), shoppers(id, rating, users(full_name)))')
        .eq('token', token)
        .single()

      if (!tokenRow) { setError('Ungültiger oder abgelaufener Link.'); setLoading(false); return }
      if (tokenRow.used) { setError('Dieser Link wurde bereits verwendet.'); setLoading(false); return }
      if (new Date(tokenRow.expires_at) < new Date()) { setError('Dieser Link ist abgelaufen.'); setLoading(false); return }

      // Check if already rated
      const { data: existing } = await supabase
        .from('ratings')
        .select('id')
        .eq('order_id', tokenRow.order_id)
        .maybeSingle()

      if (existing) { setDone(true); setLoading(false); return }

      setOrder(tokenRow.orders)
      setLoading(false)
    })()
  }, [token])

  const submit = async () => {
    if (stars === 0) { toast.error('Bitte wählen Sie eine Bewertung'); return }
    setSubmitting(true)

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { toast.error('Bitte melden Sie sich an'); setSubmitting(false); return }

    const { data: profile } = await supabase
      .from('users').select('id').eq('auth_id', user.id).single()

    // Insert rating
    const { error } = await supabase.from('ratings').insert({
      order_id:    order.id,
      shopper_id:  order.shopper_id,
      customer_id: profile?.id,
      stars,
      comment: comment.trim() || null,
    })

    if (error) { toast.error('Fehler beim Speichern'); setSubmitting(false); return }

    // Mark token as used
    await supabase.from('rating_tokens').update({ used: true }).eq('token', token)

    setDone(true)
    setSubmitting(false)
  }

  const shopperName = order?.shoppers?.users?.full_name || 'Ihr Shopper'
  const storeName = order?.stores?.name || 'Markt'
  const shopperRating = order?.shoppers?.rating

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-red border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (error) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
      <div className="bg-white rounded-3xl p-10 max-w-md w-full text-center shadow-sm border border-gray-100">
        <div className="text-4xl mb-4">❌</div>
        <h1 className="text-xl font-black text-gray-900 mb-2">Link ungültig</h1>
        <p className="text-gray-500 text-sm">{error}</p>
      </div>
    </div>
  )

  if (done) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
      <div className="bg-white rounded-3xl p-10 max-w-md w-full text-center shadow-sm border border-gray-100">
        <div className="text-5xl mb-4">🎉</div>
        <h1 className="text-2xl font-black text-gray-900 mb-2">Vielen Dank!</h1>
        <p className="text-gray-500 text-sm mb-6">Ihre Bewertung hilft uns, den Service zu verbessern.</p>
        <a href="/" className="btn-red inline-flex px-6 py-3 text-sm">Zur Startseite</a>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6 py-12">
      <div className="max-w-md w-full">
        <div className="flex items-center justify-center gap-2 mb-8">
          <Image src="/logo.png" alt="Echtzeiteinkauf" width={40} height={40} className="rounded-full" />
          <span className="font-black text-xl text-gray-900">Echtzeiteinkauf</span>
        </div>

        <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
          <div className="text-center mb-7">
            <div className="w-16 h-16 rounded-full bg-red/10 flex items-center justify-center mx-auto mb-4 text-2xl">🛒</div>
            <h1 className="text-xl font-black text-gray-900 mb-1">Wie war Ihre Lieferung?</h1>
            <p className="text-sm text-gray-500">
              Bewerten Sie <strong className="text-gray-900">{shopperName}</strong> für die Lieferung von <strong className="text-gray-900">{storeName}</strong>
            </p>
            {shopperRating && (
              <p className="text-xs text-gray-400 mt-1">Aktuelle Bewertung: ⭐ {shopperRating}</p>
            )}
          </div>

          {/* Stars */}
          <div className="flex justify-center gap-2 mb-6">
            {[1,2,3,4,5].map(s => (
              <button
                key={s}
                onClick={() => setStars(s)}
                onMouseEnter={() => setHover(s)}
                onMouseLeave={() => setHover(0)}
                className="transition-transform hover:scale-110 active:scale-95"
              >
                <Star
                  size={40}
                  className={`transition-colors ${
                    s <= (hover || stars)
                      ? 'fill-orange text-orange'
                      : 'fill-gray-200 text-gray-200'
                  }`}
                />
              </button>
            ))}
          </div>

          {stars > 0 && (
            <p className="text-center text-sm font-bold text-gray-600 mb-5">
              {['', 'Sehr schlecht 😞', 'Schlecht 😕', 'OK 😐', 'Gut 😊', 'Ausgezeichnet 🤩'][stars]}
            </p>
          )}

          {/* Comment */}
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder="Kommentar (optional) — Was hat Ihnen gut gefallen?"
            rows={3}
            className="w-full border-2 border-gray-100 rounded-2xl px-4 py-3 text-sm outline-none focus:border-red transition-colors resize-none mb-5"
          />

          <button
            onClick={submit}
            disabled={submitting || stars === 0}
            className="btn-red w-full py-3.5"
          >
            {submitting ? 'Wird gespeichert...' : 'Bewertung abschicken ✓'}
          </button>
        </div>
      </div>
    </div>
  )
}
