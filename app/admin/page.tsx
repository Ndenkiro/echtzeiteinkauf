// app/admin/page.tsx
import { supabaseServer } from '@/lib/supabase'
import { Users, Bike, ShoppingBag, Clock } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const supabase = supabaseServer()

  const [
    { count: totalKunden },
    { count: totalShoppers },
    { count: totalOrders },
    { count: pendingApps },
    { data: recentApps },
    { data: recentOrders },
  ] = await Promise.all([
    supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'customer'),
    supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'shopper'),
    supabase.from('orders').select('*', { count: 'exact', head: true }),
    supabase.from('shopper_applications').select('*', { count: 'exact', head: true }).eq('status', 'under_review'),
    supabase.from('shopper_applications')
      .select('id, status, created_at, user:user_id(full_name, email)')
      .order('created_at', { ascending: false })
      .limit(5),
    supabase.from('orders')
      .select('id, status, total, placed_at, stores(name)')
      .order('placed_at', { ascending: false })
      .limit(5),
  ])

  const stats = [
    { label: 'Kunden',             value: totalKunden || 0,   icon: Users,       color: 'bg-blue-50 text-blue-600' },
    { label: 'Shopper',            value: totalShoppers || 0, icon: Bike,        color: 'bg-orange-50 text-orange-600' },
    { label: 'Bestellungen',       value: totalOrders || 0,   icon: ShoppingBag, color: 'bg-green-50 text-green-600' },
    { label: 'Offene Bewerbungen', value: pendingApps || 0,   icon: Clock,       color: 'bg-red/10 text-red' },
  ]

  const STATUS_LABEL: Record<string, { label: string; color: string }> = {
    draft:             { label: 'Entwurf',     color: 'bg-gray-100 text-gray-500' },
    documents_pending: { label: 'Dok. fehlen', color: 'bg-yellow-50 text-yellow-700' },
    under_review:      { label: 'In Prüfung',  color: 'bg-blue-50 text-blue-700' },
    approved:          { label: 'Freigegeben', color: 'bg-green-50 text-green-700' },
    rejected:          { label: 'Abgelehnt',   color: 'bg-red/10 text-red' },
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-black text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Übersicht über Echtzeiteinkauf</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {stats.map(s => {
          const Icon = s.icon
          return (
            <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${s.color}`}>
                <Icon size={18} />
              </div>
              <div className="text-2xl font-black text-gray-900">{s.value}</div>
              <div className="text-xs text-gray-400 mt-1 font-bold uppercase tracking-wide">{s.label}</div>
            </div>
          )
        })}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-black text-gray-900">Letzte Bewerbungen</h2>
            <a href="/admin/shoppers" className="text-xs font-bold text-red hover:underline">Alle →</a>
          </div>
          {!recentApps?.length ? (
            <p className="text-sm text-gray-400 text-center py-8">Keine Bewerbungen</p>
          ) : (
            <div className="flex flex-col gap-3">
              {recentApps.map((app: any) => {
                const cfg = STATUS_LABEL[app.status] || STATUS_LABEL.draft
                const user = Array.isArray(app.user) ? app.user[0] : app.user
                return (
                  <div key={app.id} className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-sm text-gray-900">{user?.full_name || 'Unbekannt'}</div>
                      <div className="text-xs text-gray-400">{user?.email || '—'}</div>
                    </div>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${cfg.color}`}>{cfg.label}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-black text-gray-900">Letzte Bestellungen</h2>
            <a href="/admin/bestellungen" className="text-xs font-bold text-red hover:underline">Alle →</a>
          </div>
          {!recentOrders?.length ? (
            <p className="text-sm text-gray-400 text-center py-8">Keine Bestellungen</p>
          ) : (
            <div className="flex flex-col gap-3">
              {recentOrders.map((order: any) => (
                <div key={order.id} className="flex items-center justify-between">
                  <div>
                    <div className="font-bold text-sm text-gray-900">{order.stores?.name || '—'}</div>
                    <div className="text-xs text-gray-400">#{order.id.slice(0,8).toUpperCase()}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-black text-sm text-gray-900">{Number(order.total).toFixed(2)} €</div>
                    <div className="text-xs text-gray-400">{order.status}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
