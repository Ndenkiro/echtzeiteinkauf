'use client'
// app/admin/statistiken/page.tsx
import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'
import { TrendingUp, Euro, ShoppingBag, XCircle, Clock, Store } from 'lucide-react'

const SUPABASE_URL = 'https://wpxpgszzzfhhsaunolyq.supabase.co'
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndweHBnc3p6emZoaHNhdW5vbHlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0Mzg5ODQsImV4cCI6MjA5NzAxNDk4NH0.8_DVpLNwItAlkn_gL9a4dn-lZ00I8iifX2Cb9N_W-4U'

export default function StatistikenPage() {
  const [period, setPeriod] = useState(30)
  const [revenueData, setRevenueData] = useState<any[]>([])
  const [topStores, setTopStores] = useState<any[]>([])
  const [kpis, setKpis] = useState({ revenue: 0, commission: 0, orders: 0, cancelled: 0, avgDelay: 0, cancelRate: 0 })
  const [commissions, setCommissions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const supabase = createBrowserClient(SUPABASE_URL, SUPABASE_ANON)

  const load = async () => {
    setLoading(true)

    // Revenue stats
    const { data: rev } = await supabase.rpc('get_revenue_stats', { days_back: period })
    const revData = (rev || []).map((r: any) => ({
      date: new Date(r.date).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' }),
      Umsatz: Number(r.revenue),
      Provision: Number(r.commission),
      Bestellungen: Number(r.orders),
    })).reverse()
    setRevenueData(revData)

    // KPIs
    const totalRevenue = revData.reduce((a: number, r: any) => a + r.Umsatz, 0)
    const totalCommission = revData.reduce((a: number, r: any) => a + r.Provision, 0)
    const totalOrders = revData.reduce((a: number, r: any) => a + r.Bestellungen, 0)
    const totalCancelled = (rev || []).reduce((a: number, r: any) => a + Number(r.cancelled), 0)
    const cancelRate = totalOrders + totalCancelled > 0 ? (totalCancelled / (totalOrders + totalCancelled) * 100) : 0

    setKpis({
      revenue: totalRevenue,
      commission: totalCommission,
      orders: totalOrders,
      cancelled: totalCancelled,
      avgDelay: 0,
      cancelRate: Math.round(cancelRate * 10) / 10,
    })

    // Top stores
    const { data: stores } = await supabase
      .from('orders')
      .select('store_id, stores(name), total, status')
      .neq('status', 'cancelled')
      .gte('placed_at', new Date(Date.now() - period * 86400000).toISOString())

    const storeMap: Record<string, { name: string; orders: number; revenue: number }> = {}
    ;(stores || []).forEach((o: any) => {
      const key = o.store_id
      if (!storeMap[key]) storeMap[key] = { name: o.stores?.name || '—', orders: 0, revenue: 0 }
      storeMap[key].orders++
      storeMap[key].revenue += Number(o.total)
    })
    setTopStores(Object.values(storeMap).sort((a, b) => b.orders - a.orders).slice(0, 6))

    // Commission per store
    const { data: commData } = await supabase
      .from('store_commissions')
      .select('*, stores(name)')
    setCommissions(commData || [])

    setLoading(false)
  }

  useEffect(() => { load() }, [period])

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Statistiken</h1>
          <p className="text-sm text-gray-500 mt-1">Übersicht der letzten {period} Tage</p>
        </div>
        <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
          {[7, 30, 90].map(d => (
            <button
              key={d}
              onClick={() => setPeriod(d)}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${period === d ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
            >{d}d</button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {[
          { label: 'Umsatz', value: `${kpis.revenue.toFixed(2)} €`, icon: Euro, color: 'text-green-600 bg-green-50' },
          { label: 'Provision', value: `${kpis.commission.toFixed(2)} €`, icon: TrendingUp, color: 'text-blue-600 bg-blue-50' },
          { label: 'Bestellungen', value: kpis.orders, icon: ShoppingBag, color: 'text-purple-600 bg-purple-50' },
          { label: 'Storniert', value: kpis.cancelled, icon: XCircle, color: 'text-red bg-red/10' },
          { label: 'Stornoq.', value: `${kpis.cancelRate}%`, icon: Clock, color: 'text-orange-600 bg-orange-50' },
          { label: 'Märkte', value: topStores.length, icon: Store, color: 'text-gray-600 bg-gray-100' },
        ].map(k => {
          const Icon = k.icon
          return (
            <div key={k.label} className="bg-white rounded-2xl border border-gray-100 p-4">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2 ${k.color}`}>
                <Icon size={16} />
              </div>
              <div className="text-xl font-black text-gray-900">{k.value}</div>
              <div className="text-xs text-gray-400 mt-0.5 font-bold uppercase tracking-wide">{k.label}</div>
            </div>
          )
        })}
      </div>

      {/* Revenue chart */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
        <h2 className="font-black text-gray-900 mb-5">Umsatz & Provision</h2>
        {loading ? (
          <div className="h-48 flex items-center justify-center text-gray-400 text-sm">Lädt...</div>
        ) : revenueData.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-gray-400 text-sm">Noch keine Daten</div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: any) => `${Number(v).toFixed(2)} €`} />
              <Line type="monotone" dataKey="Umsatz" stroke="#E30B6D" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Provision" stroke="#F7A800" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        {/* Top stores */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="font-black text-gray-900 mb-5">Top Märkte</h2>
          {topStores.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Noch keine Daten</p>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={topStores} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={70} />
                <Tooltip />
                <Bar dataKey="orders" fill="#E30B6D" radius={[0,4,4,0]} name="Bestellungen" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Commission per store */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="font-black text-gray-900 mb-5">Provision pro Markt</h2>
          <div className="flex flex-col gap-3">
            {commissions.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">Keine Konfiguration</p>
            ) : commissions.map((c: any) => (
              <div key={c.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div>
                  <div className="font-bold text-sm text-gray-900">{c.stores?.name}</div>
                  <div className="text-xs text-gray-400">Shopper: {Math.round(c.shopper_rate * 100)}% der Liefergebühr</div>
                </div>
                <div className="text-right">
                  <div className="font-black text-sm text-gray-900">{Math.round(c.rate * 100)}%</div>
                  <div className="text-xs text-gray-400">Provision</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Cancellation stats */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h2 className="font-black text-gray-900 mb-5">Bestellungen pro Tag</h2>
        {loading || revenueData.length === 0 ? (
          <div className="h-40 flex items-center justify-center text-gray-400 text-sm">
            {loading ? 'Lädt...' : 'Noch keine Daten'}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="Bestellungen" fill="#0A0A0A" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
