'use client'
// app/shopper-portal/verdienst/page.tsx — Verdienst & Provisionshistorie
import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import {
  Wallet, TrendingUp, Package, Star, Euro,
  Calendar, Percent, ChevronDown, ChevronUp, Info
} from 'lucide-react'

const SUPABASE_URL = 'https://wpxpgszzzfhhsaunolyq.supabase.co'
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndweHBnc3p6emZoaHNhdW5vbHlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0Mzg5ODQsImV4cCI6MjA5NzAxNDk4NH0.8_DVpLNwItAlkn_gL9a4dn-lZ00I8iifX2Cb9N_W-4U'

const MONTHS_DE = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']

type Breakdown = {
  deliveryShare: number   // 80% of delivery fee
  tip: number             // 100% of tip
  gross: number
  platformFee: number     // 10% of gross
  net: number
}

const calcBreakdown = (deliveryFee: number, tip: number): Breakdown => {
  const deliveryShare = Math.round(Number(deliveryFee) * 0.8 * 100) / 100
  const tipAmount = Math.round(Number(tip || 0) * 100) / 100
  const gross = Math.round((deliveryShare + tipAmount) * 100) / 100
  const platformFee = Math.round(gross * 0.1 * 100) / 100
  return {
    deliveryShare,
    tip: tipAmount,
    gross,
    platformFee,
    net: Math.round((gross - platformFee) * 100) / 100,
  }
}

export default function VerdienstPage() {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [period, setPeriod] = useState<'6m' | '12m' | 'all'>('6m')

  const supabase = createBrowserClient(SUPABASE_URL, SUPABASE_ANON)

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }
      const { data: profile } = await supabase
        .from('users').select('id').eq('auth_id', user.id).single()
      if (!profile) { setLoading(false); return }

      const { data } = await supabase
        .from('orders')
        .select('id, total, delivery_fee, tip_amount, distance_km, placed_at, delivered_at, stores(name)')
        .eq('shopper_id', profile.id)
        .eq('status', 'delivered')
        .order('delivered_at', { ascending: false })

      setOrders(data || [])
      setLoading(false)
    })()
  }, [])

  const now = new Date()
  const cutoff = new Date()
  if (period === '6m') cutoff.setMonth(now.getMonth() - 6)
  else if (period === '12m') cutoff.setMonth(now.getMonth() - 12)
  else cutoff.setFullYear(2000)

  const filtered = orders.filter(o => new Date(o.delivered_at || o.placed_at) >= cutoff)

  // Totals
  const totals = filtered.reduce((acc, o) => {
    const b = calcBreakdown(Number(o.delivery_fee), Number(o.tip_amount))
    acc.deliveryShare += b.deliveryShare
    acc.tip += b.tip
    acc.gross += b.gross
    acc.platformFee += b.platformFee
    acc.net += b.net
    return acc
  }, { deliveryShare: 0, tip: 0, gross: 0, platformFee: 0, net: 0 })

  // Monthly chart data
  const monthlyMap: Record<string, { month: string; Netto: number; Trinkgeld: number; Auftraege: number }> = {}
  filtered.forEach(o => {
    const d = new Date(o.delivered_at || o.placed_at)
    const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}`
    const label = `${MONTHS_DE[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`
    if (!monthlyMap[key]) monthlyMap[key] = { month: label, Netto: 0, Trinkgeld: 0, Auftraege: 0 }
    const b = calcBreakdown(Number(o.delivery_fee), Number(o.tip_amount))
    monthlyMap[key].Netto += b.net
    monthlyMap[key].Trinkgeld += b.tip
    monthlyMap[key].Auftraege += 1
  })
  const monthlyData = Object.keys(monthlyMap).sort().map(k => ({
    ...monthlyMap[k],
    Netto: Math.round(monthlyMap[k].Netto * 100) / 100,
    Trinkgeld: Math.round(monthlyMap[k].Trinkgeld * 100) / 100,
  }))

  const avgNet = filtered.length > 0 ? totals.net / filtered.length : 0

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-4 border-orange border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Verdienst</h1>
          <p className="text-sm text-gray-500 mt-1">
            {filtered.length} abgeschlossene Aufträge
          </p>
        </div>
        <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
          {([['6m', '6 Mon.'], ['12m', '12 Mon.'], ['all', 'Gesamt']] as const).map(([v, l]) => (
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

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Nettoverdienst', value: `${totals.net.toFixed(2)} €`, icon: Wallet, color: 'bg-green-50 text-green-600' },
          { label: 'Ø pro Auftrag', value: `${avgNet.toFixed(2)} €`, icon: Euro, color: 'bg-blue-50 text-blue-600' },
          { label: 'Trinkgelder', value: `${totals.tip.toFixed(2)} €`, icon: Star, color: 'bg-orange-50 text-orange-600' },
          { label: 'Plattformgebühr', value: `−${totals.platformFee.toFixed(2)} €`, icon: Percent, color: 'bg-gray-100 text-gray-600' },
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

      {/* Explanation box */}
      <div className="bg-blue-50 rounded-2xl p-5 mb-6 flex gap-3">
        <Info size={18} className="text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-900">
          <div className="font-black mb-1">So berechnet sich Ihr Verdienst</div>
          <div className="text-xs leading-relaxed text-blue-700">
            Sie erhalten <strong>80 % der Liefergebühr</strong> plus <strong>100 % des Trinkgelds</strong>.
            Davon wird eine <strong>Plattformgebühr von 10 %</strong> abgezogen.
            Der Warenwert wird vollständig über die virtuelle Einkaufskarte bezahlt und
            berührt Ihren Verdienst nicht.
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-14 text-center">
          <Wallet size={40} className="text-gray-200 mx-auto mb-4" />
          <p className="font-bold text-gray-900 mb-1">Noch keine Einnahmen</p>
          <p className="text-sm text-gray-400">
            Ihr Verdienst erscheint hier nach der ersten abgeschlossenen Lieferung.
          </p>
        </div>
      ) : (
        <>
          {/* Chart */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
            <h2 className="font-black text-gray-900 mb-5">Verdienst pro Monat</h2>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f1f1" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: any) => `${Number(v).toFixed(2)} €`} />
                <Line type="monotone" dataKey="Netto" stroke="#22C55E" strokeWidth={2.5} dot={{ fill: '#22C55E', r: 4 }} />
                <Line type="monotone" dataKey="Trinkgeld" stroke="#F7A800" strokeWidth={2} dot={{ fill: '#F7A800', r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Orders per month */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
            <h2 className="font-black text-gray-900 mb-5">Aufträge pro Monat</h2>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f1f1" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="Auftraege" fill="#0A0A0A" radius={[6, 6, 0, 0]} name="Aufträge" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Detailed commission history */}
          <h2 className="font-black text-sm text-gray-900 uppercase tracking-wide mb-3">
            Provisionshistorie
          </h2>
          <div className="flex flex-col gap-2">
            {filtered.map((order: any) => {
              const b = calcBreakdown(Number(order.delivery_fee), Number(order.tip_amount))
              const isOpen = expanded === order.id
              return (
                <div key={order.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                  <button
                    onClick={() => setExpanded(isOpen ? null : order.id)}
                    className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors text-left"
                  >
                    <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0">
                      <Package size={17} className="text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm text-gray-900">{order.stores?.name}</div>
                      <div className="text-xs text-gray-400">
                        #{order.id.slice(0, 8).toUpperCase()} ·{' '}
                        {new Date(order.delivered_at || order.placed_at).toLocaleDateString('de-DE', {
                          day: '2-digit', month: 'short', year: 'numeric'
                        })}
                        {order.distance_km && ` · ${order.distance_km} km`}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="font-black text-green-600">+{b.net.toFixed(2)} €</div>
                      <div className="text-[10px] text-gray-400">Netto</div>
                    </div>
                    {isOpen ? <ChevronUp size={16} className="text-gray-300" /> : <ChevronDown size={16} className="text-gray-300" />}
                  </button>

                  {isOpen && (
                    <div className="px-5 pb-5 pt-1 bg-gray-50/50 border-t border-gray-50">
                      <div className="flex flex-col gap-2 text-sm">
                        <div className="flex justify-between text-gray-500">
                          <span>Liefergebühr gesamt</span>
                          <span>{Number(order.delivery_fee).toFixed(2)} €</span>
                        </div>
                        <div className="flex justify-between text-gray-700 font-medium">
                          <span>Ihr Anteil (80 %)</span>
                          <span>{b.deliveryShare.toFixed(2)} €</span>
                        </div>
                        {b.tip > 0 && (
                          <div className="flex justify-between text-orange-600 font-medium">
                            <span>Trinkgeld (100 %)</span>
                            <span>+{b.tip.toFixed(2)} €</span>
                          </div>
                        )}
                        <div className="flex justify-between text-gray-700 font-bold border-t border-gray-200 pt-2">
                          <span>Bruttoverdienst</span>
                          <span>{b.gross.toFixed(2)} €</span>
                        </div>
                        <div className="flex justify-between text-gray-400">
                          <span>Plattformgebühr (10 %)</span>
                          <span>−{b.platformFee.toFixed(2)} €</span>
                        </div>
                        <div className="flex justify-between font-black text-gray-900 border-t border-gray-200 pt-2 text-base">
                          <span>Nettoverdienst</span>
                          <span className="text-green-600">{b.net.toFixed(2)} €</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Summary total */}
          <div className="bg-gray-900 rounded-2xl p-6 mt-6 text-white">
            <div className="text-xs font-bold uppercase tracking-wide text-white/50 mb-3">
              Zusammenfassung {period === '6m' ? '(6 Monate)' : period === '12m' ? '(12 Monate)' : '(Gesamt)'}
            </div>
            <div className="flex flex-col gap-2 text-sm">
              <div className="flex justify-between text-white/70">
                <span>Lieferanteile (80 %)</span>
                <span>{totals.deliveryShare.toFixed(2)} €</span>
              </div>
              <div className="flex justify-between text-white/70">
                <span>Trinkgelder</span>
                <span>+{totals.tip.toFixed(2)} €</span>
              </div>
              <div className="flex justify-between text-white/70 border-t border-white/10 pt-2">
                <span>Brutto</span>
                <span>{totals.gross.toFixed(2)} €</span>
              </div>
              <div className="flex justify-between text-white/50">
                <span>Plattformgebühr</span>
                <span>−{totals.platformFee.toFixed(2)} €</span>
              </div>
              <div className="flex justify-between font-black text-lg border-t border-white/20 pt-3 mt-1">
                <span>Nettoverdienst</span>
                <span className="text-orange">{totals.net.toFixed(2)} €</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
