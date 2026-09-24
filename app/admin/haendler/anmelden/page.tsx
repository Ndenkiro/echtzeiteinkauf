'use client'
// app/haendler/anmelden/page.tsx — merchant login
import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createBrowserClient } from '@supabase/ssr'
import { Mail, Lock, ArrowRight, AlertCircle, Eye, EyeOff, Store } from 'lucide-react'
import { toast } from 'sonner'

const SUPABASE_URL = 'https://wpxpgszzzfhhsaunolyq.supabase.co'
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndweHBnc3p6emZoaHNhdW5vbHlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0Mzg5ODQsImV4cCI6MjA5NzAxNDk4NH0.8_DVpLNwItAlkn_gL9a4dn-lZ00I8iifX2Cb9N_W-4U'

function Inner() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const router = useRouter()
  const params = useSearchParams()
  const next = params.get('next')
  const supabase = createBrowserClient(SUPABASE_URL, SUPABASE_ANON)

  const login = async () => {
    setError('')
    if (!email.trim() || !password) { setError('Bitte E-Mail und Passwort eingeben'); return }

    setLoading(true)
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(), password,
    })

    if (authError) {
      setLoading(false)
      setError('E-Mail oder Passwort ist falsch')
      return
    }

    const { data: profile } = await supabase
      .from('users').select('role, full_name').eq('auth_id', data.user.id).maybeSingle()

    toast.success(`Willkommen zurück${profile?.full_name ? ', ' + profile.full_name.split(' ')[0] : ''}!`)

    // Do they already have an application?
    const { data: ctx } = await supabase.rpc('get_my_merchant_context')
    if (next) router.push(next)
    else if (ctx?.[0]?.status === 'approved') router.push('/haendler-portal')
    else if (ctx?.[0]) router.push('/haendler-portal')
    else router.push('/haendler')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center px-6 py-12 relative overflow-hidden">
      <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-orange/15 blur-3xl" />

      <div className="max-w-sm w-full relative z-10">
        <Link href="/haendler" className="flex flex-col items-center gap-3 mb-8">
          <Image src="/logo.png" alt="Echtzeiteinkauf" width={48} height={48} className="rounded-full" />
          <div className="text-center">
            <div className="font-black text-lg text-white leading-tight">Echtzeiteinkauf</div>
            <div className="text-[11px] text-orange font-black tracking-wide">FÜR HÄNDLER</div>
          </div>
        </Link>

        <div className="bg-white/[0.04] backdrop-blur border border-white/10 rounded-3xl p-7">
          <div className="flex items-center gap-2 mb-1">
            <Store size={17} className="text-orange" />
            <h1 className="text-lg font-black text-white">Anmelden</h1>
          </div>
          <p className="text-xs text-white/40 mb-6">Zu Ihrem Händler-Portal</p>

          {error && (
            <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-3.5 py-3 mb-4">
              <AlertCircle size={15} className="text-red-400 flex-shrink-0 mt-0.5" />
              <span className="text-xs text-red-400 font-medium">{error}</span>
            </div>
          )}

          <div className="flex flex-col gap-3 mb-3">
            <div className="flex items-center gap-2 bg-white/[0.06] border border-white/10 rounded-xl px-4 py-3 focus-within:border-orange transition-colors">
              <Mail size={16} className="text-white/30 flex-shrink-0" />
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && login()}
                placeholder="ihre@email.de" autoComplete="username"
                className="flex-1 outline-none text-sm bg-transparent text-white placeholder-white/25" />
            </div>

            <div className="flex items-center gap-2 bg-white/[0.06] border border-white/10 rounded-xl px-4 py-3 focus-within:border-orange transition-colors">
              <Lock size={16} className="text-white/30 flex-shrink-0" />
              <input type={showPw ? 'text' : 'password'} value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && login()}
                placeholder="Passwort" autoComplete="current-password"
                className="flex-1 outline-none text-sm bg-transparent text-white placeholder-white/25" />
              <button type="button" onClick={() => setShowPw(v => !v)}
                className="text-white/30 hover:text-white/60">
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <div className="flex justify-end mb-5">
            <Link href="/passwort-vergessen"
              className="text-xs font-bold text-white/40 hover:text-orange transition-colors">
              Passwort vergessen?
            </Link>
          </div>

          <button onClick={login} disabled={loading}
            className="w-full bg-orange text-black font-black rounded-xl py-3.5 text-sm flex items-center justify-center gap-2 hover:bg-orange-dark hover:text-white transition-colors disabled:opacity-50">
            {loading ? 'Wird angemeldet…' : <>Anmelden <ArrowRight size={16} /></>}
          </button>
        </div>

        <p className="text-center text-sm text-white/40 mt-6">
          Noch kein Händler-Konto?{' '}
          <Link href="/haendler/registrieren" className="text-orange font-bold hover:underline">
            Jetzt registrieren
          </Link>
        </p>
      </div>
    </div>
  )
}

export default function HaendlerAnmeldenPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-orange border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <Inner />
    </Suspense>
  )
}
