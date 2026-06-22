// app/konto/page.tsx — Bestellungen (order history)
import { supabaseServer } from '@/lib/supabase'
import { Package, Clock, CheckCircle2, Truck } from 'lucide-react'

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  pending:     { label: 'Ausstehend',  color: 'text-gray-500',  bg: 'bg-gray-100',   icon: Clock },
  confirmed:   { label: 'Bestätigt',   color: 'text-blue-600',  bg: 'bg-blue-50',    icon: CheckCircle2 },
  shopping:    { label: 'Wird eingekauft', color: 'text-orange-dark', bg: 'bg-orange-light', icon: Package },
  in_transit:  { label: 'Unterwegs',   color: 'text-orange-dark', bg: 'bg-orange-light', icon: Truck },
  delivered:   { label: 'Geliefert',   color: 'text-green-700',  bg: 'bg-green-50',   icon: CheckCircle2 },
  cancelled:   { label: 'Storniert',   color: 'text-red',       bg: 'bg-red-light',  icon: Clock },
}

export default async function BestellungenPage() {
  const supabase = supabaseServer()
  const { data: { user: authUser } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('users').select('id').eq('auth_id', authUser!.id).single()

  const { data: orders } = await supabase
    .from('orders')
    .select('id, status, total, subtotal, placed_at, delivered_at, store_id, stores(name)')
    .eq('customer_id', profile?.id)
    .order('placed_at', { ascending: false })
    .limit(30)

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-black text-gray-900">Meine Bestellungen</h1>
        <p className="text-sm text-gray-500 mt-1">Verfolgen Sie Ihre aktuellen und vergangenen Bestellungen</p>
      </div>

      {!orders || orders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-14 text-center">
          <div className="text-5xl mb-4">🛒</div>
          <p className="font-bold text-gray-900 mb-1">Noch keine Bestellungen</p>
          <p className="text-sm text-gray-400 mb-6">Starten Sie Ihren ersten Einkauf bei Echtzeiteinkauf</p>
          <a href="/#stores" className="btn-red inline-flex px-6 py-3">Jetzt einkaufen</a>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {orders.map((order: any) => {
            const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending
            const StatusIcon = cfg.icon
            return (
              <div key={order.id} className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-4 hover:border-gray-200 transition-colors">
                <div className={`w-12 h-12 rounded-xl ${cfg.bg} flex items-center justify-center flex-shrink-0`}>
                  <StatusIcon size={20} className={cfg.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-black text-sm text-gray-900">{order.stores?.name || 'Markt'}</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
                  </div>
                  <div className="text-xs text-gray-400">
                    #{order.id.slice(0, 8).toUpperCase()} · {new Date(order.placed_at).toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="font-black text-gray-900">{Number(order.total).toFixed(2)} €</div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
