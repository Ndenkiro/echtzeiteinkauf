'use client'
// app/registrieren/form.tsx — password-based registration
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createBrowserClient } from '@supabase/ssr'
import {
  Mail, Lock, User, ArrowRight, ShoppingBag, Bike,
  CheckCircle2, AlertCircle, Eye, EyeOff
} from 'lucide-react'
import { toast } from 'sonner'

const SUPABASE_URL = 'https://wpxpgszzzfhhsaunolyq.supabase.co'
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndweHBnc3p6emZoaHNhdW5vbHlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0Mzg5ODQsImV4cCI6MjA5NzAxNDk4NH0.8_DVpLNwItAlkn_gL9a4dn-lZ00I8iifX2Cb9N_W-4U'

type Role = 'customer' | 'shopper'

// Simple strength meter
function passwordStrength(pw: string) {
  let score = 0
  if (pw.length >= 8) score++
  if (pw.length >= 12) score++
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++
  if (/\d/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  return Math.min(score, 4)
}

const STRENGTH_CFG = [
  { label: 'Sehr schwach', color: 'bg-red',        width: '20%' },
  { label: 'Schwach',      color: 'bg-orange',     width: '40%' },
  { label: 'Mittel',       color: 'bg-yellow-500', width: '60%' },
  { label: 'Gut',          color: 'bg-green-500',  width: '80%' },
  { label: 'Stark',        color: 'bg-green-600',  width: '100%' },
]

export function RegistrierenForm() {
  const [role, setRole] = useState<Role | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const router = useRouter()

  const supabase = createBrowserClient(SUPABASE_URL, SUPABASE_ANON)
  const strength = passwordStrength(password)

  const register = async () => {
    setError('')

    if (!name.trim()) { setError('Bitte geben Sie Ihren Namen ein'); return }
    if (!email.trim()) { setError('Bitte geben Sie Ihre E-Mail-Adresse ein'); return }
    if (password.length < 8) { setError('Das Passwort muss mindestens 8 Zeichen lang sein'); return }
    if (password !== confirm) { setError('Die Passwörter stimmen nicht überein'); return }

    setLoading(true)

    const { data, error: authError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { full_name: name.trim(), role },
        emailRedirectTo: 'https://echtzeiteinkauf.com/auth/callback',
      },
    })

    setLoading(false)

    if (authError) {
      if (authError.message.includes('already registered')) {
        setError('Diese E-Mail-Adresse ist bereits registriert. Bitte melden Sie sich an.')
      } else {
        setError(authError.message)
      }
      return
    }

    // Session created immediately (email confirmation off)
    if (data.session) {
      toast.success('Konto erstellt! Willkommen bei Echtzeiteinkauf 🎉')
      router.push(role === 'shopper' ? '/shopper-portal/dokumente' : '/konto')
      router.refresh()
      return
    }

    // Email confirmation required
    setDone(true)
  }

  // ── Success screen ──
  if (done) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
        <div className="bg-white rounded-3xl p-10 max-w-md w-full text-center shadow-sm border border-gray-100">
          <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 size={30} className="text-green-600" />
          </div>
          <h1 className="text-2xl font-black text-gray-900 mb-2">Fast geschafft!</h1>
          <p className="text-gray-500 text-sm leading-relaxed mb-6">
            Wir haben Ihnen eine Bestätigungs-E-Mail an{' '}
            <strong className="text-gray-900">{email}</strong> gesendet.
            Klicken Sie auf den Link, um Ihr Konto zu aktivieren.
          </p>
          <Link href="/anmelden" className="btn-red inline-flex px-6 py-3 text-sm">
            Zur Anmeldung <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    )
  }

  // ── Role selection ──
  if (!role) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6 py-12">
        <div className="max-w-md w-full">
          <Link href="/" className="flex items-center justify-center gap-2 mb-8">
            <Image src="/logo.png" alt="Echtzeiteinkauf" width={40} height={40} className="rounded-full" />
            <span className="font-black text-xl text-gray-900">Echtzeiteinkauf</span>
          </Link>

          <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
            <h1 className="text-2xl font-black text-gray-900 mb-1 text-center">Konto erstellen</h1>
            <p className="text-sm text-gray-500 text-center mb-7">
              Wählen Sie, wie Sie Echtzeiteinkauf nutzen möchten
            </p>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => setRole('customer')}
                className="flex items-center gap-4 p-5 border-2 border-gray-100 rounded-2xl hover:border-red hover:bg-red/[0.03] transition-all text-left group"
              >
                <div className="w-12 h-12 rounded-xl bg-red/10 flex items-center justify-center flex-shrink-0 group-hover:bg-red transition-colors">
                  <ShoppingBag size={22} className="text-red group-hover:text-white transition-colors" />
                </div>
                <div className="flex-1">
                  <div className="font-black text-gray-900">Ich möchte einkaufen</div>
                  <div className="text-xs text-gray-400">Bestellen Sie bei Ihren Lieblingsmärkten</div>
                </div>
                <ArrowRight size={18} className="text-gray-300 group-hover:text-red transition-all" />
              </button>

              <button
                onClick={() => setRole('shopper')}
                className="flex items-center gap-4 p-5 border-2 border-gray-100 rounded-2xl hover:border-orange hover:bg-orange/5 transition-all text-left group"
              >
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
            Bereits registriert?{' '}
            <Link href="/anmelden" className="text-red font-bold hover:underline">Anmelden</Link>
          </p>
        </div>
      </div>
    )
  }

  // ── Registration form ──
  const isShopper = role === 'shopper'
  const accent = isShopper ? 'orange' : 'red'

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6 py-12">
      <div className="max-w-md w-full">
        <Link href="/" className="flex items-center justify-center gap-2 mb-8">
          <Image src="/logo.png" alt="Echtzeiteinkauf" width={40} height={40} className="rounded-full" />
          <span className="font-black text-xl text-gray-900">Echtzeiteinkauf</span>
        </Link>

        <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
          <button
            onClick={() => { setRole(null); setError('') }}
            className="text-xs text-gray-400 font-bold mb-4 hover:text-gray-600"
          >
            ← Zurück
          </button>

          <div className="flex items-center gap-2 mb-1">
            {isShopper
              ? <Bike size={18} className="text-orange-dark" />
              : <ShoppingBag size={18} className="text-red" />}
            <h1 className="text-xl font-black text-gray-900">
              Als {isShopper ? 'Shopper' : 'Käufer'} registrieren
            </h1>
          </div>
          <p className="text-sm text-gray-500 mb-6">
            {isShopper
              ? 'Nach der Registrierung benötigen wir noch einige Dokumente.'
              : 'Erstellen Sie Ihr Konto in wenigen Sekunden.'}
          </p>

          {error && (
            <div className="flex items-start gap-2 bg-red/5 border border-red/20 rounded-xl px-3.5 py-3 mb-4">
              <AlertCircle size={15} className="text-red flex-shrink-0 mt-0.5" />
              <span className="text-xs text-red font-medium">{error}</span>
            </div>
          )}

          <div className="flex flex-col gap-3 mb-5">
            {/* Name */}
            <div className={`flex items-center gap-2 border-2 border-gray-100 rounded-xl px-4 py-3 focus-within:border-${accent} transition-colors`}>
              <User size={16} className="text-gray-400 flex-shrink-0" />
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Ihr vollständiger Name"
                autoComplete="name"
                className="flex-1 outline-none text-sm bg-transparent"
              />
            </div>

            {/* Email */}
            <div className={`flex items-center gap-2 border-2 border-gray-100 rounded-xl px-4 py-3 focus-within:border-${accent} transition-colors`}>
              <Mail size={16} className="text-gray-400 flex-shrink-0" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="ihre@email.de"
                autoComplete="email"
                className="flex-1 outline-none text-sm bg-transparent"
              />
            </div>

            {/* Password */}
            <div>
              <div className={`flex items-center gap-2 border-2 border-gray-100 rounded-xl px-4 py-3 focus-within:border-${accent} transition-colors`}>
                <Lock size={16} className="text-gray-400 flex-shrink-0" />
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Passwort (min. 8 Zeichen)"
                  autoComplete="new-password"
                  className="flex-1 outline-none text-sm bg-transparent"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="text-gray-300 hover:text-gray-500 transition-colors"
                >
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>

              {/* Strength meter */}
              {password.length > 0 && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${STRENGTH_CFG[strength].color}`}
                      style={{ width: STRENGTH_CFG[strength].width }}
                    />
                  </div>
                  <span className="text-[10px] font-bold text-gray-400">
                    {STRENGTH_CFG[strength].label}
                  </span>
                </div>
              )}
            </div>

            {/* Confirm */}
            <div className={`flex items-center gap-2 border-2 rounded-xl px-4 py-3 transition-colors ${
              confirm && password !== confirm
                ? 'border-red/40'
                : `border-gray-100 focus-within:border-${accent}`
            }`}>
              <Lock size={16} className="text-gray-400 flex-shrink-0" />
              <input
                type={showPw ? 'text' : 'password'}
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && register()}
                placeholder="Passwort bestätigen"
                autoComplete="new-password"
                className="flex-1 outline-none text-sm bg-transparent"
              />
              {confirm && password === confirm && (
                <CheckCircle2 size={15} className="text-green-500" />
              )}
            </div>
          </div>

          {isShopper && (
            <div className="bg-orange/10 rounded-xl p-3.5 mb-5 flex gap-2.5">
              <AlertCircle size={15} className="text-orange-dark flex-shrink-0 mt-0.5" />
              <p className="text-xs text-orange-dark leading-relaxed">
                Führungszeugnis, Personalausweis und Fahrzeugart werden im nächsten Schritt abgefragt.
              </p>
            </div>
          )}

          <button
            onClick={register}
            disabled={loading}
            className={
              isShopper
                ? 'w-full bg-orange text-black font-black rounded-xl py-3.5 flex items-center justify-center gap-2 hover:bg-orange-dark hover:text-white transition-colors disabled:opacity-50'
                : 'btn-red w-full py-3.5'
            }
          >
            {loading ? 'Wird erstellt...' : <>Konto erstellen <ArrowRight size={16} /></>}
          </button>

          <p className="text-[11px] text-gray-400 text-center mt-4 leading-relaxed">
            Mit der Registrierung akzeptieren Sie unsere{' '}
            <Link href="/agb" className="underline hover:text-gray-600">AGB</Link> und{' '}
            <Link href="/datenschutz" className="underline hover:text-gray-600">Datenschutzerklärung</Link>.
          </p>
        </div>

        <p className="text-center text-sm text-gray-400 mt-6">
          Bereits registriert?{' '}
          <Link href="/anmelden" className="text-red font-bold hover:underline">Anmelden</Link>
        </p>
      </div>
    </div>
  )
}
