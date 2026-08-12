// app/konto/page.tsx — Käufer Dashboard Übersicht
import { redirect } from 'next/navigation'
import { supabaseServer } from '@/lib/supabase'
import Link from 'next/link'
import {
  ShoppingBag, Euro, TrendingUp, Package, ChevronRight,
  Clock, MapPin, Star, Percent
} from 'lucide-react'
import { ActiveOrderTracker } from '@/components/account/active-order-tracker'

export const dynamic = 'force-dynamic'

const STATUS_CFG: Record<string, { label: string; color: string; dot: string }> = {
  pending:    { label: 'Ausstehend',      color: 'bg-gray-100 text-gray-600',     dot: 'bg-gray-400' },
  confirmed:  { label: 'Bestätigt',       color: 'bg-blue-50 text-blue-700',      dot: 'bg-blue-500' },
  shopping:   { label: 'Wird eingekauft', color: 'bg-orange-50 text-orange-700',  dot: 'bg-orange-500 animate-pulse' },
  in_transit: { label: 'Unterwegs',       color: 'bg-purple-50 text-purple-700',  dot: 'bg-purple-500 animate-pulse' },
  delivered:  { label: 'Geliefert',       color: 'bg-green-50 text-green-700',    dot: 'bg-green-500' },
  cancelled:  { label: 'Storniert',       color: 'bg-red/10 text-red',            dot: 'bg-red' },
}

const ACTIVE_STATUSES = ['pending', 'confirmed', 'shopping', 'in_transit']

export default async function KontoPage() {
  const supabase = supabaseServer()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/anmelden?next=/konto')

  const { data: profile } = await supabase
    .from('users')
    .select('id, full_name, email, created_at')
    .eq('auth_id', authUser.id)
    .single()

  if (!profile) redirect('/anmelden')

  // All orders for stats
  const { data: allOrders } = await supabase
    .from('orders')
    .select('id, status, total, subtotal, delivery_fee, service_fee, tip_amount, placed_at, stores(name)')
    .eq('customer_id', profile.id)
    .order('placed_at', { ascending: false })

  const orders = allOrders || []
  const delivered = orders.filter(o => o.status === 'delivered')
  const active = orders.filter(o => ACTIVE_STATUSES.includes(o.status))

  // Stats
  const totalSpent = delivered.reduce((sum, o) => sum + Number(o.total), 0)
  const avgOrder = delivered.length > 0 ? totalSpent / delivered.length : 0
  const totalTips = delivered.reduce((sum, o) => sum + Number(o.tip_amount || 0), 0)

  // This month
  const now = new Date()
  const thisMonth = delivered.filter(o => {
    const d = new Date(o.placed_at)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  })
  const monthSpent = thisMonth.reduce((sum, o) => sum + Number(o.total), 0)

  const memberSince = new Date(profile.created_at).toLocaleDateString('de-DE', {
    month: 'long', year: 'numeric'
  })

  const stats = [
    {
      label: 'Gesamtausgaben',
      value: `${totalSpent.toFixed(2)} €`,
      sub: `${delivered.length} Lieferungen`,
      icon: Euro,
      color: 'bg-green-50 text-green-600',
    },
    {
      label: 'Diesen Monat',
      value: `${monthSpent.toFixed(2)} €`,
      sub: `${thisMonth.length} Bestellungen`,
      icon: TrendingUp,
      color: 'bg-blue-50 text-blue-600',
    },
    {
      label: 'Ø pro Bestellung',
      value: `${avgOrder.toFixed(2)} €`,
      sub: 'Durchschnitt',
      icon: ShoppingBag,
      color: 'bg-purple-50 text-purple-600',
    },
    {
      label: 'Trinkgelder',
      value: `${totalTips.toFixed(2)} €`,
      sub: 'An Shopper gegeben',
      icon: Star,
      color: 'bg-orange-50 text-orange-600',
    },
  ]

  return (
    <div>
      {/* Welcome header */}
      <div className="mb-8">
        <h1 className="text-2xl font-black text-gray-900">
          Hallo {profile.full_name?.split(' ')[0] || 'zusammen'}! 👋
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Mitglied seit {memberSince} · {orders.length} Bestellungen insgesamt
        </p>
      </div>

<ActiveOrderTracker />

      {/* Stats grid */}
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

      {/* Active orders */}
      {active.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-black text-sm text-gray-900 uppercase tracking-wide">
              🟢 Laufende Bestellungen
            </h2>
          </div>
          <div className="flex flex-col gap-3">
            {active.map((order: any) => {
              const cfg = STATUS_CFG[order.status] || STATUS_CFG.pending
              return (
                <Link
                  key={order.id}
                  href={`/bestellung/${order.id}`}
                  className="bg-white rounded-2xl border-2 border-red/20 p-5 flex items-center gap-4 hover:border-red hover:shadow-sm transition-all"
                >
                  <div className="w-12 h-12 rounded-xl bg-red/10 flex items-center justify-center flex-shrink-0">
                    <Package size={22} className="text-red" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-black text-gray-900">{order.stores?.name}</div>
                    <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-2">
                      <span>#{order.id.slice(0, 8).toUpperCase()}</span>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <Clock size={11} />
                        {new Date(order.placed_at).toLocaleTimeString('de-DE', {
                          hour: '2-digit', minute: '2-digit'
                        })}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                    <div className="font-black text-gray-900">{Number(order.total).toFixed(2)} €</div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${cfg.color}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                      {cfg.label}
                    </span>
                  </div>
                  <ChevronRight size={18} className="text-gray-300 flex-shrink-0" />
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* Recent orders */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-black text-sm text-gray-900 uppercase tracking-wide">
          Letzte Bestellungen
        </h2>
        {orders.length > 5 && (
          <Link href="/konto/bestellungen" className="text-xs font-bold text-red hover:underline">
            Alle anzeigen →
          </Link>
        )}
      </div>

      {orders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-14 text-center">
          <ShoppingBag size={40} className="text-gray-200 mx-auto mb-4" />
          <p className="font-bold text-gray-900 mb-1">Noch keine Bestellungen</p>
          <p className="text-sm text-gray-400 mb-6">
            Starten Sie Ihren ersten Einkauf bei Echtzeiteinkauf
          </p>
          <Link href="/maerkte" className="btn-red px-6 py-3 text-sm inline-flex">
            Jetzt einkaufen →
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {orders.slice(0, 5).map((order: any, i: number) => {
            const cfg = STATUS_CFG[order.status] || STATUS_CFG.pending
            return (
              <Link
                key={order.id}
                href={`/bestellung/${order.id}`}
                className={`flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors ${
                  i > 0 ? 'border-t border-gray-50' : ''
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0">
                  <ShoppingBag size={18} className="text-gray-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm text-gray-900">{order.stores?.name}</div>
                  <div className="text-xs text-gray-400">
                    {new Date(order.placed_at).toLocaleDateString('de-DE', {
                      day: '2-digit', month: 'long', year: 'numeric'
                    })}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <div className="font-black text-sm text-gray-900">
                    {Number(order.total).toFixed(2)} €
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.color}`}>
                    {cfg.label}
                  </span>
                </div>
                <ChevronRight size={16} className="text-gray-200 flex-shrink-0" />
              </Link>
            )
          })}
        </div>
      )}

      {/* Quick links */}
      <div className="grid sm:grid-cols-3 gap-4 mt-8">
        <Link href="/konto/bestellungen" className="bg-white rounded-2xl border border-gray-100 p-5 hover:border-red transition-all group">
          <Package size={20} className="text-gray-400 group-hover:text-red transition-colors mb-3" />
          <div className="font-black text-sm text-gray-900">Alle Bestellungen</div>
          <div className="text-xs text-gray-400 mt-0.5">Komplette Historie</div>
        </Link>
        <Link href="/konto/ausgaben" className="bg-white rounded-2xl border border-gray-100 p-5 hover:border-red transition-all group">
          <TrendingUp size={20} className="text-gray-400 group-hover:text-red transition-colors mb-3" />
          <div className="font-black text-sm text-gray-900">Ausgaben</div>
          <div className="text-xs text-gray-400 mt-0.5">Analyse & Statistik</div>
        </Link>
        <Link href="/konto/adressen" className="bg-white rounded-2xl border border-gray-100 p-5 hover:border-red transition-all group">
          <MapPin size={20} className="text-gray-400 group-hover:text-red transition-colors mb-3" />
          <div className="font-black text-sm text-gray-900">Adressen</div>
          <div className="text-xs text-gray-400 mt-0.5">Lieferadressen verwalten</div>
        </Link>
      </div>
    </div>
  )
}
