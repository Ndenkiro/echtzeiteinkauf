'use client'
// app/haendler-portal/bestellungen/page.tsx
import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import {
  ShoppingBag, Loader2, X, Package, Check, AlertCircle,
  Clock, Truck, CheckCircle2, Euro, TrendingUp, Award,
  Receipt, Search, Bike
} from 'lucide-react'

const SUPABASE_URL = 'https://wpxpgszzzfhhsaunolyq.supabase.co'
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndweHBnc3p6emZoaHNhdW5vbHlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0Mzg5ODQsImV4cCI6MjA5NzAxNDk4NH0.8_DVpLNwItAlkn_gL9a4dn-lZ00I8iifX2Cb9N_W-4U'

const STATUS: Record<string, { label: string; cls: string; icon: any }> = {
  pending:    { label: 'Wartet auf Shopper', cls: 'bg-white/10 text-white/60',       icon: Clock },
  confirmed:  { label: 'Shopper zugewiesen', cls: 'bg-blue-500/15 text-blue-400',    icon: CheckCircle2 },
  shopping:   { label: 'Wird eingekauft',    cls: 'bg-orange/15 text-orange',        icon: ShoppingBag },
  in_transit: { label: 'Unterwegs',          cls: 'bg-purple-500/15 text-purple-400',icon: Truck },
  delivered:  { label: 'Geliefert',          cls: 'bg-green-500/15 text-green-400',  icon: Check },
  cancelled:  { label: 'Storniert',          cls: 'bg-red-500/15 text-red-400',      icon: AlertCircle },
}

export default function BestellungenPage() {
  const [orders, setOrders] = useState<any[]>([])
  const [sales, setSales] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<any>(null)
  const [items, setItems] = useState<any[]>([])
  const [loadingItems, setLoadingItems] = useState(false)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')

  const supabase = createBrowserClient(SUPABASE_URL, SUPABASE_ANON)

  const load = async () => {
    const [{ data: o }, { data: s }] = await Promise.all([
      supabase.rpc('get_merchant_orders', { p_limit: 100 }),
      supabase.rpc('get_merchant_sales'),
    ])
    setOrders(o || [])
    setSales(s?.[0] ?? null)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    const ch = supabase.channel('merchant-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, load)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [])

  const openOrder = async (o: any) => {
    setSelected(o)
    setLoadingItems(true)
    const { data } = await supabase.rpc('get_merchant_order_items', { p_order_id: o.order_id })
    setItems(data || [])
    setLoadingItems(false)
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-4 border-orange border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const filtered = orders.filter(o => {
    if (filter === 'active' && !['pending','confirmed','shopping','in_transit'].includes(o.status)) return false
    if (filter === 'delivered' && o.status !== 'delivered') return false
    if (search && !o.order_id.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const activeCount = orders.filter(o =>
    ['pending','confirmed','shopping','in_transit'].includes(o.status)).length

  return (
    <div>
      <div className="mb-7">
        <h1 className="text-2xl font-black text-white">Bestellungen</h1>
        <p className="text-sm text-white/40 mt-1">
          {orders.length} insgesamt · {activeCount} laufend
        </p>
      </div>

      {/* Sales */}
      {sales && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-7">
          {[
            { label: 'Heute',       value: `${Number(sales.today_revenue).toFixed(2)} €`, sub: `${sales.today_orders} Bestellungen`, icon: Euro,       color: 'text-green-400 bg-green-500/15' },
            { label: 'Dieser Monat',value: `${Number(sales.month_revenue).toFixed(2)} €`, sub: `${sales.month_orders} Bestellungen`, icon: TrendingUp, color: 'text-blue-400 bg-blue-500/15' },
            { label: 'Gesamt',      value: `${Number(sales.total_revenue).toFixed(2)} €`, sub: `${sales.total_orders} Bestellungen`, icon: ShoppingBag,color: 'text-orange bg-orange/15' },
            { label: 'Topseller',   value: sales.top_product || '—',                      sub: sales.top_product_qty ? `${sales.top_product_qty}× verkauft` : '', icon: Award, color: 'text-purple-400 bg-purple-500/15' },
          ].map(s => {
            const Icon = s.icon
            return (
              <div key={s.label} className="bg-white/[0.04] border border-white/10 rounded-2xl p-4">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2.5 ${s.color}`}>
                  <Icon size={16} />
                </div>
                <div className="text-lg font-black text-white truncate">{s.value}</div>
                <div className="text-[11px] font-bold text-white/40 mt-0.5">{s.label}</div>
                <div className="text-[10px] text-white/25 truncate">{s.sub}</div>
              </div>
            )
          })}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
        {[
          { id: 'all',       label: 'Alle' },
          { id: 'active',    label: `Laufend${activeCount > 0 ? ` (${activeCount})` : ''}` },
          { id: 'delivered', label: 'Geliefert' },
        ].map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            className={`px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all flex-shrink-0 ${
              filter === f.id ? 'bg-orange text-black'
                : 'bg-white/[0.05] border border-white/10 text-white/50 hover:border-white/25'
            }`}>
            {f.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 bg-white/[0.05] border border-white/10 rounded-2xl px-4 py-3 mb-5 focus-within:border-orange transition-colors">
        <Search size={16} className="text-white/30 flex-shrink-0" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Bestellnummer suchen…"
          className="flex-1 outline-none text-sm bg-transparent text-white placeholder-white/25" />
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-14 text-center">
          <ShoppingBag size={34} className="text-white/20 mx-auto mb-3" />
          <p className="font-bold text-white mb-1">
            {orders.length === 0 ? 'Noch keine Bestellungen' : 'Nichts gefunden'}
          </p>
          {orders.length === 0 && (
            <p className="text-sm text-white/40">
              Sobald Kunden bei Ihnen bestellen, erscheinen die Aufträge hier.
            </p>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map(o => {
            const st = STATUS[o.status] || STATUS.pending
            const Icon = st.icon
            return (
              <button key={o.order_id} onClick={() => openOrder(o)}
                className="flex items-center gap-3 bg-white/[0.04] border border-white/10 rounded-2xl p-4 text-left hover:border-orange/40 transition-all">
                <div className="w-10 h-10 rounded-xl bg-white/[0.06] flex items-center justify-center flex-shrink-0">
                  <Icon size={17} className="text-white/50" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm text-white">
                    #{o.order_id.slice(0, 8).toUpperCase()}
                  </div>
                  <div className="text-[11px] text-white/40 flex items-center gap-2 flex-wrap">
                    <span>
                      {new Date(o.placed_at).toLocaleString('de-DE', {
                        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                      })}
                    </span>
                    <span>· {o.item_count} Artikel</span>
                    {o.shopper_name && (
                      <span className="flex items-center gap-1">
                        <Bike size={10} /> {o.shopper_name.split(' ')[0]}
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  <div className="font-black text-white">{Number(o.subtotal).toFixed(2)} €</div>
                  <span className={`inline-block text-[9px] font-black px-2 py-0.5 rounded-full mt-1 ${st.cls}`}>
                    {st.label}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* Detail */}
      {selected && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center sm:justify-center p-0 sm:p-4">
          <div className="w-full sm:max-w-md bg-[#141414] border border-white/10 rounded-t-3xl sm:rounded-3xl max-h-[88vh] overflow-y-auto">
            <div className="sticky top-0 bg-[#141414] px-5 py-4 border-b border-white/10 flex items-center justify-between">
              <div>
                <h2 className="font-black text-white">
                  #{selected.order_id.slice(0, 8).toUpperCase()}
                </h2>
                <span className={`inline-block text-[10px] font-black px-2 py-0.5 rounded-full mt-1 ${
                  (STATUS[selected.status] || STATUS.pending).cls
                }`}>
                  {(STATUS[selected.status] || STATUS.pending).label}
                </span>
              </div>
              <button onClick={() => setSelected(null)}>
                <X size={20} className="text-white/40 hover:text-white" />
              </button>
            </div>

            <div className="p-5">
              <div className="flex flex-col gap-1.5 text-xs text-white/50 mb-5">
                <div className="flex justify-between">
                  <span>Bestellt</span>
                  <span className="text-white">
                    {new Date(selected.placed_at).toLocaleString('de-DE')}
                  </span>
                </div>
                {selected.delivered_at && (
                  <div className="flex justify-between">
                    <span>Geliefert</span>
                    <span className="text-white">
                      {new Date(selected.delivered_at).toLocaleString('de-DE')}
                    </span>
                  </div>
                )}
                {selected.shopper_name && (
                  <div className="flex justify-between">
                    <span>Shopper</span>
                    <span className="text-white">{selected.shopper_name}</span>
                  </div>
                )}
                {selected.customer_city && (
                  <div className="flex justify-between">
                    <span>Lieferort</span>
                    <span className="text-white">{selected.customer_city}</span>
                  </div>
                )}
                {selected.has_receipt && (
                  <div className="flex items-center gap-1.5 text-green-400 mt-1">
                    <Receipt size={12} /> Kassenbon vorhanden
                  </div>
                )}
              </div>

              <h3 className="text-[10px] font-black text-white/40 uppercase tracking-wide mb-2">
                Artikel
              </h3>

              {loadingItems ? (
                <div className="flex justify-center py-8">
                  <Loader2 size={20} className="animate-spin text-orange" />
                </div>
              ) : (
                <div className="flex flex-col gap-1.5 mb-5">
                  {items.map((it, i) => (
                    <div key={i}
                      className={`flex items-center gap-3 rounded-xl p-3 ${
                        it.unavailable ? 'bg-red-500/[0.07] border border-red-500/20'
                        : it.picked ? 'bg-green-500/[0.07] border border-green-500/20'
                        : 'bg-white/[0.03] border border-white/[0.08]'
                      }`}>
                      <span className="text-lg flex-shrink-0">{it.emoji || '🛒'}</span>
                      <div className="flex-1 min-w-0">
                        <div className={`text-sm font-bold truncate ${
                          it.unavailable ? 'text-white/40 line-through' : 'text-white'
                        }`}>
                          {it.quantity}× {it.product_name}
                        </div>
                        {it.unavailable && (
                          <div className="text-[10px] text-red-400">Nicht verfügbar</div>
                        )}
                      </div>
                      <span className="font-black text-sm text-white/70 flex-shrink-0">
                        {(Number(it.price) * it.quantity).toFixed(2)} €
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div className="border-t border-white/10 pt-4 flex justify-between items-center">
                <span className="font-black text-white">Warenwert</span>
                <span className="font-black text-lg text-white">
                  {Number(selected.subtotal).toFixed(2)} €
                </span>
              </div>
              <p className="text-[10px] text-white/30 mt-2 leading-relaxed">
                Dieser Betrag wird über die Einkaufskarte des Shoppers bei Ihnen bezahlt.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
