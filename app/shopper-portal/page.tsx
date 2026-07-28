// app/shopper-portal/page.tsx — Shopper Dashboard Übersicht
import { redirect } from 'next/navigation'
import { supabaseServer } from '@/lib/supabase'
import Link from 'next/link'
import {
  Euro, TrendingUp, Package, Star, Clock, Lock,
  ArrowRight, ChevronRight, Wallet, Award, MapPin
} from 'lucide-react'

export const dynamic = 'force-dynamic'

const STATUS_CFG: Record<string, { label: string; color: string; dot: string }> = {
  confirmed:  { label: 'Zugewiesen',      color: 'bg-blue-50 text-blue-700',     dot: 'bg-blue-500' },
  shopping:   { label: 'Einkaufen',       color: 'bg-orange-50 text-orange-700', dot: 'bg-orange-500 animate-pulse' },
  in_transit: { label: 'Unterwegs',       color: 'bg-purple-50 text-purple-700', dot: 'bg-purple-500 animate-pulse' },
}

// Net = (delivery_fee × 80% + tip) − 10% platform
const calcNet = (deliveryFee: number, tip: number) => {
  const gross = Number(deliveryFee) * 0.8 + Number(tip || 0)
  return Math.round((gross - gross * 0.1) * 100) / 100
}

export default async function ShopperPortalPage() {
  const supabase = supabaseServer()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/anmelden?next=/shopper-portal')

  const { data: profile } = await supabase
    .from('users')
    .select('id, full_name, email, created_at')
    .eq('auth_id', authUser.id)
    .single()

  if (!profile) redirect('/anmelden')

  // Application status
  const { data: application } = await supabase
    .from('shopper_applications')
    .select('status')
    .eq('user_id', profile.id)
    .maybeSingle()

  const isApproved = application?.status === 'approved'

  // Not approved yet
  if (!isApproved) {
    return (
      <div className="max-w-lg">
        <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
          <div className="w-16 h-16 rounded-full bg-orange/15 flex items-center justify-center mx-auto mb-5">
            <Lock size={26} className="text-orange-dark" />
          </div>
          <h1 className="font-black text-xl text-gray-900 mb-2">Noch nicht freigeschaltet</h1>
          <p className="text-sm text-gray-500 mb-6">
            {application?.status === 'under_review'
              ? 'Ihre Bewerbung wird geprüft. Wir melden uns innerhalb von 2–3 Werktagen.'
              : 'Reichen Sie Ihre Dokumente ein, um als Shopper zu starten.'}
          </p>
          <Link
            href="/shopper-portal/dokumente"
            className="inline-flex items-center gap-2 bg-orange text-black font-black rounded-xl px-6 py-3 text-sm hover:bg-orange-dark hover:text-white transition-colors"
          >
            Zu den Dokumenten <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    )
  }

  // Shopper record
  const { data: shopper } = await supabase
    .from('shoppers')
    .select('id, rating, total_deliveries, status')
    .eq('user_id', profile.id)
    .maybeSingle()

  // All completed orders
  const { data: allOrders } = await supabase
    .from('orders')
    .select('id, status, total, delivery_fee, tip_amount, distance_km, placed_at, delivered_at, delivery_address, stores(name)')
    .eq('shopper_id', profile.id)
    .order('placed_at', { ascending: false })

  const orders = allOrders || []
  const completed = orders.filter(o => o.status === 'delivered')
  const active = orders.filter(o => ['confirmed', 'shopping', 'in_transit'].includes(o.status))

  // Earnings
  const totalEarned = completed.reduce(
    (sum, o) => sum + calcNet(Number(o.delivery_fee), Number(o.tip_amount)), 0
  )
  const totalTips = completed.reduce((sum, o) => sum + Number(o.tip_amount || 0), 0)

  const now = new Date()
  const thisMonth = completed.filter(o => {
    const d = new Date(o.delivered_at || o.placed_at)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  })
  const monthEarned = thisMonth.reduce(
    (sum, o) => sum + calcNet(Number(o.delivery_fee), Number(o.tip_amount)), 0
  )

  const avgPerOrder = completed.length > 0 ? totalEarned / completed.length : 0
  const totalKm = completed.reduce((sum, o) => sum + Number(o.distance_km || 0), 0)

  const stats = [
    {
      label: 'Gesamtverdienst',
      value: `${totalEarned.toFixed(2)} €`,
      sub: `${completed.length} Lieferungen`,
      icon: Wallet,
      color: 'bg-green-50 text-green-600',
    },
    {
      label: 'Diesen Monat',
      value: `${monthEarned.toFixed(2)} €`,
      sub: `${thisMonth.length} Aufträge`,
      icon: TrendingUp,
      color: 'bg-blue-50 text-blue-600',
    },
    {
      label: 'Ø pro Auftrag',
      value: `${avgPerOrder.toFixed(2)} €`,
      sub: 'Nettoverdienst',
      icon: Euro,
      color: 'bg-purple-50 text-purple-600',
    },
    {
      label: 'Bewertung',
      value: shopper?.rating ? `${Number(shopper.rating).toFixed(1)} ⭐` : '—',
      sub: `${totalTips.toFixed(2)} € Trinkgeld`,
      icon: Star,
      color: 'bg-orange-50 text-orange-600',
    },
  ]

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-black text-gray-900">
          Hallo {profile.full_name?.split(' ')[0] || 'Shopper'}! 🚴
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {completed.length} abgeschlossene Lieferungen · {totalKm.toFixed(0)} km gefahren
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map(s => {
          const Icon = s.icon
          return (
            <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${s.color}`}>
                <Icon size={18} />
              </div>
              <div className="text-xl font-black text-gray-900">{s.value}</div>
              <div className="text-xs font-bold text-gray-500 mt-1">{s.label}</div>
              <div className="text-[11px] text-gray-400 mt-0.5">{s.sub}</div>
            </div>
          )
        })}
      </div>

      {/* Active missions */}
      {active.length > 0 && (
        <div className="mb-8">
          <h2 className="font-black text-sm text-gray-900 uppercase tracking-wide mb-3">
            🛒 Aktive Aufträge
          </h2>
          <div className="flex flex-col gap-3">
            {active.map((order: any) => {
              const cfg = STATUS_CFG[order.status] || STATUS_CFG.confirmed
              const net = calcNet(Number(order.delivery_fee), Number(order.tip_amount))
              return (
                <Link
                  key={order.id}
                  href="/shopper-portal/auftraege"
                  className="bg-white rounded-2xl border-2 border-orange/30 p-5 hover:border-orange transition-all"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-11 h-11 rounded-xl bg-orange/15 flex items-center justify-center flex-shrink-0">
                      <Package size={20} className="text-orange-dark" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-black text-gray-900">{order.stores?.name}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${cfg.color}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                          {cfg.label}
                        </span>
                      </div>
                      <div className="text-xs text-gray-400 flex items-center gap-1">
                        <MapPin size={11} />
                        {order.delivery_address?.street || 'Adresse'}
                        {order.distance_km && <span>· {order.distance_km} km</span>}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="font-black text-green-600">{net.toFixed(2)} €</div>
                      <div className="text-[10px] text-gray-400 uppercase">Netto</div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* Recent completed */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-black text-sm text-gray-900 uppercase tracking-wide">
          Letzte Lieferungen
        </h2>
        {completed.length > 5 && (
          <Link href="/shopper-portal/historie" className="text-xs font-bold text-orange-dark hover:underline">
            Alle anzeigen →
          </Link>
        )}
      </div>

      {completed.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-14 text-center">
          <Package size={40} className="text-gray-200 mx-auto mb-4" />
          <p className="font-bold text-gray-900 mb-1">Noch keine Lieferungen</p>
          <p className="text-sm text-gray-400 mb-6">
            Bewerben Sie sich für verfügbare Aufträge, um zu starten.
          </p>
          <Link href="/shopper-portal/auftraege" className="inline-flex items-center gap-2 bg-orange text-black font-black rounded-xl px-6 py-3 text-sm hover:bg-orange-dark hover:text-white transition-colors">
            Aufträge ansehen <ArrowRight size={15} />
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {completed.slice(0, 5).map((order: any, i: number) => {
            const net = calcNet(Number(order.delivery_fee), Number(order.tip_amount))
            return (
              <div
                key={order.id}
                className={`flex items-center gap-4 px-5 py-4 ${i > 0 ? 'border-t border-gray-50' : ''}`}
              >
                <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0">
                  <Package size={17} className="text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm text-gray-900">{order.stores?.name}</div>
                  <div className="text-xs text-gray-400">
                    {new Date(order.delivered_at || order.placed_at).toLocaleDateString('de-DE', {
                      day: '2-digit', month: 'long', year: 'numeric'
                    })}
                    {order.distance_km && ` · ${order.distance_km} km`}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="font-black text-sm text-green-600">+{net.toFixed(2)} €</div>
                  {Number(order.tip_amount) > 0 && (
                    <div className="text-[10px] text-orange-500">
                      inkl. {Number(order.tip_amount).toFixed(2)} € Trinkgeld
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Quick links */}
      <div className="grid sm:grid-cols-3 gap-4 mt-8">
        <Link href="/shopper-portal/auftraege" className="bg-white rounded-2xl border border-gray-100 p-5 hover:border-orange transition-all group">
          <Package size={20} className="text-gray-400 group-hover:text-orange-dark transition-colors mb-3" />
          <div className="font-black text-sm text-gray-900">Aufträge</div>
          <div className="text-xs text-gray-400 mt-0.5">Verfügbare Missionen</div>
        </Link>
        <Link href="/shopper-portal/verdienst" className="bg-white rounded-2xl border border-gray-100 p-5 hover:border-orange transition-all group">
          <Wallet size={20} className="text-gray-400 group-hover:text-orange-dark transition-colors mb-3" />
          <div className="font-black text-sm text-gray-900">Verdienst</div>
          <div className="text-xs text-gray-400 mt-0.5">Provisionen & Auszahlung</div>
        </Link>
        <Link href="/shopper-portal/bewertungen" className="bg-white rounded-2xl border border-gray-100 p-5 hover:border-orange transition-all group">
          <Award size={20} className="text-gray-400 group-hover:text-orange-dark transition-colors mb-3" />
          <div className="font-black text-sm text-gray-900">Bewertungen</div>
          <div className="text-xs text-gray-400 mt-0.5">Kundenfeedback</div>
        </Link>
      </div>
    </div>
  )
}
