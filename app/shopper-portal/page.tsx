// app/shopper-portal/page.tsx — Aufträge (available + active orders)
import { supabaseServer } from '@/lib/supabase'
import { Package, MapPin, Clock, ArrowRight, Lock } from 'lucide-react'

export default async function AuftraegePage() {
  const supabase = supabaseServer()
  const { data: { user: authUser } } = await supabase.auth.getUser()

  const { data: profile } = await supabase.from('users').select('id').eq('auth_id', authUser!.id).single()
  const { data: application } = await supabase.from('shopper_applications').select('status').eq('user_id', profile?.id).maybeSingle()

  const isApproved = application?.status === 'approved'

  const { data: shopper } = isApproved
    ? await supabase.from('shoppers').select('id, status, rating, total_deliveries').eq('user_id', profile?.id).maybeSingle()
    : { data: null }

  const { data: activeOrders } = isApproved
    ? await supabase
        .from('orders')
        .select('id, status, total, delivery_address, placed_at, stores(name, address)')
        .eq('shopper_id', shopper?.id)
        .in('status', ['confirmed', 'shopping', 'in_transit'])
        .order('placed_at')
    : { data: [] }

  if (!isApproved) {
    return (
      <div className="max-w-lg">
        <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
          <div className="w-16 h-16 rounded-full bg-orange/15 flex items-center justify-center mx-auto mb-5">
            <Lock size={26} className="text-orange-dark" />
          </div>
          <h1 className="font-black text-xl text-gray-900 mb-2">Noch nicht freigeschaltet</h1>
          <p className="text-sm text-gray-500 mb-6">
            Reichen Sie zunächst Ihre Dokumente ein, damit wir Ihre Bewerbung prüfen können.
          </p>
          <a href="/shopper-portal/dokumente" className="inline-flex items-center gap-2 bg-orange text-black font-black rounded-xl px-6 py-3 text-sm hover:bg-orange-dark hover:text-white transition-colors">
            Zu den Dokumenten <ArrowRight size={15} />
          </a>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-black text-gray-900">Meine Aufträge</h1>
        <p className="text-sm text-gray-500 mt-1">Aktuelle und verfügbare Lieferaufträge</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="text-xs font-bold text-gray-400 uppercase mb-1">Status</div>
          <div className={`font-black text-sm ${shopper?.status === 'available' ? 'text-green-700' : 'text-gray-500'}`}>
            {shopper?.status === 'available' ? '🟢 Verfügbar' : '⚪ Offline'}
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="text-xs font-bold text-gray-400 uppercase mb-1">Bewertung</div>
          <div className="font-black text-sm text-gray-900">⭐ {shopper?.rating?.toFixed(1) || '5.0'}</div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="text-xs font-bold text-gray-400 uppercase mb-1">Lieferungen</div>
          <div className="font-black text-sm text-gray-900">{shopper?.total_deliveries || 0}</div>
        </div>
      </div>

      {!activeOrders || activeOrders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-14 text-center">
          <Package size={32} className="text-gray-300 mx-auto mb-3" />
          <p className="font-bold text-gray-900 mb-1">Keine aktiven Aufträge</p>
          <p className="text-sm text-gray-400">Neue Aufträge erscheinen hier, sobald sie verfügbar sind.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {activeOrders.map((order: any) => (
            <div key={order.id} className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="font-black text-sm text-gray-900">{order.stores?.name}</span>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-orange-light text-orange-dark">{order.status}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                <MapPin size={13} /> {order.delivery_address?.street}, {order.delivery_address?.city}
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <Clock size={13} /> {new Date(order.placed_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
