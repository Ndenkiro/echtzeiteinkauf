'use client'
// app/anmelden/form.tsx — password-based login
import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createBrowserClient } from '@supabase/ssr'
import { Mail, Lock, ArrowRight, AlertCircle, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'

const SUPABASE_URL = 'https://wpxpgszzzfhhsaunolyq.supabase.co'
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndweHBnc3p6emZoaHNhdW5vbHlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0Mzg5ODQsImV4cCI6MjA5NzAxNDk4NH0.8_DVpLNwItAlkn_gL9a4dn-lZ00I8iifX2Cb9N_W-4U'

function AnmeldenInner() {
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
    if (!email.trim() || !password) {
      setError('Bitte E-Mail und Passwort eingeben')
      return
    }

    setLoading(true)
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    if (authError) {
      setLoading(false)
      if (authError.message.includes('Email not confirmed')) {
        setError('Bitte bestätigen Sie zuerst Ihre E-Mail-Adresse.')
      } else {
        setError('E-Mail oder Passwort ist falsch')
      }
      return
    }

    // Route by role
    const { data: profile } = await supabase
      .from('users')
      .select('role, full_name')
      .eq('auth_id', data.user.id)
      .maybeSingle()

    toast.success(`Willkommen zurück${profile?.full_name ? ', ' + profile.full_name.split(' ')[0] : ''}!`)

    if (next) {
      router.push(next)
    } else if (profile?.role === 'shopper') {
      router.push('/shopper-portal')
    } else if (profile?.role === 'admin' || profile?.role === 'subadmin') {
      window.location.href = 'https://admin.echtzeiteinkauf.com/'
      return
    } else {
      router.push('/konto')
    }
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6 py-12">
      <div className="max-w-md w-full">
        <Link href="/" className="flex items-center justify-center gap-2 mb-8">
          <Image src="/logo.png" alt="Echtzeiteinkauf" width={40} height={40} className="rounded-full" />
          <span className="font-black text-xl text-gray-900">Echtzeiteinkauf</span>
        </Link>

        <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
          <h1 className="text-2xl font-black text-gray-900 mb-1 text-center">Anmelden</h1>
          <p className="text-sm text-gray-500 text-center mb-6">Schön, Sie wiederzusehen</p>

          {error && (
            <div className="flex items-start gap-2 bg-red/5 border border-red/20 rounded-xl px-3.5 py-3 mb-4">
              <AlertCircle size={15} className="text-red flex-shrink-0 mt-0.5" />
              <span className="text-xs text-red font-medium">{error}</span>
            </div>
          )}

          <div className="flex flex-col gap-3 mb-3">
            <div className="flex items-center gap-2 border-2 border-gray-100 rounded-xl px-4 py-3 focus-within:border-red transition-colors">
              <Mail size={16} className="text-gray-400 flex-shrink-0" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && login()}
                placeholder="ihre@email.de"
                autoComplete="username"
                className="flex-1 outline-none text-sm bg-transparent"
              />
            </div>

            <div className="flex items-center gap-2 border-2 border-gray-100 rounded-xl px-4 py-3 focus-within:border-red transition-colors">
              <Lock size={16} className="text-gray-400 flex-shrink-0" />
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && login()}
                placeholder="Passwort"
                autoComplete="current-password"
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
          </div>

          <div className="flex justify-end mb-5">
            <Link href="/passwort-vergessen" className="text-xs font-bold text-gray-400 hover:text-red transition-colors">
              Passwort vergessen?
            </Link>
          </div>

          <button onClick={login} disabled={loading} className="btn-red w-full py-3.5">
            {loading ? 'Wird angemeldet...' : <>Anmelden <ArrowRight size={16} /></>}
          </button>
        </div>

        <p className="text-center text-sm text-gray-400 mt-6">
          Noch kein Konto?{' '}
          <Link href="/registrieren" className="text-red font-bold hover:underline">Jetzt registrieren</Link>
        </p>
      </div>
    </div>
  )
}

export function AnmeldenForm() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-red border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <AnmeldenInner />
    </Suspense>
  )
}
