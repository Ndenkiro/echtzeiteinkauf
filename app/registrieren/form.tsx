'use client'
// app/registrieren/form.tsx — password registration, shopper gives address
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createBrowserClient } from '@supabase/ssr'
import {
  Mail, Lock, User, ArrowRight, ShoppingBag, Bike, MapPin,
  CheckCircle2, AlertCircle, Eye, EyeOff, Loader2
} from 'lucide-react'
import { toast } from 'sonner'

const SUPABASE_URL = 'https://wpxpgszzzfhhsaunolyq.supabase.co'
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndweHBnc3p6emZoaHNhdW5vbHlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0Mzg5ODQsImV4cCI6MjA5NzAxNDk4NH0.8_DVpLNwItAlkn_gL9a4dn-lZ00I8iifX2Cb9N_W-4U'
const GOOGLE_MAPS_API_KEY = 'AIzaSyDExSOafkqdChm7ZkqVYAVD2W271a-mU2I'

type Role = 'customer' | 'shopper'

function pwStrength(pw: string) {
  let s = 0
  if (pw.length >= 8) s++
  if (pw.length >= 12) s++
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++
  if (/\d/.test(pw)) s++
  if (/[^A-Za-z0-9]/.test(pw)) s++
  return Math.min(s, 4)
}
const STRENGTH = [
  { label: 'Sehr schwach', color: 'bg-red',        w: '20%' },
  { label: 'Schwach',      color: 'bg-orange',     w: '40%' },
  { label: 'Mittel',       color: 'bg-yellow-500', w: '60%' },
  { label: 'Gut',          color: 'bg-green-500',  w: '80%' },
  { label: 'Stark',        color: 'bg-green-600',  w: '100%' },
]

export function RegistrierenForm() {
  const [role, setRole] = useState<Role | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)

  // Shopper address
  const [address, setAddress] = useState('')
  const [zip, setZip] = useState('')
  const [city, setCity] = useState('')
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [geocoding, setGeocoding] = useState(false)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const router = useRouter()

  const supabase = createBrowserClient(SUPABASE_URL, SUPABASE_ANON)
  const strength = pwStrength(password)

  const geocode = async (): Promise<{ lat: number; lng: number } | null> => {
    const full = [address, zip, city].filter(Boolean).join(', ')
    if (!full.trim()) return null
    setGeocoding(true)
    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(full + ', Deutschland')}&region=DE&key=${GOOGLE_MAPS_API_KEY}`
      )
      const data = await res.json()
      setGeocoding(false)
      if (data.status !== 'OK' || !data.results?.[0]) {
        toast.error('Adresse nicht gefunden')
        return null
      }
      const l = data.results[0].geometry.location
      const c = { lat: l.lat, lng: l.lng }
      setCoords(c)
      toast.success('Adresse bestätigt')
      return c
    } catch {
      setGeocoding(false)
      return null
    }
  }

  const register = async () => {
    setError('')
    if (!name.trim())  { setError('Bitte geben Sie Ihren Namen ein'); return }
    if (!email.trim()) { setError('Bitte geben Sie Ihre E-Mail-Adresse ein'); return }
    if (password.length < 8) { setError('Das Passwort muss mindestens 8 Zeichen lang sein'); return }
    if (password !== confirm) { setError('Die Passwörter stimmen nicht überein'); return }

    let c = coords
    if (role === 'shopper') {
      if (!address.trim() || !city.trim()) {
        setError('Bitte geben Sie Ihre Adresse an — sie bestimmt Ihr Einsatzgebiet')
        return
      }
      if (!c) {
        c = await geocode()
        if (!c) { setError('Adresse konnte nicht gefunden werden'); return }
      }
    }

    setLoading(true)
    const { data, error: authError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { full_name: name.trim(), role },
        emailRedirectTo: 'https://echtzeiteinkauf.com/auth/callback',
      },
    })

    if (authError) {
      setLoading(false)
      setError(authError.message.includes('already registered')
        ? 'Diese E-Mail ist bereits registriert. Bitte melden Sie sich an.'
        : authError.message)
      return
    }

    // Store the shopper address on the application
    if (role === 'shopper' && c && data.user) {
      const { data: profile } = await supabase
        .from('users').select('id').eq('auth_id', data.user.id).maybeSingle()
      if (profile) {
        await supabase.from('shopper_applications').upsert({
          user_id: profile.id,
          address: address.trim(),
          zip_code: zip.trim() || null,
          city: city.trim(),
          lat: c.lat,
          lng: c.lng,
        }, { onConflict: 'user_id' })
      }
    }

    setLoading(false)

    if (data.session) {
      toast.success('Konto erstellt! Willkommen 🎉')
      router.push(role === 'shopper' ? '/shopper-portal/dokumente' : '/konto')
      router.refresh()
      return
    }
    setDone(true)
  }

  if (done) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
      <div className="bg-white rounded-3xl p-10 max-w-md w-full text-center shadow-sm border border-gray-100">
        <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-5">
          <CheckCircle2 size={30} className="text-green-600" />
        </div>
        <h1 className="text-2xl font-black text-gray-900 mb-2">Fast geschafft!</h1>
        <p className="text-gray-500 text-sm leading-relaxed mb-6">
          Wir haben Ihnen eine Bestätigungs-E-Mail an{' '}
          <strong className="text-gray-900">{email}</strong> gesendet.
        </p>
        <Link href="/anmelden" className="btn-red inline-flex px-6 py-3 text-sm">
          Zur Anmeldung <ArrowRight size={15} />
        </Link>
      </div>
    </div>
  )

  if (!role) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6 py-12">
      <div className="max-w-md w-full">
        <Link href="/" className="flex items-center justify-center gap-2 mb-8">
          <Image src="/logo.png" alt="Echtzeiteinkauf" width={40} height={40} className="rounded-full" />
          <span className="font-black text-xl text-gray-900">Echtzeiteinkauf</span>
        </Link>
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
          <h1 className="text-2xl font-black text-gray-900 mb-1 text-center">Konto erstellen</h1>
          <p className="text-sm text-gray-500 text-center mb-7">Wählen Sie, wie Sie Echtzeiteinkauf nutzen möchten</p>
          <div className="flex flex-col gap-3">
            <button onClick={() => setRole('customer')}
              className="flex items-center gap-4 p-5 border-2 border-gray-100 rounded-2xl hover:border-red hover:bg-red/[0.03] transition-all text-left group">
              <div className="w-12 h-12 rounded-xl bg-red/10 flex items-center justify-center flex-shrink-0 group-hover:bg-red transition-colors">
                <ShoppingBag size={22} className="text-red group-hover:text-white transition-colors" />
              </div>
              <div className="flex-1">
                <div className="font-black text-gray-900">Ich möchte einkaufen</div>
                <div className="text-xs text-gray-400">Bestellen Sie bei Ihren Lieblingsmärkten</div>
              </div>
              <ArrowRight size={18} className="text-gray-300 group-hover:text-red transition-all" />
            </button>
            <button onClick={() => setRole('shopper')}
              className="flex items-center gap-4 p-5 border-2 border-gray-100 rounded-2xl hover:border-orange hover:bg-orange/5 transition-all text-left group">
              <div className="w-12 h-12 rounded-xl bg-orange/15 flex items-center justify-center flex-shrink-0 group-hover:bg-orange transition-colors">
                <Bike size={22} className="text-orange-dark group-hover:text-black transition-colors" />
              </div>
              <div className="flex-1">
                <div className="font-black text-gray-900">Ich möchte Shopper werden</div>
                <div className="text-xs text-gray-400">Flexibel Geld verdienen beim Einkaufen</div>
              </div>
              <ArrowRight size={18} className="text-gray-300 group-hover:text-orange-dark transition-all" />
            </button>
          </div>
        </div>
        <p className="text-center text-sm text-gray-400 mt-6">
          Bereits registriert? <Link href="/anmelden" className="text-red font-bold hover:underline">Anmelden</Link>
        </p>
      </div>
    </div>
  )

  const isShopper = role === 'shopper'

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6 py-12">
      <div className="max-w-md w-full">
        <Link href="/" className="flex items-center justify-center gap-2 mb-8">
          <Image src="/logo.png" alt="Echtzeiteinkauf" width={40} height={40} className="rounded-full" />
          <span className="font-black text-xl text-gray-900">Echtzeiteinkauf</span>
        </Link>

        <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
          <button onClick={() => { setRole(null); setError('') }}
            className="text-xs text-gray-400 font-bold mb-4 hover:text-gray-600">← Zurück</button>

          <div className="flex items-center gap-2 mb-1">
            {isShopper ? <Bike size={18} className="text-orange-dark" /> : <ShoppingBag size={18} className="text-red" />}
            <h1 className="text-xl font-black text-gray-900">
              Als {isShopper ? 'Shopper' : 'Käufer'} registrieren
            </h1>
          </div>
          <p className="text-sm text-gray-500 mb-6">
            {isShopper
              ? 'Ihre Adresse bestimmt, welche Aufträge Sie erhalten.'
              : 'Erstellen Sie Ihr Konto in wenigen Sekunden.'}
          </p>

          {error && (
            <div className="flex items-start gap-2 bg-red/5 border border-red/20 rounded-xl px-3.5 py-3 mb-4">
              <AlertCircle size={15} className="text-red flex-shrink-0 mt-0.5" />
              <span className="text-xs text-red font-medium">{error}</span>
            </div>
          )}

          <div className="flex flex-col gap-3 mb-5">
            <div className={`flex items-center gap-2 border-2 border-gray-100 rounded-xl px-4 py-3 focus-within:border-${isShopper ? 'orange' : 'red'} transition-colors`}>
              <User size={16} className="text-gray-400 flex-shrink-0" />
              <input value={name} onChange={e => setName(e.target.value)}
                placeholder="Ihr vollständiger Name" autoComplete="name"
                className="flex-1 outline-none text-sm bg-transparent" />
            </div>

            <div className={`flex items-center gap-2 border-2 border-gray-100 rounded-xl px-4 py-3 focus-within:border-${isShopper ? 'orange' : 'red'} transition-colors`}>
              <Mail size={16} className="text-gray-400 flex-shrink-0" />
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="ihre@email.de" autoComplete="email"
                className="flex-1 outline-none text-sm bg-transparent" />
            </div>

            <div>
              <div className={`flex items-center gap-2 border-2 border-gray-100 rounded-xl px-4 py-3 focus-within:border-${isShopper ? 'orange' : 'red'} transition-colors`}>
                <Lock size={16} className="text-gray-400 flex-shrink-0" />
                <input type={showPw ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Passwort (min. 8 Zeichen)" autoComplete="new-password"
                  className="flex-1 outline-none text-sm bg-transparent" />
                <button type="button" onClick={() => setShowPw(v => !v)} className="text-gray-300 hover:text-gray-500">
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {password.length > 0 && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${STRENGTH[strength].color}`}
                      style={{ width: STRENGTH[strength].w }} />
                  </div>
                  <span className="text-[10px] font-bold text-gray-400">{STRENGTH[strength].label}</span>
                </div>
              )}
            </div>

            <div className={`flex items-center gap-2 border-2 rounded-xl px-4 py-3 transition-colors ${
              confirm && password !== confirm ? 'border-red/40' : `border-gray-100 focus-within:border-${isShopper ? 'orange' : 'red'}`
            }`}>
              <Lock size={16} className="text-gray-400 flex-shrink-0" />
              <input type={showPw ? 'text' : 'password'} value={confirm}
                onChange={e => setConfirm(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && register()}
                placeholder="Passwort bestätigen" autoComplete="new-password"
                className="flex-1 outline-none text-sm bg-transparent" />
              {confirm && password === confirm && <CheckCircle2 size={15} className="text-green-500" />}
            </div>
          </div>

          {/* Shopper address */}
          {isShopper && (
            <div className="border-t border-gray-100 pt-5 mb-5">
              <div className="flex items-center gap-2 mb-1">
                <MapPin size={15} className="text-orange-dark" />
                <span className="font-black text-sm text-gray-900">Ihre Adresse</span>
              </div>
              <p className="text-xs text-gray-400 mb-3">
                Wird Kunden nicht angezeigt — dient nur zur Auftragsvermittlung.
              </p>

              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2 border-2 border-gray-100 rounded-xl px-4 py-3 focus-within:border-orange transition-colors">
                  <MapPin size={16} className="text-gray-400 flex-shrink-0" />
                  <input value={address}
                    onChange={e => { setAddress(e.target.value); setCoords(null) }}
                    placeholder="Straße und Hausnummer"
                    className="flex-1 outline-none text-sm bg-transparent" />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <input value={zip} onChange={e => { setZip(e.target.value); setCoords(null) }}
                    placeholder="PLZ"
                    className="border-2 border-gray-100 rounded-xl px-4 py-3 text-sm outline-none focus:border-orange transition-colors" />
                  <input value={city} onChange={e => { setCity(e.target.value); setCoords(null) }}
                    placeholder="Stadt"
                    className="col-span-2 border-2 border-gray-100 rounded-xl px-4 py-3 text-sm outline-none focus:border-orange transition-colors" />
                </div>
                {!coords && address.trim() && city.trim() && (
                  <button onClick={geocode} disabled={geocoding}
                    className="text-xs font-bold text-orange-dark border border-orange/30 rounded-xl px-4 py-2.5 hover:bg-orange/5 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5">
                    {geocoding ? <><Loader2 size={12} className="animate-spin" /> Wird geprüft…</> : 'Adresse prüfen'}
                  </button>
                )}
                {coords && (
                  <p className="text-xs text-green-600 font-bold flex items-center gap-1">
                    <CheckCircle2 size={13} /> Adresse bestätigt
                  </p>
                )}
              </div>
            </div>
          )}

          {isShopper && (
            <div className="bg-orange/10 rounded-xl p-3.5 mb-5 flex gap-2.5">
              <AlertCircle size={15} className="text-orange-dark flex-shrink-0 mt-0.5" />
              <p className="text-xs text-orange-dark leading-relaxed">
                Führungszeugnis, Personalausweis und Fahrzeugart werden im nächsten Schritt abgefragt.
              </p>
            </div>
          )}

          <button onClick={register} disabled={loading}
            className={isShopper
              ? 'w-full bg-orange text-black font-black rounded-xl py-3.5 flex items-center justify-center gap-2 hover:bg-orange-dark hover:text-white transition-colors disabled:opacity-50'
              : 'btn-red w-full py-3.5'}>
            {loading ? 'Wird erstellt…' : <>Konto erstellen <ArrowRight size={16} /></>}
          </button>

          <p className="text-[11px] text-gray-400 text-center mt-4 leading-relaxed">
            Mit der Registrierung akzeptieren Sie unsere{' '}
            <Link href="/agb" className="underline hover:text-gray-600">AGB</Link> und{' '}
            <Link href="/datenschutz" className="underline hover:text-gray-600">Datenschutzerklärung</Link>.
          </p>
        </div>

        <p className="text-center text-sm text-gray-400 mt-6">
          Bereits registriert? <Link href="/anmelden" className="text-red font-bold hover:underline">Anmelden</Link>
        </p>
      </div>
    </div>
  )
}
