// app/admin/bestellungen/page.tsx
import { supabaseServer } from '@/lib/supabase'

const STATUS_CFG: Record<string, { label: string; color: string }> = {
  pending:    { label: 'Ausstehend',       color: 'bg-gray-100 text-gray-500' },
  confirmed:  { label: 'Bestätigt',        color: 'bg-blue-50 text-blue-700' },
  shopping:   { label: 'Wird eingekauft',  color: 'bg-yellow-50 text-yellow-700' },
  in_transit: { label: 'Unterwegs',        color: 'bg-orange-50 text-orange-700' },
  delivered:  { label: 'Geliefert ✓',     color: 'bg-green-50 text-green-700' },
  cancelled:  { label: 'Storniert',        color: 'bg-red/10 text-red' },
}

export default async function AdminBestellungenPage() {
  const supabase = supabaseServer()
  const { data: orders } = await supabase
    .from('orders')
    .select('id, status, total, placed_at, delivery_address, stores(name), users!customer_id(full_name, email)')
    .order('placed_at', { ascending: false })
    .limit(50)

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-black text-gray-900">Bestellungen</h1>
        <p className="text-sm text-gray-500 mt-1">{orders?.length || 0} Bestellungen</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {!orders?.length ? (
          <div className="p-14 text-center text-gray-400 text-sm">Keine Bestellungen vorhanden</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-5 py-3.5 font-black text-gray-500 text-xs uppercase tracking-wide">Bestellung</th>
                <th className="text-left px-5 py-3.5 font-black text-gray-500 text-xs uppercase tracking-wide">Kunde</th>
                <th className="text-left px-5 py-3.5 font-black text-gray-500 text-xs uppercase tracking-wide">Markt</th>
                <th className="text-left px-5 py-3.5 font-black text-gray-500 text-xs uppercase tracking-wide">Status</th>
                <th className="text-right px-5 py-3.5 font-black text-gray-500 text-xs uppercase tracking-wide">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {orders.map((order: any) => {
                const cfg = STATUS_CFG[order.status] || STATUS_CFG.pending
                return (
                  <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="font-bold text-gray-900">#{order.id.slice(0,8).toUpperCase()}</div>
                      <div className="text-xs text-gray-400">
                        {new Date(order.placed_at).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-medium text-gray-900">{order.users?.full_name || '—'}</div>
                      <div className="text-xs text-gray-400">{order.users?.email}</div>
                    </td>
                    <td className="px-5 py-4 text-gray-600">{order.stores?.name || '—'}</td>
                    <td className="px-5 py-4">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${cfg.color}`}>{cfg.label}</span>
                    </td>
                    <td className="px-5 py-4 text-right font-black text-gray-900">
                      {Number(order.total).toFixed(2)} €
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
