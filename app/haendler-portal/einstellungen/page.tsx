'use client'
// app/haendler-portal/einstellungen/page.tsx
import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import {
  Store, Clock, Phone, Euro, Save, Loader2, Power,
  MapPin, ExternalLink, Copy, Check, AlertCircle
} from 'lucide-react'
import { toast } from 'sonner'
import { getCategory } from '@/lib/categories'

const SUPABASE_URL = 'https://wpxpgszzzfhhsaunolyq.supabase.co'
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndweHBnc3p6emZoaHNhdW5vbHlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0Mzg5ODQsImV4cCI6MjA5NzAxNDk4NH0.8_DVpLNwItAlkn_gL9a4dn-lZ00I8iifX2Cb9N_W-4U'

const DAYS = [
  { key: 'mon', label: 'Montag' },
  { key: 'tue', label: 'Dienstag' },
  { key: 'wed', label: 'Mittwoch' },
  { key: 'thu', label: 'Donnerstag' },
  { key: 'fri', label: 'Freitag' },
  { key: 'sat', label: 'Samstag' },
  { key: 'sun', label: 'Sonntag' },
]

type DayHours = { open: string; close: string; closed: boolean }

const DEFAULT_HOURS: Record<string, DayHours> = Object.fromEntries(
  DAYS.map(d => [d.key, {
    open: '08:00',
    close: d.key === 'sat' ? '18:00' : '20:00',
    closed: d.key === 'sun',
  }])
)

export default function EinstellungenPage() {
  const [store, setStore] = useState<any>(null)
  const [hours, setHours] = useState<Record<string, DayHours>>(DEFAULT_HOURS)
  const [phone, setPhone] = useState('')
  const [description, setDescription] = useState('')
  const [minOrder, setMinOrder] = useState('')
  const [accepts, setAccepts] = useState(true)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)

  const supabase = createBrowserClient(SUPABASE_URL, SUPABASE_ANON)

  useEffect(() => {
    (async () => {
      const { data } = await supabase.rpc('get_merchant_store')
      const s = data?.[0]
      if (s) {
        setStore(s)
        setPhone(s.phone || '')
        setDescription(s.description || '')
        setMinOrder(s.min_order ? String(s.min_order) : '')
        setAccepts(s.accepts_orders ?? true)
        if (s.opening_hours && Object.keys(s.opening_hours).length > 0) {
          setHours({ ...DEFAULT_HOURS, ...s.opening_hours })
        }
      }
      setLoading(false)
    })()
  }, [])

  const setDay = (key: string, patch: Partial<DayHours>) =>
    setHours(h => ({ ...h, [key]: { ...h[key], ...patch } }))

  const save = async () => {
    setSaving(true)
    const { data, error } = await supabase.rpc('update_merchant_store', {
      p_data: {
        phone: phone.trim(),
        description: description.trim(),
        opening_hours: hours,
        min_order: minOrder || '0',
        accepts_orders: accepts,
      },
    })
    setSaving(false)
    if (error || !data?.ok) { toast.error('Speichern fehlgeschlagen'); return }
    toast.success('Einstellungen gespeichert ✓')
  }

  const copyLink = () => {
    navigator.clipboard.writeText(`https://echtzeiteinkauf.com/markt/${store.slug}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-4 border-orange border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!store) return (
    <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-10 text-center max-w-lg">
      <Store size={32} className="text-white/20 mx-auto mb-4" />
      <h1 className="font-black text-xl text-white mb-2">Noch kein Shop</h1>
      <p className="text-sm text-white/50">
        Ihre Einstellungen erscheinen hier, sobald Ihr Betrieb freigeschaltet ist.
      </p>
    </div>
  )

  const cat = getCategory(store.category)

  return (
    <div>
      <div className="mb-7">
        <h1 className="text-2xl font-black text-white">Einstellungen</h1>
        <p className="text-sm text-white/40 mt-1">Ihr Shop und Ihre Öffnungszeiten</p>
      </div>

      {/* Shop identity */}
      <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-5 mb-5">
        <div className="flex items-start gap-4 mb-4">
          <div className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
            style={{ background: `${cat.color}22` }}>
            {cat.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-black text-white text-lg truncate">{store.name}</div>
            <div className="text-xs text-white/40 flex items-center gap-1 mt-0.5">
              <MapPin size={11} /> {store.address}, {store.postal_code} {store.city}
            </div>
            <span className="inline-block text-[10px] font-black px-2 py-0.5 rounded-full text-white mt-2"
              style={{ background: cat.color }}>
              {cat.label}
            </span>
          </div>
        </div>

        <div className="flex gap-2">
          <a href={`/markt/${store.slug}`} target="_blank" rel="noopener"
            className="flex-1 flex items-center justify-center gap-2 border border-white/15 text-white/70 font-bold rounded-xl py-2.5 text-xs hover:border-orange hover:text-orange transition-all">
            <ExternalLink size={13} /> Shop ansehen
          </a>
          <button onClick={copyLink}
            className="flex-1 flex items-center justify-center gap-2 border border-white/15 text-white/70 font-bold rounded-xl py-2.5 text-xs hover:border-orange hover:text-orange transition-all">
            {copied ? <><Check size={13} className="text-green-400" /> Kopiert</>
                    : <><Copy size={13} /> Link kopieren</>}
          </button>
        </div>
      </div>

      {/* Accepting orders */}
      <div className={`rounded-2xl border-2 p-5 mb-5 transition-colors ${
        accepts ? 'border-green-500/30 bg-green-500/[0.07]' : 'border-white/10 bg-white/[0.04]'
      }`}>
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
            accepts ? 'bg-green-500/20' : 'bg-white/[0.08]'
          }`}>
            <Power size={22} className={accepts ? 'text-green-400' : 'text-white/40'} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-black text-white">
              {accepts ? 'Shop nimmt Bestellungen an' : 'Shop pausiert'}
            </div>
            <div className="text-xs text-white/50 mt-0.5">
              {accepts
                ? 'Kunden können bei Ihnen bestellen'
                : 'Ihr Sortiment bleibt sichtbar, aber Bestellungen sind gesperrt'}
            </div>
          </div>
          <button onClick={() => setAccepts(v => !v)}
            className={`relative w-14 h-8 rounded-full transition-colors flex-shrink-0 ${
              accepts ? 'bg-green-500' : 'bg-white/20'
            }`}>
            <span className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow transition-transform ${
              accepts ? 'translate-x-7' : 'translate-x-1'
            }`} />
          </button>
        </div>
      </div>

      {/* Opening hours */}
      <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-5 mb-5">
        <div className="flex items-center gap-2 mb-1">
          <Clock size={16} className="text-white/40" />
          <h2 className="font-black text-white">Öffnungszeiten</h2>
        </div>
        <p className="text-xs text-white/40 mb-4">
          Shopper holen nur innerhalb dieser Zeiten bei Ihnen ab.
        </p>

        <div className="flex flex-col gap-2">
          {DAYS.map(d => {
            const h = hours[d.key]
            return (
              <div key={d.key} className="flex items-center gap-3">
                <span className="text-sm font-bold text-white/70 w-24 flex-shrink-0">
                  {d.label}
                </span>

                {h.closed ? (
                  <span className="flex-1 text-sm text-white/30">Geschlossen</span>
                ) : (
                  <div className="flex-1 flex items-center gap-2">
                    <input type="time" value={h.open}
                      onChange={e => setDay(d.key, { open: e.target.value })}
                      className="bg-white/[0.06] border border-white/10 rounded-lg px-2.5 py-1.5 text-sm text-white outline-none focus:border-orange transition-colors" />
                    <span className="text-white/30 text-xs">–</span>
                    <input type="time" value={h.close}
                      onChange={e => setDay(d.key, { close: e.target.value })}
                      className="bg-white/[0.06] border border-white/10 rounded-lg px-2.5 py-1.5 text-sm text-white outline-none focus:border-orange transition-colors" />
                  </div>
                )}

                <button onClick={() => setDay(d.key, { closed: !h.closed })}
                  className={`text-[10px] font-bold px-2.5 py-1.5 rounded-lg border transition-all flex-shrink-0 ${
                    h.closed ? 'border-orange/40 text-orange bg-orange/10'
                             : 'border-white/10 text-white/40 hover:border-white/25'
                  }`}>
                  {h.closed ? 'Geöffnet' : 'Zu'}
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {/* Contact and rules */}
      <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-5 mb-5">
        <h2 className="font-black text-white mb-4">Kontakt &amp; Regeln</h2>

        <div className="flex flex-col gap-4">
          <div>
            <label className="text-[10px] font-black text-white/40 uppercase tracking-wide mb-1.5 block">
              Telefon <span className="font-normal normal-case">(für Shopper bei Rückfragen)</span>
            </label>
            <div className="flex items-center gap-2 bg-white/[0.06] border border-white/10 rounded-xl px-3 py-2.5 focus-within:border-orange transition-colors">
              <Phone size={15} className="text-white/30 flex-shrink-0" />
              <input value={phone} onChange={e => setPhone(e.target.value)}
                placeholder="+49 …"
                className="flex-1 outline-none text-sm bg-transparent text-white placeholder-white/25" />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black text-white/40 uppercase tracking-wide mb-1.5 block">
              Mindestbestellwert
            </label>
            <div className="flex items-center gap-2 bg-white/[0.06] border border-white/10 rounded-xl px-3 py-2.5 focus-within:border-orange transition-colors">
              <Euro size={15} className="text-white/30 flex-shrink-0" />
              <input type="number" step="0.50" min="0" value={minOrder}
                onChange={e => setMinOrder(e.target.value)} placeholder="0.00"
                className="flex-1 outline-none text-sm bg-transparent text-white placeholder-white/25" />
            </div>
            <p className="text-[10px] text-white/30 mt-1.5">
              Leer lassen oder 0 für keinen Mindestwert.
            </p>
          </div>

          <div>
            <label className="text-[10px] font-black text-white/40 uppercase tracking-wide mb-1.5 block">
              Beschreibung <span className="font-normal normal-case">(wird Kunden angezeigt)</span>
            </label>
            <textarea value={description} onChange={e => setDescription(e.target.value)}
              rows={3} placeholder="Was macht Ihren Betrieb aus?"
              className="w-full bg-white/[0.06] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/25 outline-none focus:border-orange transition-colors resize-none" />
          </div>
        </div>
      </div>

      <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 mb-5 flex gap-3">
        <AlertCircle size={16} className="text-blue-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-white/70 leading-relaxed">
          Firmenname und Adresse können nur vom Support geändert werden —
          schreiben Sie an kontakt@echtzeiteinkauf.com.
        </p>
      </div>

      <button onClick={save} disabled={saving}
        className="w-full bg-orange text-black font-black rounded-2xl py-4 text-base flex items-center justify-center gap-2 hover:bg-orange-dark hover:text-white transition-colors disabled:opacity-50">
        {saving ? <><Loader2 size={17} className="animate-spin" /> Wird gespeichert…</>
                : <><Save size={17} /> Einstellungen speichern</>}
      </button>
    </div>
  )
}
