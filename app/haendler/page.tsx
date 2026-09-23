'use client'
// app/admin/haendler/page.tsx — review merchant applications
import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import {
  Store, Check, X, Loader2, ExternalLink, MapPin, Mail,
  Phone, FileText, Globe, Clock, CheckCircle2, AlertCircle,
  Search, Building2
} from 'lucide-react'
import { toast } from 'sonner'
import { getCategory } from '@/lib/categories'

const SUPABASE_URL = 'https://wpxpgszzzfhhsaunolyq.supabase.co'
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndweHBnc3p6emZoaHNhdW5vbHlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0Mzg5ODQsImV4cCI6MjA5NzAxNDk4NH0.8_DVpLNwItAlkn_gL9a4dn-lZ00I8iifX2Cb9N_W-4U'

const TABS = [
  { id: 'under_review', label: 'In Prüfung',   icon: Clock },
  { id: 'approved',     label: 'Aktiv',        icon: CheckCircle2 },
  { id: 'rejected',     label: 'Abgelehnt',    icon: AlertCircle },
]

export default function AdminHaendlerPage() {
  const [tab, setTab] = useState('under_review')
  const [apps, setApps] = useState<any[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [selected, setSelected] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [search, setSearch] = useState('')
  const [rejectNote, setRejectNote] = useState('')
  const [showReject, setShowReject] = useState(false)

  const supabase = createBrowserClient(SUPABASE_URL, SUPABASE_ANON)

  const load = async () => {
    const { data } = await supabase.rpc('get_merchant_applications')
    const all = data || []
    setApps(all)
    setCounts({
      under_review: all.filter((a: any) => a.status === 'under_review').length,
      approved:     all.filter((a: any) => a.status === 'approved').length,
      rejected:     all.filter((a: any) => a.status === 'rejected').length,
    })
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const approve = async (id: string) => {
    setBusy(true)
    const { data, error } = await supabase.rpc('approve_merchant', { p_application_id: id })
    setBusy(false)
    if (error || !data?.ok) {
      toast.error(data?.reason === 'not_admin' ? 'Keine Berechtigung' : 'Freischaltung fehlgeschlagen')
      return
    }
    toast.success(`Freigeschaltet — Shop: /markt/${data.slug}`)
    setSelected(null)
    load()
  }

  const reject = async (id: string) => {
    if (!rejectNote.trim()) { toast.error('Bitte Grund angeben'); return }
    setBusy(true)
    const { data, error } = await supabase.rpc('reject_merchant', {
      p_application_id: id, p_note: rejectNote.trim(),
    })
    setBusy(false)
    if (error || !data?.ok) { toast.error('Ablehnung fehlgeschlagen'); return }
    toast.success('Antrag abgelehnt')
    setShowReject(false)
    setRejectNote('')
    setSelected(null)
    load()
  }

  const filtered = apps
    .filter(a => a.status === tab)
    .filter(a => {
      if (!search) return true
      const q = search.toLowerCase()
      return a.business_name?.toLowerCase().includes(q)
        || a.city?.toLowerCase().includes(q)
        || a.owner_name?.toLowerCase().includes(q)
    })

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-4 border-red border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-black text-gray-900">Händler-Anträge</h1>
        <p className="text-sm text-gray-500 mt-1">
          Betriebe prüfen und für die Plattform freischalten
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {TABS.map(t => {
          const Icon = t.icon
          const active = tab === t.id
          const n = counts[t.id] || 0
          return (
            <button key={t.id} onClick={() => { setTab(t.id); setSelected(null) }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-black whitespace-nowrap transition-all border-2 flex-shrink-0 ${
                active ? 'border-red bg-red text-white' : 'border-gray-100 text-gray-500 hover:border-gray-200 bg-white'
              }`}>
              <Icon size={15} /> {t.label}
              {n > 0 && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                  active ? 'bg-white/25' : 'bg-gray-100 text-gray-600'
                }`}>{n}</span>
              )}
            </button>
          )
        })}
      </div>

      <div className="flex items-center gap-2 bg-white border-2 border-gray-100 rounded-2xl px-4 py-3 mb-5 focus-within:border-red transition-colors">
        <Search size={16} className="text-gray-400 flex-shrink-0" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Betrieb, Stadt oder Ansprechpartner suchen…"
          className="flex-1 outline-none text-sm bg-transparent" />
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-14 text-center">
          <Store size={34} className="text-gray-200 mx-auto mb-3" />
          <p className="font-bold text-gray-900 mb-1">
            {tab === 'under_review' ? 'Keine offenen Anträge' : 'Nichts gefunden'}
          </p>
          <p className="text-sm text-gray-400">
            {tab === 'under_review'
              ? 'Neue Anträge erscheinen hier automatisch.'
              : 'Passen Sie die Suche an.'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map(a => {
            const cat = getCategory(a.category)
            return (
              <div key={a.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <button onClick={() => setSelected(selected?.id === a.id ? null : a)}
                  className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors text-left">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 text-lg"
                    style={{ background: `${cat.color}18` }}>
                    {cat.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-black text-gray-900 truncate">{a.business_name}</div>
                    <div className="text-xs text-gray-400 truncate">
                      {a.owner_name} · {a.postal_code} {a.city}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="text-[10px] font-black px-2 py-1 rounded-full text-white"
                      style={{ background: cat.color }}>
                      {cat.label}
                    </span>
                    {a.submitted_at && (
                      <div className="text-[10px] text-gray-400 mt-1">
                        {new Date(a.submitted_at).toLocaleDateString('de-DE')}
                      </div>
                    )}
                  </div>
                </button>

                {/* Detail */}
                {selected?.id === a.id && (
                  <div className="border-t border-gray-50 p-5 bg-gray-50/50">
                    <div className="grid sm:grid-cols-2 gap-4 mb-5">
                      <Detail icon={Building2} label="Betrieb"
                        value={`${a.business_name}${a.legal_form ? ` (${a.legal_form})` : ''}`} />
                      <Detail icon={MapPin} label="Adresse"
                        value={`${a.street}, ${a.postal_code} ${a.city}`} />
                      <Detail icon={Mail} label="E-Mail" value={a.email} />
                      {a.phone && <Detail icon={Phone} label="Telefon" value={a.phone} />}
                      {a.tax_id && <Detail icon={FileText} label="Steuernummer" value={a.tax_id} />}
                      {a.website && (
                        <Detail icon={Globe} label="Website" value={a.website} link={a.website} />
                      )}
                    </div>

                    {a.description && (
                      <div className="bg-white rounded-xl p-4 mb-5 border border-gray-100">
                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-wide mb-1.5">
                          Beschreibung
                        </div>
                        <p className="text-sm text-gray-700 leading-relaxed">{a.description}</p>
                      </div>
                    )}

                    {/* Verification hints */}
                    {a.status === 'under_review' && (
                      <div className="bg-blue-50 rounded-xl p-4 mb-5 flex gap-3">
                        <AlertCircle size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
                        <div className="text-xs text-blue-900 leading-relaxed">
                          <strong>Vor der Freischaltung prüfen:</strong> Existiert der Betrieb
                          unter dieser Adresse? Stimmt die Steuernummer im Format
                          (DE + 9 Ziffern)? Ist die Branche plausibel?
                          {a.website && ' Website aufrufen.'}
                        </div>
                      </div>
                    )}

                    {a.status === 'approved' && a.store_id && (
                      <a href={`/markt/${a.store_id}`} target="_blank" rel="noopener"
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-red hover:underline mb-4">
                        <ExternalLink size={12} /> Shop ansehen
                      </a>
                    )}

                    {/* Actions */}
                    {a.status === 'under_review' && (
                      showReject ? (
                        <div className="bg-white rounded-xl p-4 border-2 border-red/20">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-wide mb-2 block">
                            Grund der Ablehnung
                          </label>
                          <textarea value={rejectNote} onChange={e => setRejectNote(e.target.value)}
                            rows={3} placeholder="Wird dem Händler angezeigt…"
                            className="w-full border-2 border-gray-100 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-red transition-colors resize-none mb-3"
                            autoFocus />
                          <div className="flex gap-2">
                            <button onClick={() => { setShowReject(false); setRejectNote('') }}
                              className="flex-1 border-2 border-gray-200 text-gray-600 font-bold rounded-xl py-2.5 text-sm hover:border-gray-300 transition-all">
                              Abbrechen
                            </button>
                            <button onClick={() => reject(a.id)} disabled={busy}
                              className="flex-1 bg-red text-white font-black rounded-xl py-2.5 text-sm hover:bg-red-dark transition-colors disabled:opacity-50">
                              {busy ? <Loader2 size={15} className="animate-spin mx-auto" /> : 'Ablehnen bestätigen'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <button onClick={() => setShowReject(true)}
                            className="flex items-center justify-center gap-2 border-2 border-gray-200 text-gray-600 font-bold rounded-xl px-5 py-3 text-sm hover:border-red hover:text-red transition-all">
                            <X size={15} /> Ablehnen
                          </button>
                          <button onClick={() => approve(a.id)} disabled={busy}
                            className="flex-1 bg-green-600 text-white font-black rounded-xl py-3 text-sm flex items-center justify-center gap-2 hover:bg-green-700 transition-colors disabled:opacity-50">
                            {busy
                              ? <><Loader2 size={15} className="animate-spin" /> Wird freigeschaltet…</>
                              : <><Check size={15} /> Freischalten &amp; Shop anlegen</>}
                          </button>
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function Detail({ icon: Icon, label, value, link }: {
  icon: any; label: string; value: string; link?: string
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon size={14} className="text-gray-400 flex-shrink-0 mt-0.5" />
      <div className="min-w-0">
        <div className="text-[10px] font-black text-gray-400 uppercase tracking-wide">{label}</div>
        {link ? (
          <a href={link.startsWith('http') ? link : `https://${link}`}
            target="_blank" rel="noopener"
            className="text-sm text-red font-medium hover:underline break-words">
            {value}
          </a>
        ) : (
          <div className="text-sm text-gray-900 font-medium break-words">{value}</div>
        )}
      </div>
    </div>
  )
}
