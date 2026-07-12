// app/shopper-portal/bewertungen/page.tsx
import { supabaseServer } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import { Star } from 'lucide-react'

export const dynamic = 'force-dynamic'

function StarDisplay({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(s => (
        <Star
          key={s}
          size={14}
          className={s <= Math.round(rating) ? 'fill-orange text-orange' : 'fill-gray-200 text-gray-200'}
        />
      ))}
    </div>
  )
}

export default async function BewertungenPage() {
  const supabase = supabaseServer()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/anmelden')

  const { data: profile } = await supabase.from('users').select('id').eq('auth_id', authUser.id).single()
  const { data: shopper } = await supabase.from('shoppers').select('id, rating, total_deliveries').eq('user_id', profile?.id).maybeSingle()

  if (!shopper) redirect('/shopper-portal/dokumente')

  const { data: ratings } = await supabase
    .from('ratings')
    .select('*, orders(stores(name), placed_at)')
    .eq('shopper_id', shopper.id)
    .order('created_at', { ascending: false })

  const avg = shopper.rating || 0
  const total = ratings?.length || 0
  const dist = [5,4,3,2,1].map(s => ({
    stars: s,
    count: ratings?.filter(r => r.stars === s).length || 0,
    pct: total > 0 ? Math.round((ratings?.filter(r => r.stars === s).length || 0) / total * 100) : 0,
  }))

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-black text-gray-900">Meine Bewertungen</h1>
        <p className="text-sm text-gray-500 mt-1">{total} Bewertungen insgesamt</p>
      </div>

      {/* Summary */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
        <div className="flex items-center gap-8">
          <div className="text-center">
            <div className="text-5xl font-black text-gray-900">{avg.toFixed(1)}</div>
            <StarDisplay rating={avg} />
            <div className="text-xs text-gray-400 mt-1">{total} Bewertungen</div>
          </div>
          <div className="flex-1 flex flex-col gap-1.5">
            {dist.map(d => (
              <div key={d.stars} className="flex items-center gap-2">
                <span className="text-xs text-gray-400 w-4">{d.stars}</span>
                <Star size={11} className="fill-orange text-orange flex-shrink-0" />
                <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div className="h-full bg-orange rounded-full transition-all" style={{ width: `${d.pct}%` }} />
                </div>
                <span className="text-xs text-gray-400 w-8 text-right">{d.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Individual ratings */}
      {!ratings?.length ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-14 text-center">
          <Star size={32} className="text-gray-300 mx-auto mb-3" />
          <p className="font-bold text-gray-900 mb-1">Noch keine Bewertungen</p>
          <p className="text-sm text-gray-400">Nach jeder Lieferung können Kunden eine Bewertung hinterlassen.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {ratings.map((r: any) => (
            <div key={r.id} className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <StarDisplay rating={r.stars} />
                  <span className="font-black text-sm text-gray-900">{r.stars}/5</span>
                </div>
                <div className="text-xs text-gray-400">
                  {new Date(r.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })}
                </div>
              </div>
              <div className="text-xs text-gray-400 mb-2">{r.orders?.stores?.name}</div>
              {r.comment && (
                <p className="text-sm text-gray-600 bg-gray-50 rounded-xl p-3 italic">"{r.comment}"</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
