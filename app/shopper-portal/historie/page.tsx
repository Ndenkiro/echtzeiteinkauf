'use client'
// app/shopper-portal/historie/page.tsx — Missionshistorie
import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import {
  Package, Search, MapPin, Clock, Star, X, Calendar
} from 'lucide-react'

const SUPABASE_URL = 'https://wpxpgszzzfhhsaunolyq.supabase.co'
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndweHBnc3p6emZoaHNhdW5vbHlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0Mzg5ODQsImV4cCI6MjA5NzAxNDk4NH0.8_DVpLNwItAlkn_gL9a4dn-lZ00I8iifX2Cb9N_W-4U'

const calcNet = (deliveryFee: number, tip: number) => {
  const gross = Number(deliveryFee) * 0.8 + Number(tip || 0)
  return Math.round((gross - gross * 0.1) * 100) / 100
}

export default function HistoriePage() {
  const [orders, setOrders] = useState<any[]>([])
  const [ratings, setRatings] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [monthFilter, setMonthFilter] = useState('all')

  const supabase = createBrowserClient(SUPABASE_URL, SUPABASE_ANON)

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }
      const { data: profile } = await supabase
        .from('users').select('id').eq('auth_id', user.id).single()
      if (!profile) { setLoading(false); return }

      const { data } = await supabase
        .from('orders')
        .select('id, total, subtotal, delivery_fee, tip_amount, distance_km, placed_at, delivered_at, delivery_address, stores(name)')
        .eq('shopper_id', profile.id)
        .eq('status', 'delivered')
        .order('delivered_at', { ascending: false })

      setOrders(data || [])

      // Load ratings
      const { data: shopperRow } = await supabase
        .from('shoppers').select('id').eq('user_id', profile.id).maybeSingle()
      if (shopperRow) {
        const { data: ratingsData } = await supabase
          .from('ratings')
          .select('order_id, stars, comment')
          .eq('shopper_id', shopperRow.id)
        const map: Record<string, any> = {}
        ;(ratingsData || []).forEach(r => { map[r.order_id] = r })
        setRatings(map)
      }

      setLoading(false)
    })()
  }, [])

  // Month options
  const months = Array.from(new Set(orders.map(o => {
    const d = new Date(o.delivered_at || o.placed_at)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  }))).sort().reverse()

  const filtered = orders.filter(o => {
    if (monthFilter !== 'all') {
      const d = new Date(o.delivered_at || o.placed_at)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (key !== monthFilter) return false
    }
    if (search) {
      const q = search.toLowerCase()
      if (!o.stores?.name?.toLowerCase().includes(q) && !o.id.toLowerCase().includes(q)) return false
    }
    return true
  })

  const totalNet = filtered.reduce(
    (s, o) => s + calcNet(Number(o.delivery_fee), Number(o.tip_amount)), 0
  )
  const totalKm = filtered.reduce((s, o) => s + Number(o.distance_km || 0), 0)
  const ratedCount = filtered.filter(o => ratings[o.id]).length
  const avgStars = ratedCount > 0
    ? filtered.filter(o => ratings[o.id]).reduce((s, o) => s + ratings[o.id].stars, 0) / ratedCount
    : 0

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-4 border-orange border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-black text-gray-900">Missionshistorie</h1>
        <p className="text-sm text-gray-500 mt-1">
          {filtered.length} Lieferungen · {totalNet.toFixed(2)} € verdient · {totalKm.toFixed(0)} km
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        <div className="flex-1 min-w-48 flex items-center gap-2 bg-white border-2 border-gray-100 rounded-xl px-4 py-2.5 focus-within:border-orange transition-colors">
          <Search size={15} className="text-gray-400 flex-shrink-0" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Markt oder Auftragsnummer..."
            className="flex-1 outline-none text-sm bg-transparent"
          />
          {search && (
            <button onClick={() => setSearch('')}>
              <X size={14} className="text-gray-300 hover:text-gray-500" />
            </button>
          )}
        </div>
        <select
          value={monthFilter}
          onChange={e => setMonthFilter(e.target.value)}
          className="bg-white border-2 border-gray-100 rounded-xl px-4 py-2.5 text-sm font-bold text-gray-600 outline-none focus:border-orange transition-colors cursor-pointer"
        >
          <option value="all">Alle Monate</option>
          {months.map(m => {
            const [y, mo] = m.split('-')
            const label = new Date(Number(y), Number(mo) - 1).toLocaleDateString('de-DE', {
              month: 'long', year: 'numeric'
            })
            return <option key={m} value={m}>{label}</option>
          })}
        </select>
      </div>

      {/* Summary bar */}
      {filtered.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="text-lg font-black text-green-600">{totalNet.toFixed(2)} €</div>
            <div className="text-[10px] font-bold text-gray-400 uppercase">Verdienst</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="text-lg font-black text-gray-900">{totalKm.toFixed(0)} km</div>
            <div className="text-[10px] font-bold text-gray-400 uppercase">Distanz</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="text-lg font-black text-orange-dark">
              {avgStars > 0 ? `${avgStars.toFixed(1)} ⭐` : '—'}
            </div>
            <div className="text-[10px] font-bold text-gray-400 uppercase">Ø Bewertung</div>
          </div>
        </div>
      )}

      {/* History list */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-14 text-center">
          <Package size={40} className="text-gray-200 mx-auto mb-4" />
          <p className="font-bold text-gray-900 mb-1">Keine Lieferungen gefunden</p>
          <p className="text-sm text-gray-400">Versuchen Sie andere Filter</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((order: any) => {
            const net = calcNet(Number(order.delivery_fee), Number(order.tip_amount))
            const rating = ratings[order.id]
            return (
              <div key={order.id} className="bg-white rounded-2xl border border-gray-100 p-5">
                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0">
                    <Package size={20} className="text-green-600" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="font-black text-gray-900 mb-0.5">{order.stores?.name}</div>
                    <div className="text-xs text-gray-400 mb-2">
                      #{order.id.slice(0, 8).toUpperCase()} ·{' '}
                      {new Date(order.delivered_at || order.placed_at).toLocaleDateString('de-DE', {
                        weekday: 'short', day: '2-digit', month: 'long', year: 'numeric'
                      })}
                    </div>
                    <div className="flex gap-3 text-xs text-gray-500 flex-wrap">
                      {order.delivery_address?.street && (
                        <span className="flex items-center gap-1">
                          <MapPin size={11} /> {order.delivery_address.street}
                        </span>
                      )}
                      {order.distance_km && <span>{order.distance_km} km</span>}
                      <span>Warenwert: {Number(order.subtotal).toFixed(2)} €</span>
                    </div>

                    {/* Rating */}
                    {rating && (
                      <div className="mt-3 bg-orange-50 rounded-xl p-3">
                        <div className="flex items-center gap-1 mb-1">
                          {[1, 2, 3, 4, 5].map(s => (
                            <Star
                              key={s}
                              size={12}
                              className={s <= rating.stars ? 'fill-orange text-orange' : 'fill-gray-200 text-gray-200'}
                            />
                          ))}
                          <span className="text-xs font-black text-orange-dark ml-1">{rating.stars}/5</span>
                        </div>
                        {rating.comment && (
                          <p className="text-xs text-orange-900 italic">"{rating.comment}"</p>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="text-right flex-shrink-0">
                    <div className="font-black text-lg text-green-600">+{net.toFixed(2)} €</div>
                    {Number(order.tip_amount) > 0 && (
                      <div className="text-[10px] text-orange-500 font-bold">
                        inkl. {Number(order.tip_amount).toFixed(2)} € Tip
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
