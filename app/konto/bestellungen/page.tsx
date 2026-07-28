'use client'
// app/konto/bestellungen/page.tsx — Komplette Bestellhistorie
import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import Link from 'next/link'
import {
  ShoppingBag, Search, ChevronRight, Package,
  Filter, Calendar, Euro, X
} from 'lucide-react'

const SUPABASE_URL = 'https://wpxpgszzzfhhsaunolyq.supabase.co'
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndweHBnc3p6emZoaHNhdW5vbHlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0Mzg5ODQsImV4cCI6MjA5NzAxNDk4NH0.8_DVpLNwItAlkn_gL9a4dn-lZ00I8iifX2Cb9N_W-4U'

const STATUS_CFG: Record<string, { label: string; color: string }> = {
  pending:    { label: 'Ausstehend',      color: 'bg-gray-100 text-gray-600' },
  confirmed:  { label: 'Bestätigt',       color: 'bg-blue-50 text-blue-700' },
  shopping:   { label: 'Wird eingekauft', color: 'bg-orange-50 text-orange-700' },
  in_transit: { label: 'Unterwegs',       color: 'bg-purple-50 text-purple-700' },
  delivered:  { label: 'Geliefert',       color: 'bg-green-50 text-green-700' },
  cancelled:  { label: 'Storniert',       color: 'bg-red/10 text-red' },
}

export default function BestellungenPage() {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [yearFilter, setYearFilter] = useState('all')

  const supabase = createBrowserClient(SUPABASE_URL, SUPABASE_ANON)

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase
        .from('users').select('id').eq('auth_id', user.id).single()
      if (!profile) return

      const { data } = await supabase
        .from('orders')
        .select('id, status, total, subtotal, delivery_fee, service_fee, tip_amount, placed_at, delivered_at, delivery_address, stores(name)')
        .eq('customer_id', profile.id)
        .order('placed_at', { ascending: false })

      setOrders(data || [])
      setLoading(false)
    })()
  }, [])

  const years = Array.from(new Set(orders.map(o => new Date(o.placed_at).getFullYear())))
    .sort((a, b) => b - a)

  const filtered = orders.filter(o => {
    if (statusFilter !== 'all' && o.status !== statusFilter) return false
    if (yearFilter !== 'all' && new Date(o.placed_at).getFullYear().toString() !== yearFilter) return false
    if (search) {
      const q = search.toLowerCase()
      const matchStore = o.stores?.name?.toLowerCase().includes(q)
      const matchId = o.id.toLowerCase().includes(q)
      if (!matchStore && !matchId) return false
    }
    return true
  })

  const totalFiltered = filtered
    .filter(o => o.status === 'delivered')
    .reduce((sum, o) => sum + Number(o.total), 0)

  const statusCounts = Object.keys(STATUS_CFG).reduce((acc, key) => {
    acc[key] = orders.filter(o => o.status === key).length
    return acc
  }, {} as Record<string, number>)

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-4 border-red border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-black text-gray-900">Meine Bestellungen</h1>
        <p className="text-sm text-gray-500 mt-1">
          {orders.length} Bestellungen · {totalFiltered.toFixed(2)} € ausgegeben
        </p>
      </div>

      {/* Search + filters */}
      <div className="flex flex-wrap gap-2 mb-5">
        <div className="flex-1 min-w-48 flex items-center gap-2 bg-white border-2 border-gray-100 rounded-xl px-4 py-2.5 focus-within:border-red transition-colors">
          <Search size={15} className="text-gray-400 flex-shrink-0" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Markt oder Bestellnummer suchen..."
            className="flex-1 outline-none text-sm bg-transparent"
          />
          {search && (
            <button onClick={() => setSearch('')}>
              <X size={14} className="text-gray-300 hover:text-gray-500" />
            </button>
          )}
        </div>

        <select
          value={yearFilter}
          onChange={e => setYearFilter(e.target.value)}
          className="bg-white border-2 border-gray-100 rounded-xl px-4 py-2.5 text-sm font-bold text-gray-600 outline-none focus:border-red transition-colors cursor-pointer"
        >
          <option value="all">Alle Jahre</option>
          {years.map(y => <option key={y} value={y.toString()}>{y}</option>)}
        </select>
      </div>

      {/* Status filter pills */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <button
          onClick={() => setStatusFilter('all')}
          className={`text-xs font-bold px-3 py-1.5 rounded-full transition-all ${
            statusFilter === 'all' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
          }`}
        >
          Alle ({orders.length})
        </button>
        {Object.entries(STATUS_CFG).map(([key, cfg]) => {
          const count = statusCounts[key] || 0
          if (count === 0) return null
          return (
            <button
              key={key}
              onClick={() => setStatusFilter(key)}
              className={`text-xs font-bold px-3 py-1.5 rounded-full transition-all ${
                statusFilter === key ? 'bg-gray-900 text-white' : cfg.color + ' hover:opacity-80'
              }`}
            >
              {cfg.label} ({count})
            </button>
          )
        })}
      </div>

      {/* Orders list */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-14 text-center">
          <Package size={40} className="text-gray-200 mx-auto mb-4" />
          <p className="font-bold text-gray-900 mb-1">Keine Bestellungen gefunden</p>
          <p className="text-sm text-gray-400">Versuchen Sie andere Filter</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((order: any) => {
            const cfg = STATUS_CFG[order.status] || STATUS_CFG.pending
            const isActive = ['pending', 'confirmed', 'shopping', 'in_transit'].includes(order.status)
            return (
              <Link
                key={order.id}
                href={`/bestellung/${order.id}`}
                className={`bg-white rounded-2xl border p-5 hover:shadow-sm transition-all ${
                  isActive ? 'border-red/30 hover:border-red' : 'border-gray-100 hover:border-gray-300'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    isActive ? 'bg-red/10' : 'bg-gray-50'
                  }`}>
                    <ShoppingBag size={20} className={isActive ? 'text-red' : 'text-gray-400'} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-black text-gray-900">{order.stores?.name}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.color}`}>
                        {cfg.label}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400 mb-2">
                      #{order.id.slice(0, 8).toUpperCase()} ·{' '}
                      {new Date(order.placed_at).toLocaleDateString('de-DE', {
                        weekday: 'short', day: '2-digit', month: 'long', year: 'numeric'
                      })}
                    </div>

                    {/* Price breakdown */}
                    <div className="flex gap-4 text-xs text-gray-500 flex-wrap">
                      <span>Waren: {Number(order.subtotal).toFixed(2)} €</span>
                      <span>Lieferung: {Number(order.delivery_fee).toFixed(2)} €</span>
                      {Number(order.tip_amount) > 0 && (
                        <span>Trinkgeld: {Number(order.tip_amount).toFixed(2)} €</span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <div className="font-black text-lg text-gray-900">
                      {Number(order.total).toFixed(2)} €
                    </div>
                    <ChevronRight size={16} className="text-gray-300" />
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
