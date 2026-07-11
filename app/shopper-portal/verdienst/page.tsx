'use client'
// app/shopper-portal/verdienst/page.tsx
import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Wallet, TrendingUp, Calendar, Zap, ArrowUpRight } from 'lucide-react'

const SUPABASE_URL = 'https://wpxpgszzzfhhsaunolyq.supabase.co'
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndweHBnc3p6emZoaHNhdW5vbHlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0Mzg5ODQsImV4cCI6MjA5NzAxNDk4NH0.8_DVpLNwItAlkn_gL9a4dn-lZ00I8iifX2Cb9N_W-4U'

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  delivery_fee: { label: 'Liefergebühr', color: 'bg-blue-50 text-blue-700' },
  tip:          { label: 'Trinkgeld 🎉', color: 'bg-green-50 text-green-700' },
  bonus:        { label: 'Bonus',        color: 'bg-orange-50 text-orange-700' },
  adjustment:   { label: 'Korrektur',   color: 'bg-gray-100 text-gray-600' },
}

export default function VerdienstPage() {
  const [earnings, setEarnings] = useState<any[]>([])
  const [shopperId, setShopperId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [live, setLive] = useState(false)

  const supabase = createBrowserClient(SUPABASE_URL, SUPABASE_ANON)

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: profile } = await supabase.from('users').select('id').eq('auth_id', user.id).single()
    if (!profile) return
    const { data: shopper } = await supabase.from('shoppers').select('id').eq('user_id', profile.id).maybeSingle()
    if (!shopper) { setLoading(false); return }
    setShopperId(shopper.id)

    const { data } = await supabase
      .from('shopper_earnings')
      .select('*, orders(id, placed_at, stores(name))')
      .eq('shopper_id', shopper.id)
      .order('created_at', { ascending: false })
      .limit(50)
    setEarnings(data || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  // Realtime subscription
  useEffect(() => {
    if (!shopperId) return
    setLive(true)
    const channel = supabase
      .channel(`earnings-${shopperId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'shopper_earnings',
        filter: `shopper_id=eq.${shopperId}`,
      }, (payload) => {
        setEarnings(prev => [payload.new, ...prev])
      })
      .subscribe()

    return () => { supabase.removeChannel(channel); setLive(false) }
  }, [shopperId])

  const total = earnings.reduce((a, e) => a + Number(e.amount), 0)
  const thisMonth = earnings
    .filter(e => new Date(e.created_at).getMonth() === new Date().getMonth())
    .reduce((a, e) => a + Number(e.amount), 0)
  const pending = earnings.filter(e => e.status === 'pending').reduce((a, e) => a + Number(e.amount), 0)
  const tips = earnings.filter(e => e.type === 'tip').reduce((a, e) => a + Number(e.amount), 0)

  if (loading) return <div className="text-sm text-gray-400 p-8">Lädt...</div>

  if (!shopperId) return (
    <div className="max-w-lg">
      <div className="bg-white rounded-2xl border border-gray-100 p-14 text-center">
        <Wallet size={32} className="text-gray-300 mx-auto mb-3" />
        <p className="font-bold text-gray-900 mb-1">Noch nicht freigeschaltet</p>
        <p className="text-sm text-gray-400">Reichen Sie Ihre Dokumente ein, um Aufträge annehmen zu können.</p>
      </div>
    </div>
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Verdienst</h1>
          <p className="text-sm text-gray-500 mt-1">Ihre Einnahmen bei Echtzeiteinkauf</p>
        </div>
        {live && (
          <div className="flex items-center gap-1.5 text-xs font-bold text-green-700 bg-green-50 px-3 py-1.5 rounded-full">
            <Zap size={12} className="animate-pulse" /> Live
          </div>
        )}
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Gesamt', value: `${total.toFixed(2)} €`, icon: Wallet, color: 'text-gray-700 bg-gray-100' },
          { label: 'Diesen Monat', value: `${thisMonth.toFixed(2)} €`, icon: TrendingUp, color: 'text-green-700 bg-green-50' },
          { label: 'Ausstehend', value: `${pending.toFixed(2)} €`, icon: Calendar, color: 'text-orange-600 bg-orange-50' },
          { label: 'Trinkgelder', value: `${tips.toFixed(2)} €`, icon: ArrowUpRight, color: 'text-red bg-red/10' },
        ].map(k => {
          const Icon = k.icon
          return (
            <div key={k.label} className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${k.color}`}>
                <Icon size={18} />
              </div>
              <div className="text-xl font-black text-gray-900">{k.value}</div>
              <div className="text-xs text-gray-400 mt-1 font-bold uppercase tracking-wide">{k.label}</div>
            </div>
          )
        })}
      </div>

      {/* Transactions */}
      <h2 className="font-black text-sm text-gray-900 mb-3 uppercase tracking-wide">Transaktionen</h2>
      {earnings.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-14 text-center">
          <Wallet size={32} className="text-gray-300 mx-auto mb-3" />
          <p className="font-bold text-gray-900 mb-1">Noch keine Einnahmen</p>
          <p className="text-sm text-gray-400">Ihre Verdienste erscheinen hier nach abgeschlossenen Lieferungen.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
          {earnings.map((e: any) => {
            const cfg = TYPE_LABELS[e.type] || TYPE_LABELS.adjustment
            return (
              <div key={e.id} className="flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${cfg.color}`}>{cfg.label}</span>
                  </div>
                  <div>
                    <div className="font-bold text-sm text-gray-900">
                      {e.orders?.stores?.name || 'Bestellung'}
                    </div>
                    <div className="text-xs text-gray-400">
                      {new Date(e.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </div>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="font-black text-gray-900">+{Number(e.amount).toFixed(2)} €</div>
                  <div className={`text-xs font-bold ${e.status === 'paid' ? 'text-green-600' : 'text-orange-500'}`}>
                    {e.status === 'paid' ? 'Ausgezahlt' : 'Ausstehend'}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
