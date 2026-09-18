'use client'
// app/haendler-portal/page.tsx — merchant overview
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'
import {
  Package, ShoppingBag, Euro, Clock, CheckCircle2,
  ArrowRight, ExternalLink, AlertCircle, Plus, TrendingUp
} from 'lucide-react'

const SUPABASE_URL = 'https://wpxpgszzzfhhsaunolyq.supabase.co'
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndweHBnc3p6emZoaHNhdW5vbHlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0Mzg5ODQsImV4cCI6MjA5NzAxNDk4NH0.8_DVpLNwItAlkn_gL9a4dn-lZ00I8iifX2Cb9N_W-4U'

export default function MerchantDashboard() {
  const [ctx, setCtx] = useState<any>(null)
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const supabase = createBrowserClient(SUPABASE_URL, SUPABASE_ANON)

  useEffect(() => {
    (async () => {
      const { data } = await supabase.rpc('get_my_merchant_context')
      const c = data?.[0]
      setCtx(c)
      if (c?.store_id) {
        const { data: o } = await supabase
          .from('orders')
          .select('id, status, subtotal, total, placed_at')
          .eq('store_id', c.store_id)
          .order('placed_at', { ascending: false })
          .limit(5)
        setOrders(o || [])
      }
      setLoading(false)
    })()
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-4 border-orange border-t-transparent rounded-full animate-spin" />
    </div>
  )

  // Waiting for approval
  if (ctx?.status !== 'approved') return (
    <div className="max-w-lg">
      <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-10 text-center">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5 ${
          ctx?.status === 'rejected' ? 'bg-red-500/15' : 'bg-blue-500/15'
        }`}>
          {ctx?.status === 'rejected'
            ? <AlertCircle size={28} className="text-red-400" />
            : <Clock size={28} className="text-blue-400" />}
        </div>
        <h1 className="font-black text-xl text-white mb-2">
          {ctx?.status === 'rejected' ? 'Antrag abgelehnt' : 'Antrag in Prüfung'}
        </h1>
        <p className="text-sm text-white/50 leading-relaxed mb-6">
          {ctx?.status === 'rejected'
            ? ctx.rejection_note || 'Bitte kontaktieren Sie uns für Details.'
            : 'Wir prüfen Ihre Angaben und melden uns innerhalb von 2–3 Werktagen per E-Mail.'}
        </p>
        <Link href="/haendler" className="text-sm font-bold text-orange hover:underline">
          Angaben bearbeiten
        </Link>
      </div>
    </div>
  )

  const stats = [
    { label: 'Produkte',      value: ctx.product_count,   icon: Package,    color: 'text-orange bg-orange/15' },
    { label: 'Bestellungen',  value: ctx.order_count,     icon: ShoppingBag, color: 'text-blue-400 bg-blue-500/15' },
    { label: 'Umsatz Monat',  value: `${Number(ctx.revenue_month).toFixed(2)} €`, icon: Euro, color: 'text-green-400 bg-green-500/15' },
  ]

  return (
    <div>
      <div className="mb-7">
        <h1 className="text-2xl font-black text-white">{ctx.business_name}</h1>
        <div className="flex items-center gap-2 mt-1.5">
          <span className="flex items-center gap-1 text-[11px] font-black text-green-400 bg-green-500/15 px-2 py-1 rounded-full">
            <CheckCircle2 size={10} /> Freigeschaltet
          </span>
          {ctx.store_slug && (
            <a href={`/markt/${ctx.store_slug}`} target="_blank" rel="noopener"
              className="flex items-center gap-1 text-[11px] font-bold text-white/40 hover:text-orange transition-colors">
              <ExternalLink size={10} /> Shop ansehen
            </a>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-7">
        {stats.map(s => {
          const Icon = s.icon
          return (
            <div key={s.label} className="bg-white/[0.04] border border-white/10 rounded-2xl p-5">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${s.color}`}>
                <Icon size={18} />
              </div>
              <div className="text-2xl font-black text-white">{s.value}</div>
              <div className="text-[11px] font-bold text-white/40 mt-0.5">{s.label}</div>
            </div>
          )
        })}
      </div>

      {Number(ctx.product_count) === 0 && (
        <div className="bg-orange/10 border border-orange/30 rounded-2xl p-5 mb-7 flex items-start gap-4">
          <div className="w-11 h-11 rounded-xl bg-orange/20 flex items-center justify-center flex-shrink-0">
            <Package size={20} className="text-orange" />
          </div>
          <div className="flex-1">
            <h2 className="font-black text-white mb-1">Noch keine Produkte</h2>
            <p className="text-sm text-white/60 mb-4">
              Kunden können erst bei Ihnen bestellen, wenn Sie Produkte angelegt haben.
            </p>
            <Link href="/haendler-portal/produkte"
              className="inline-flex items-center gap-2 bg-orange text-black font-black rounded-xl px-5 py-2.5 text-sm hover:bg-orange-dark hover:text-white transition-colors">
              <Plus size={15} /> Produkte anlegen
            </Link>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-3">
        <h2 className="font-black text-xs text-white/40 uppercase tracking-wide">
          Letzte Bestellungen
        </h2>
        <Link href="/haendler-portal/bestellungen" className="text-[11px] font-bold text-orange hover:underline">
          Alle ansehen →
        </Link>
      </div>

      {orders.length === 0 ? (
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-10 text-center">
          <ShoppingBag size={30} className="text-white/20 mx-auto mb-3" />
          <p className="font-bold text-white mb-1">Noch keine Bestellungen</p>
          <p className="text-sm text-white/40">
            Sobald Kunden bei Ihnen bestellen, erscheinen die Aufträge hier.
          </p>
        </div>
      ) : (
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl divide-y divide-white/[0.06]">
          {orders.map(o => (
            <div key={o.id} className="flex items-center gap-3 px-4 py-3">
              <div className="w-9 h-9 rounded-xl bg-white/[0.06] flex items-center justify-center flex-shrink-0">
                <ShoppingBag size={15} className="text-white/50" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-white">
                  #{o.id.slice(0, 8).toUpperCase()}
                </div>
                <div className="text-[11px] text-white/35">
                  {new Date(o.placed_at).toLocaleString('de-DE', {
                    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                  })}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="font-black text-sm text-white">
                  {Number(o.subtotal).toFixed(2)} €
                </div>
                <div className="text-[10px] text-white/30">{o.status}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
