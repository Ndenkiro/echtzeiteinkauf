'use client'
// app/haendler/registrieren/page.tsx — dedicated merchant sign-up
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createBrowserClient } from '@supabase/ssr'
import {
  Mail, Lock, User, Store, ArrowRight, CheckCircle2,
  AlertCircle, Eye, EyeOff, Building2
} from 'lucide-react'
import { toast } from 'sonner'

const SUPABASE_URL = 'https://wpxpgszzzfhhsaunolyq.supabase.co'
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndweHBnc3p6emZoaHNhdW5vbHlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0Mzg5ODQsImV4cCI6MjA5NzAxNDk4NH0.8_DVpLNwItAlkn_gL9a4dn-lZ00I8iifX2Cb9N_W-4U'

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
  { label: 'Sehr schwach', color: 'bg-red-500',    w: '20%' },
  { label: 'Schwach',      color: 'bg-orange',     w: '40%' },
  { label: 'Mittel',       color: 'bg-yellow-500', w: '60%' },
  { label: 'Gut',          color: 'bg-green-500',  w: '80%' },
  { label: 'Stark',        color: 'bg-green-600',  w: '100%' },
]

export default function HaendlerRegistrierenPage() {
  const [businessName, setBusinessName] = useState('')
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
  const strength = pwStrength(password)

  const register = async () => {
    setError('')
    if (!businessName.trim()) { setError('Bitte geben Sie Ihren Firmennamen ein'); return }
    if (!name.trim())         { setError('Bitte geben Sie Ihren Namen ein'); return }
    if (!email.trim())        { setError('Bitte geben Sie Ihre E-Mail-Adresse ein'); return }
    if (password.length < 8)  { setError('Das Passwort muss mindestens 8 Zeichen lang sein'); return }
    if (password !== confirm) { setError('Die Passwörter stimmen nicht überein'); return }

    setLoading(true)
    const { data, error: authError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          full_name: name.trim(),
          role: 'merchant',
          business_name: businessName.trim(),
        },
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

    setLoading(false)

    if (data.session) {
      toast.success('Konto erstellt — jetzt Betrieb erfassen')
      // Carry the business name into the application form
      router.push(`/haendler?betrieb=${encodeURIComponent(businessName.trim())}`)
      router.refresh()
      return
    }
    setDone(true)
  }

  if (done) return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center px-6">
      <div className="max-w-md w-full bg-white/[0.04] border border-white/10 rounded-3xl p-10 text-center">
        <div className="w-16 h-16 rounded-full bg-green-500/15 flex items-center justify-center mx-auto mb-5">
          <CheckCircle2 size={28} className="text-green-400" />
        </div>
        <h1 className="text-2xl font-black text-white mb-2">Fast geschafft!</h1>
        <p className="text-sm text-white/50 leading-relaxed mb-7">
          Wir haben Ihnen eine Bestätigungs-E-Mail an{' '}
          <strong className="text-white">{email}</strong> gesendet. Danach erfassen
          Sie Ihren Betrieb.
        </p>
        <Link href="/haendler/anmelden"
          className="inline-flex items-center gap-2 bg-orange text-black font-black rounded-xl px-6 py-3 text-sm hover:bg-orange-dark hover:text-white transition-colors">
          Zur Anmeldung <ArrowRight size={15} />
        </Link>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center px-6 py-12 relative overflow-hidden">
      <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-orange/15 blur-3xl" />
      <div className="absolute -bottom-40 -left-32 w-[400px] h-[400px] rounded-full bg-red/10 blur-3xl" />

      <div className="max-w-md w-full relative z-10">
        <Link href="/haendler" className="flex flex-col items-center gap-3 mb-8">
          <Image src="/logo.png" alt="Echtzeiteinkauf" width={48} height={48} className="rounded-full" />
          <div className="text-center">
            <div className="font-black text-lg text-white leading-tight">Echtzeiteinkauf</div>
            <div className="text-[11px] text-orange font-black tracking-wide">FÜR HÄNDLER</div>
          </div>
        </Link>

        <div className="bg-white/[0.04] backdrop-blur border border-white/10 rounded-3xl p-8">
          <div className="flex items-center gap-2 mb-1">
            <Store size={18} className="text-orange" />
            <h1 className="text-xl font-black text-white">Händler-Konto erstellen</h1>
          </div>
          <p className="text-sm text-white/50 mb-6">
            Danach erfassen Sie Ihren Betrieb und legen Ihr Sortiment an.
          </p>

          {error && (
            <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-3.5 py-3 mb-4">
              <AlertCircle size={15} className="text-red-400 flex-shrink-0 mt-0.5" />
              <span className="text-xs text-red-400 font-medium">{error}</span>
            </div>
          )}

          <div className="flex flex-col gap-3 mb-5">
            <Input icon={Building2} value={businessName} onChange={setBusinessName}
              placeholder="Firmenname — z.B. Obsthof Meier" autoComplete="organization" />

            <Input icon={User} value={name} onChange={setName}
              placeholder="Ihr Name" autoComplete="name" />

            <Input icon={Mail} value={email} onChange={setEmail}
              placeholder="ihre@email.de" type="email" autoComplete="email" />

            <div>
              <div className="flex items-center gap-2 bg-white/[0.06] border border-white/10 rounded-xl px-4 py-3 focus-within:border-orange transition-colors">
                <Lock size={16} className="text-white/30 flex-shrink-0" />
                <input type={showPw ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Passwort (min. 8 Zeichen)" autoComplete="new-password"
                  className="flex-1 outline-none text-sm bg-transparent text-white placeholder-white/25" />
                <button type="button" onClick={() => setShowPw(v => !v)}
                  className="text-white/30 hover:text-white/60">
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {password.length > 0 && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${STRENGTH[strength].color}`}
                      style={{ width: STRENGTH[strength].w }} />
                  </div>
                  <span className="text-[10px] font-bold text-white/40">{STRENGTH[strength].label}</span>
                </div>
              )}
            </div>

            <div className={`flex items-center gap-2 bg-white/[0.06] border rounded-xl px-4 py-3 transition-colors ${
              confirm && password !== confirm ? 'border-red-500/40' : 'border-white/10 focus-within:border-orange'
            }`}>
              <Lock size={16} className="text-white/30 flex-shrink-0" />
              <input type={showPw ? 'text' : 'password'} value={confirm}
                onChange={e => setConfirm(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && register()}
                placeholder="Passwort bestätigen" autoComplete="new-password"
                className="flex-1 outline-none text-sm bg-transparent text-white placeholder-white/25" />
              {confirm && password === confirm && <CheckCircle2 size={15} className="text-green-400" />}
            </div>
          </div>

          <div className="bg-orange/10 border border-orange/20 rounded-xl p-3.5 mb-5 flex gap-2.5">
            <Store size={15} className="text-orange flex-shrink-0 mt-0.5" />
            <p className="text-xs text-white/70 leading-relaxed">
              Im nächsten Schritt erfassen Sie Adresse, Branche und Rechtsform.
              Die Freischaltung dauert 2–3 Werktage.
            </p>
          </div>

          <button onClick={register} disabled={loading}
            className="w-full bg-orange text-black font-black rounded-xl py-3.5 text-sm flex items-center justify-center gap-2 hover:bg-orange-dark hover:text-white transition-colors disabled:opacity-50">
            {loading ? 'Wird erstellt…' : <>Konto erstellen <ArrowRight size={16} /></>}
          </button>

          <p className="text-[11px] text-white/30 text-center mt-4 leading-relaxed">
            Mit der Registrierung akzeptieren Sie unsere{' '}
            <Link href="/agb" className="underline hover:text-white/60">AGB</Link> und{' '}
            <Link href="/datenschutz" className="underline hover:text-white/60">Datenschutzerklärung</Link>.
          </p>
        </div>

        <p className="text-center text-sm text-white/40 mt-6">
          Bereits registriert?{' '}
          <Link href="/haendler/anmelden" className="text-orange font-bold hover:underline">
            Anmelden
          </Link>
        </p>
      </div>
    </div>
  )
}

function Input({ icon: Icon, value, onChange, placeholder, type = 'text', autoComplete }: {
  icon: any; value: string; onChange: (v: string) => void
  placeholder: string; type?: string; autoComplete?: string
}) {
  return (
    <div className="flex items-center gap-2 bg-white/[0.06] border border-white/10 rounded-xl px-4 py-3 focus-within:border-orange transition-colors">
      <Icon size={16} className="text-white/30 flex-shrink-0" />
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} autoComplete={autoComplete}
        className="flex-1 outline-none text-sm bg-transparent text-white placeholder-white/25" />
    </div>
  )
}
