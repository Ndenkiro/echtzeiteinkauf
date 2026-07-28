'use client'
// app/konto/ausgaben/page.tsx — Ausgabenanalyse
import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { Euro, TrendingUp, ShoppingBag, Store, Calendar, Percent } from 'lucide-react'

const SUPABASE_URL = 'https://wpxpgszzzfhhsaunolyq.supabase.co'
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndweHBnc3p6emZoaHNhdW5vbHlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0Mzg5ODQsImV4cCI6MjA5NzAxNDk4NH0.8_DVpLNwItAlkn_gL9a4dn-lZ00I8iifX2Cb9N_W-4U'

const COLORS = ['#E30B6D', '#F7A800', '#0050AA', '#22C55E', '#9333EA', '#64748B']

const MONTHS_DE = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']

export default function AusgabenPage() {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<'6m' | '12m' | 'all'>('6m')

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
        .select('id, status, total, subtotal, delivery_fee, service_fee, tip_amount, placed_at, stores(name)')
        .eq('customer_id', profile.id)
        .eq('status', 'delivered')
        .order('placed_at')

      setOrders(data || [])
      setLoading(false)
    })()
  }, [])

  // Filter by period
  const now = new Date()
  const cutoff = new Date()
  if (period === '6m') cutoff.setMonth(now.getMonth() - 6)
  else if (period === '12m') cutoff.setMonth(now.getMonth() - 12)
  else cutoff.setFullYear(2000)

  const filtered = orders.filter(o => new Date(o.placed_at) >= cutoff)

  // Monthly spending
  const monthlyMap: Record<string, { month: string; Ausgaben: number; Bestellungen: number }> = {}
  filtered.forEach(o => {
    const d = new Date(o.placed_at)
    const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}`
    const label = `${MONTHS_DE[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`
    if (!monthlyMap[key]) monthlyMap[key] = { month: label, Ausgaben: 0, Bestellungen: 0 }
    monthlyMap[key].Ausgaben += Number(o.total)
    monthlyMap[key].Bestellungen += 1
  })
  const monthlyData = Object.keys(monthlyMap).sort().map(k => ({
    ...monthlyMap[k],
    Ausgaben: Math.round(monthlyMap[k].Ausgaben * 100) / 100,
  }))

  // Spending by store
  const storeMap: Record<string, number> = {}
  filtered.forEach(o => {
    const name = o.stores?.name || 'Unbekannt'
    storeMap[name] = (storeMap[name] || 0) + Number(o.total)
  })
  const storeData = Object.entries(storeMap)
    .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
    .sort((a, b) => b.value - a.value)

  // Cost breakdown
  const totalWaren = filtered.reduce((s, o) => s + Number(o.subtotal), 0)
  const totalLieferung = filtered.reduce((s, o) => s + Number(o.delivery_fee), 0)
  const totalService = filtered.reduce((s, o) => s + Number(o.service_fee || 0), 0)
  const totalTrinkgeld = filtered.reduce((s, o) => s + Number(o.tip_amount || 0), 0)
  const totalAll = totalWaren + totalLieferung + totalService + totalTrinkgeld

  const breakdownData = [
    { name: 'Waren', value: Math.round(totalWaren * 100) / 100 },
    { name: 'Lieferung', value: Math.round(totalLieferung * 100) / 100 },
    { name: 'Service', value: Math.round(totalService * 100) / 100 },
    { name: 'Trinkgeld', value: Math.round(totalTrinkgeld * 100) / 100 },
  ].filter(d => d.value > 0)

  const avgOrder = filtered.length > 0 ? totalAll / filtered.length : 0
  const feesPercent = totalAll > 0 ? ((totalLieferung + totalService) / totalAll * 100) : 0

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-4 border-red border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Ausgabenanalyse</h1>
          <p className="text-sm text-gray-500 mt-1">
            {filtered.length} gelieferte Bestellungen
          </p>
        </div>
        <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
          {([['6m', '6 Monate'], ['12m', '12 Monate'], ['all', 'Gesamt']] as const).map(([v, l]) => (
            <button
              key={v}
              onClick={() => setPeriod(v)}
              className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                period === v ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
              }`}
            >{l}</button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-14 text-center">
          <TrendingUp size={40} className="text-gray-200 mx-auto mb-4" />
          <p className="font-bold text-gray-900 mb-1">Noch keine Daten</p>
          <p className="text-sm text-gray-400">
            Ihre Ausgabenstatistik erscheint nach der ersten gelieferten Bestellung.
          </p>
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Gesamt', value: `${totalAll.toFixed(2)} €`, icon: Euro, color: 'bg-green-50 text-green-600' },
              { label: 'Ø Bestellung', value: `${avgOrder.toFixed(2)} €`, icon: ShoppingBag, color: 'bg-blue-50 text-blue-600' },
              { label: 'Gebühren', value: `${feesPercent.toFixed(1)} %`, icon: Percent, color: 'bg-orange-50 text-orange-600' },
              { label: 'Märkte', value: storeData.length, icon: Store, color: 'bg-purple-50 text-purple-600' },
            ].map(k => {
              const Icon = k.icon
              return (
                <div key={k.label} className="bg-white rounded-2xl border border-gray-100 p-5">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${k.color}`}>
                    <Icon size={18} />
                  </div>
                  <div className="text-xl font-black text-gray-900">{k.value}</div>
                  <div className="text-xs font-bold text-gray-500 mt-1">{k.label}</div>
                </div>
              )
            })}
          </div>

          {/* Monthly spending chart */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
            <h2 className="font-black text-gray-900 mb-5">Ausgaben pro Monat</h2>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f1f1" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: any) => `${Number(v).toFixed(2)} €`} />
                <Line
                  type="monotone" dataKey="Ausgaben"
                  stroke="#E30B6D" strokeWidth={2.5}
                  dot={{ fill: '#E30B6D', r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="grid lg:grid-cols-2 gap-6 mb-6">
            {/* Cost breakdown pie */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="font-black text-gray-900 mb-5">Kostenaufteilung</h2>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={breakdownData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%" cy="50%"
                    innerRadius={50} outerRadius={80}
                    paddingAngle={3}
                  >
                    {breakdownData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: any) => `${Number(v).toFixed(2)} €`} />
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    formatter={(value) => <span className="text-xs text-gray-600">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Spending by store */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="font-black text-gray-900 mb-5">Ausgaben pro Markt</h2>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={storeData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f1f1" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
                  <Tooltip formatter={(v: any) => `${Number(v).toFixed(2)} €`} />
                  <Bar dataKey="value" fill="#E30B6D" radius={[0, 6, 6, 0]} name="Ausgaben" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Detail table */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="font-black text-gray-900 mb-5">Detailaufstellung</h2>
            <div className="flex flex-col gap-3">
              {[
                { label: 'Warenwert', value: totalWaren, color: 'bg-red' },
                { label: 'Liefergebühren', value: totalLieferung, color: 'bg-orange' },
                { label: 'Servicegebühren', value: totalService, color: 'bg-blue-500' },
                { label: 'Trinkgelder', value: totalTrinkgeld, color: 'bg-green-500' },
              ].map(row => {
                const pct = totalAll > 0 ? (row.value / totalAll * 100) : 0
                return (
                  <div key={row.label}>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="font-bold text-gray-700">{row.label}</span>
                      <span className="font-black text-gray-900">
                        {row.value.toFixed(2)} € <span className="text-gray-400 font-normal">({pct.toFixed(1)}%)</span>
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full ${row.color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
              <div className="border-t border-gray-100 pt-3 mt-2 flex justify-between">
                <span className="font-black text-gray-900">Gesamtsumme</span>
                <span className="font-black text-lg text-gray-900">{totalAll.toFixed(2)} €</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
