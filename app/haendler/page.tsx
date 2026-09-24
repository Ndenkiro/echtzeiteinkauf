'use client'
// app/haendler/page.tsx — merchant landing + application form
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createBrowserClient } from '@supabase/ssr'
import {
  Store, TrendingUp, Users, Smartphone, ArrowRight, CheckCircle2,
  Loader2, MapPin, AlertCircle, Euro, Clock, LogIn
} from 'lucide-react'
import { toast } from 'sonner'
import { CATEGORIES } from '@/lib/categories'

const SUPABASE_URL = 'https://wpxpgszzzfhhsaunolyq.supabase.co'
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndweHBnc3p6emZoaHNhdW5vbHlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0Mzg5ODQsImV4cCI6MjA5NzAxNDk4NH0.8_DVpLNwItAlkn_gL9a4dn-lZ00I8iifX2Cb9N_W-4U'
const MAPS_KEY = 'AIzaSyDExSOafkqdChm7ZkqVYAVD2W271a-mU2I'

const BENEFITS = [
  { icon: Users,      title: 'Neue Kunden ohne Website',
    text: 'Ihr Sortiment erscheint dort, wo Menschen ihre Einkäufe planen — auch ohne eigenen Onlineshop.' },
  { icon: Smartphone, title: 'Sie behalten die Kontrolle',
    text: 'Produkte, Fotos, Preise und Verfügbarkeit pflegen Sie selbst. Änderungen sind sofort sichtbar.' },
  { icon: Euro,       title: 'Keine Grundgebühr',
    text: 'Sie zahlen nur bei tatsächlichen Bestellungen. Kein Abo, keine Einrichtungsgebühr.' },
  { icon: Clock,      title: 'Lieferung übernehmen wir',
    text: 'Unsere Shopper holen die Ware bei Ihnen ab und bringen sie zum Kunden.' },
]

export default function HaendlerPage() {
  const [step, setStep] = useState<'intro' | 'form' | 'done'>('intro')
  const [user, setUser] = useState<any>(null)
  const [existing, setExisting] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [geocoding, setGeocoding] = useState(false)
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)

  const [form, setForm] = useState({
    business_name: '', legal_form: '', owner_name: '', email: '', phone: '',
    street: '', postal_code: '', city: '', category: 'food',
    tax_id: '', trade_register: '', website: '', description: '',
  })

  const router = useRouter()
  const supabase = createBrowserClient(SUPABASE_URL, SUPABASE_ANON)

  useEffect(() => {
    (async () => {
      const { data: { user: u } } = await supabase.auth.getUser()
      setUser(u)
      if (u) {
        const { data: profile } = await supabase
          .from('users').select('id, full_name, email').eq('auth_id', u.id).maybeSingle()
        if (profile) {
          setForm(f => ({
            ...f,
            owner_name: profile.full_name || '',
            email: profile.email || u.email || '',
          }))
        }
        const { data: ctx } = await supabase.rpc('get_my_merchant_context')
        if (ctx?.[0]) setExisting(ctx[0])
      }
      setLoading(false)
    })()
  }, [])

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const geocode = async () => {
    const full = [form.street, form.postal_code, form.city].filter(Boolean).join(', ')
    if (!full.trim()) { toast.error('Bitte Adresse vollständig eingeben'); return null }
    setGeocoding(true)
    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(full + ', Deutschland')}&region=DE&key=${MAPS_KEY}`
      )
      const data = await res.json()
      setGeocoding(false)
      if (data.status !== 'OK' || !data.results?.[0]) {
        toast.error('Adresse nicht gefunden'); return null
      }
      const l = data.results[0].geometry.location
      const c = { lat: l.lat, lng: l.lng }
      setCoords(c)
      toast.success('Adresse bestätigt')
      return c
    } catch { setGeocoding(false); return null }
  }

  const submit = async () => {
    if (!form.business_name.trim()) { toast.error('Bitte Firmenname angeben'); return }
    if (!form.owner_name.trim())    { toast.error('Bitte Ansprechpartner angeben'); return }
    if (!form.street.trim() || !form.city.trim() || !form.postal_code.trim()) {
      toast.error('Bitte vollständige Adresse angeben'); return
    }

    let c = coords
    if (!c) { c = await geocode(); if (!c) return }

    setSaving(true)
    const { data, error } = await supabase.rpc('submit_merchant_application', {
      p_data: { ...form, lat: String(c.lat), lng: String(c.lng) },
    })
    setSaving(false)

    if (error || !data?.ok) {
      toast.error('Antrag konnte nicht gesendet werden'); return
    }
    setStep('done')
  }

  if (loading) return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-orange border-t-transparent rounded-full animate-spin" />
    </div>
  )

  // Already applied
  if (existing && step === 'intro') {
    const label =
      existing.status === 'approved'      ? 'Freigeschaltet'
      : existing.status === 'under_review'? 'In Prüfung'
      : existing.status === 'rejected'    ? 'Abgelehnt'
      : 'Entwurf'

    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center px-6">
        <div className="max-w-md w-full bg-white/[0.04] border border-white/10 rounded-3xl p-8 text-center">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5 ${
            existing.status === 'approved' ? 'bg-green-500/15' : 'bg-orange/15'
          }`}>
            {existing.status === 'approved'
              ? <CheckCircle2 size={28} className="text-green-400" />
              : <Clock size={28} className="text-orange" />}
          </div>
          <h1 className="text-xl font-black text-white mb-1">{existing.business_name}</h1>
          <p className="text-sm text-white/50 mb-6">Status: {label}</p>

          {existing.status === 'rejected' && existing.rejection_note && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 mb-5 text-left">
              <p className="text-xs text-red-400">{existing.rejection_note}</p>
            </div>
          )}

          {existing.status === 'approved' ? (
            <Link href="/haendler-portal"
              className="inline-flex items-center gap-2 bg-orange text-black font-black rounded-xl px-6 py-3 text-sm hover:bg-orange-dark hover:text-white transition-colors">
              Zum Händler-Portal <ArrowRight size={15} />
            </Link>
          ) : (
            <button onClick={() => setStep('form')}
              className="text-sm font-bold text-orange hover:underline">
              Angaben bearbeiten
            </button>
          )}
        </div>
      </div>
    )
  }

  // Confirmation
  if (step === 'done') return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center px-6">
      <div className="max-w-md w-full bg-white/[0.04] border border-white/10 rounded-3xl p-10 text-center">
        <div className="w-16 h-16 rounded-full bg-green-500/15 flex items-center justify-center mx-auto mb-5">
          <CheckCircle2 size={28} className="text-green-400" />
        </div>
        <h1 className="text-2xl font-black text-white mb-2">Antrag eingereicht</h1>
        <p className="text-sm text-white/50 leading-relaxed mb-7">
          Wir prüfen Ihre Angaben innerhalb von 2–3 Werktagen und melden uns
          per E-Mail an <strong className="text-white">{form.email}</strong>.
        </p>
        <Link href="/" className="text-sm font-bold text-orange hover:underline">
          Zur Startseite
        </Link>
      </div>
    </div>
  )

  // Application form
  if (step === 'form') {
    if (!user) {
      return (
        <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center px-6">
          <div className="max-w-md w-full bg-white/[0.04] border border-white/10 rounded-3xl p-8 text-center">
            <Store size={32} className="text-orange mx-auto mb-4" />
            <h1 className="text-xl font-black text-white mb-2">Zuerst anmelden</h1>
            <p className="text-sm text-white/50 mb-6">
              Erstellen Sie ein Konto oder melden Sie sich an, um Ihren Betrieb zu registrieren.
            </p>
            <div className="flex gap-3">
              <Link href="/registrieren"
                className="flex-1 bg-orange text-black font-black rounded-xl py-3 text-sm hover:bg-orange-dark hover:text-white transition-colors">
                Konto erstellen
              </Link>
              <Link href="/anmelden?next=/haendler"
                className="flex-1 border border-white/15 text-white font-black rounded-xl py-3 text-sm hover:border-orange hover:text-orange transition-all">
                Anmelden
              </Link>
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className="min-h-screen bg-[#0A0A0A] py-12 px-6">
        <div className="max-w-xl mx-auto">
          <button onClick={() => setStep('intro')}
            className="text-xs text-white/40 font-bold mb-5 hover:text-white">
            ← Zurück
          </button>

          <h1 className="text-2xl font-black text-white mb-1">Betrieb registrieren</h1>
          <p className="text-sm text-white/50 mb-8">
            Alle Angaben werden vor der Freischaltung geprüft.
          </p>

          <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-6 mb-4">
            <h2 className="font-black text-sm text-white mb-4">Ihr Betrieb</h2>
            <div className="flex flex-col gap-3">
              <Field label="Firmenname *" value={form.business_name}
                onChange={v => set('business_name', v)} placeholder="Obsthof Meier" />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Rechtsform" value={form.legal_form}
                  onChange={v => set('legal_form', v)} placeholder="GmbH, e.K. …" />
                <div>
                  <label className="text-[10px] font-black text-white/40 uppercase tracking-wide mb-1.5 block">
                    Branche *
                  </label>
                  <select value={form.category} onChange={e => set('category', e.target.value)}
                    className="w-full bg-white/[0.06] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-orange transition-colors">
                    {CATEGORIES.map(c => (
                      <option key={c.id} value={c.id} className="bg-[#1a1a1a]">
                        {c.icon} {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <Field label="Ansprechpartner *" value={form.owner_name}
                onChange={v => set('owner_name', v)} placeholder="Max Meier" />
              <div className="grid grid-cols-2 gap-3">
                <Field label="E-Mail *" value={form.email}
                  onChange={v => set('email', v)} type="email" />
                <Field label="Telefon" value={form.phone}
                  onChange={v => set('phone', v)} placeholder="+49 …" />
              </div>
            </div>
          </div>

          <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-6 mb-4">
            <h2 className="font-black text-sm text-white mb-4">Standort</h2>
            <div className="flex flex-col gap-3">
              <Field label="Straße und Hausnummer *" value={form.street}
                onChange={v => { set('street', v); setCoords(null) }} />
              <div className="grid grid-cols-3 gap-3">
                <Field label="PLZ *" value={form.postal_code}
                  onChange={v => { set('postal_code', v); setCoords(null) }} />
                <div className="col-span-2">
                  <Field label="Stadt *" value={form.city}
                    onChange={v => { set('city', v); setCoords(null) }} />
                </div>
              </div>
              {!coords ? (
                <button onClick={geocode} disabled={geocoding}
                  className="text-xs font-bold text-orange border border-orange/30 rounded-xl px-4 py-2.5 hover:bg-orange/10 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5">
                  {geocoding ? <Loader2 size={12} className="animate-spin" /> : <MapPin size={12} />}
                  Adresse prüfen
                </button>
              ) : (
                <p className="text-xs text-green-400 font-bold flex items-center gap-1">
                  <CheckCircle2 size={13} /> Adresse bestätigt
                </p>
              )}
            </div>
          </div>

          <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-6 mb-4">
            <h2 className="font-black text-sm text-white mb-4">Rechtliches</h2>
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="USt-IdNr / Steuernummer" value={form.tax_id}
                  onChange={v => set('tax_id', v)} placeholder="DE123456789" />
                <Field label="Handelsregister" value={form.trade_register}
                  onChange={v => set('trade_register', v)} placeholder="HRB 12345" />
              </div>
              <Field label="Website" value={form.website}
                onChange={v => set('website', v)} placeholder="https://…" />
              <div>
                <label className="text-[10px] font-black text-white/40 uppercase tracking-wide mb-1.5 block">
                  Kurzbeschreibung
                </label>
                <textarea value={form.description} onChange={e => set('description', e.target.value)}
                  rows={3} placeholder="Was verkaufen Sie? Was macht Ihren Betrieb aus?"
                  className="w-full bg-white/[0.06] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/25 outline-none focus:border-orange transition-colors resize-none" />
              </div>
            </div>
          </div>

          <div className="bg-orange/10 border border-orange/25 rounded-2xl p-4 mb-5 flex gap-3">
            <AlertCircle size={16} className="text-orange flex-shrink-0 mt-0.5" />
            <p className="text-xs text-white/70 leading-relaxed">
              Nach der Freischaltung legen Sie Ihre Produkte im Händler-Portal an —
              mit eigenen Fotos, Preisen und Verfügbarkeiten.
            </p>
          </div>

          <button onClick={submit} disabled={saving}
            className="w-full bg-orange text-black font-black rounded-2xl py-4 text-base flex items-center justify-center gap-2 hover:bg-orange-dark hover:text-white transition-colors disabled:opacity-50">
            {saving ? <><Loader2 size={17} className="animate-spin" /> Wird gesendet…</>
                    : <>Antrag einreichen <ArrowRight size={17} /></>}
          </button>
        </div>
      </div>
    )
  }

  // Intro
  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <header className="sticky top-0 z-50 bg-[#0A0A0A]/95 backdrop-blur border-b border-white/10">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.png" alt="" width={32} height={32} className="rounded-full" />
            <div className="hidden sm:block">
              <div className="font-black text-white text-sm leading-tight">Echtzeiteinkauf</div>
              <div className="text-[10px] text-orange font-bold">Für Händler</div>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/anmelden?next=/haendler-portal"
              className="flex items-center gap-1.5 text-sm font-bold text-white/70 border border-white/20 rounded-xl px-4 py-2.5 hover:border-orange hover:text-orange transition-all">
              <LogIn size={15} /> Anmelden
            </Link>
            <button onClick={() => setStep('form')}
              className="bg-orange text-black font-black rounded-xl px-4 py-2.5 text-sm hover:bg-orange-dark hover:text-white transition-colors">
              Registrieren
            </button>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="absolute -top-32 -right-32 w-[480px] h-[480px] rounded-full bg-orange/20 blur-3xl" />
        <div className="max-w-5xl mx-auto px-6 py-20 relative">
          <div className="inline-flex items-center gap-2 bg-orange/15 text-orange text-xs font-black px-3.5 py-2 rounded-full mb-6 uppercase tracking-wide">
            <Store size={13} /> Für Händler
          </div>
          <h1 className="text-[2.4rem] md:text-[3.2rem] font-black text-white leading-[1.05] mb-5 max-w-2xl">
            Ihr Geschäft online —<br />
            <span className="relative inline-block px-1">
              <span className="absolute inset-0 bg-orange -z-10 rounded-md" />
              <span className="relative text-black">ohne eigene Website</span>
            </span>
          </h1>
          <p className="text-white/60 text-base leading-relaxed mb-8 max-w-lg">
            Stellen Sie Ihr Sortiment auf Echtzeiteinkauf ein. Kunden aus Ihrer Umgebung
            bestellen, unsere Shopper holen ab und liefern aus.
          </p>
          <button onClick={() => setStep('form')}
            className="bg-orange text-black font-black rounded-2xl px-7 py-4 text-base inline-flex items-center gap-2 hover:bg-orange-dark hover:text-white transition-colors">
            Kostenlos registrieren <ArrowRight size={18} />
          </button>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 py-16 border-t border-white/10">
        <div className="grid sm:grid-cols-2 gap-5">
          {BENEFITS.map(b => {
            const Icon = b.icon
            return (
              <div key={b.title}
                className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 hover:border-orange/40 transition-colors">
                <div className="w-11 h-11 rounded-xl bg-orange/15 flex items-center justify-center mb-4">
                  <Icon size={20} className="text-orange" />
                </div>
                <h3 className="font-black text-white mb-2">{b.title}</h3>
                <p className="text-sm text-white/50 leading-relaxed">{b.text}</p>
              </div>
            )
          })}
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 py-16 border-t border-white/10">
        <h2 className="text-2xl font-black text-white mb-8">So funktioniert es</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            ['1', 'Registrieren',   'Betrieb anmelden — Firmenname, Adresse, Branche.'],
            ['2', 'Prüfung',        'Wir prüfen Ihre Angaben in 2–3 Werktagen.'],
            ['3', 'Produkte anlegen','Sortiment mit Fotos und Preisen einpflegen.'],
            ['4', 'Bestellungen',   'Kunden bestellen, Shopper holen bei Ihnen ab.'],
          ].map(([n, t, d]) => (
            <div key={n}>
              <div className="w-10 h-10 rounded-xl bg-orange flex items-center justify-center font-black text-black mb-4">
                {n}
              </div>
              <h3 className="font-black text-white text-sm mb-1.5">{t}</h3>
              <p className="text-xs text-white/50 leading-relaxed">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-white/10 py-8">
        <div className="max-w-5xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-xs text-white/40">© 2026 Echtzeiteinkauf GmbH · Fürth</span>
          <div className="flex items-center gap-5 text-xs text-white/40">
            <Link href="/" className="hover:text-white transition-colors">Startseite</Link>
            <Link href="/agb" className="hover:text-white transition-colors">AGB</Link>
            <Link href="/impressum" className="hover:text-white transition-colors">Impressum</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

function Field({ label, value, onChange, placeholder, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void
  placeholder?: string; type?: string
}) {
  return (
    <div>
      <label className="text-[10px] font-black text-white/40 uppercase tracking-wide mb-1.5 block">
        {label}
      </label>
      <input
        type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-white/[0.06] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/25 outline-none focus:border-orange transition-colors"
      />
    </div>
  )
}
