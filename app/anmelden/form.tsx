'use client'
// app/anmelden/form.tsx — role tabs, redirect to the matching portal
import { useState, Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createBrowserClient } from '@supabase/ssr'
import {
  Mail, Lock, ArrowRight, AlertCircle, Eye, EyeOff,
  ShoppingBag, Bike
} from 'lucide-react'
import { toast } from 'sonner'

const SUPABASE_URL = 'https://wpxpgszzzfhhsaunolyq.supabase.co'
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndweHBnc3p6emZoaHNhdW5vbHlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0Mzg5ODQsImV4cCI6MjA5NzAxNDk4NH0.8_DVpLNwItAlkn_gL9a4dn-lZ00I8iifX2Cb9N_W-4U'

type Tab = 'customer' | 'shopper'

function AnmeldenInner() {
  const params = useSearchParams()
  const next = params.get('next')
  const roleParam = params.get('role')

  const [tab, setTab] = useState<Tab>(
    roleParam === 'shopper' || next?.startsWith('/shopper') ? 'shopper' : 'customer'
  )
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const router = useRouter()
  const supabase = createBrowserClient(SUPABASE_URL, SUPABASE_ANON)

  const isShopper = tab === 'shopper'
  const accent = isShopper ? 'orange' : 'red'

  const login = async () => {
    setError('')
    if (!email.trim() || !password) {
      setError('Bitte E-Mail und Passwort eingeben'); return
    }

    setLoading(true)
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(), password,
    })

    if (authError) {
      setLoading(false)
      setError(authError.message.includes('Email not confirmed')
        ? 'Bitte bestätigen Sie zuerst Ihre E-Mail-Adresse.'
        : 'E-Mail oder Passwort ist falsch')
      return
    }

    const { data: profile } = await supabase
      .from('users').select('role, full_name').eq('auth_id', data.user.id).maybeSingle()

    const role = profile?.role

    // Warn if the account does not match the selected tab
    if (isShopper && role === 'customer') {
      setLoading(false)
      setError('Dieses Konto ist ein Käufer-Konto. Wechseln Sie oben auf "Käufer".')
      await supabase.auth.signOut()
      return
    }
    if (!isShopper && role === 'shopper') {
      setLoading(false)
      setError('Dieses Konto ist ein Shopper-Konto. Wechseln Sie oben auf "Shopper".')
      await supabase.auth.signOut()
      return
    }

    toast.success(`Willkommen zurück${profile?.full_name ? ', ' + profile.full_name.split(' ')[0] : ''}!`)

    if (role === 'admin' || role === 'subadmin') {
      window.location.href = 'https://admin.echtzeiteinkauf.com/'
      return
    }
    if (next) { router.push(next) }
    else if (role === 'shopper') { router.push('/shopper-portal') }
    else { router.push('/konto') }
    router.refresh()
  }

  return (
    <div className={`min-h-screen flex items-center justify-center px-6 py-12 transition-colors ${
      isShopper ? 'bg-[#0A0A0A]' : 'bg-gray-50'
    }`}>
      <div className="max-w-md w-full">
        <Link href={isShopper ? '/shopper' : '/'} className="flex items-center justify-center gap-2 mb-8">
          <Image src="/logo.png" alt="Echtzeiteinkauf" width={40} height={40} className="rounded-full" />
          <span className={`font-black text-xl ${isShopper ? 'text-white' : 'text-gray-900'}`}>
            Echtzeiteinkauf
          </span>
        </Link>

        <div className={`rounded-3xl p-8 border ${
          isShopper
            ? 'bg-white/[0.04] border-white/10'
            : 'bg-white border-gray-100 shadow-sm'
        }`}>
          {/* Role tabs */}
          <div className={`flex gap-1 p-1 rounded-2xl mb-6 ${isShopper ? 'bg-white/[0.06]' : 'bg-gray-100'}`}>
            <button
              onClick={() => { setTab('customer'); setError('') }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-black transition-all ${
                !isShopper
                  ? 'bg-white text-red shadow-sm'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              <ShoppingBag size={15} /> Käufer
            </button>
            <button
              onClick={() => { setTab('shopper'); setError('') }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-black transition-all ${
                isShopper
                  ? 'bg-orange text-black'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <Bike size={15} /> Shopper
            </button>
          </div>

          <h1 className={`text-2xl font-black mb-1 text-center ${isShopper ? 'text-white' : 'text-gray-900'}`}>
            Anmelden
          </h1>
          <p className={`text-sm text-center mb-6 ${isShopper ? 'text-white/40' : 'text-gray-500'}`}>
            {isShopper ? 'Zu Ihrem Shopper-Portal' : 'Schön, Sie wiederzusehen'}
          </p>

          {error && (
            <div className={`flex items-start gap-2 rounded-xl px-3.5 py-3 mb-4 ${
              isShopper ? 'bg-red-500/10 border border-red-500/20' : 'bg-red/5 border border-red/20'
            }`}>
              <AlertCircle size={15} className="text-red flex-shrink-0 mt-0.5" />
              <span className="text-xs text-red font-medium">{error}</span>
            </div>
          )}

          <div className="flex flex-col gap-3 mb-3">
            <div className={`flex items-center gap-2 border-2 rounded-xl px-4 py-3 transition-colors ${
              isShopper
                ? `bg-white/[0.05] border-white/10 focus-within:border-orange`
                : `border-gray-100 focus-within:border-red`
            }`}>
              <Mail size={16} className={isShopper ? 'text-white/30' : 'text-gray-400'} />
              <input
                type="email" value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && login()}
                placeholder="ihre@email.de" autoComplete="username"
                className={`flex-1 outline-none text-sm bg-transparent ${
                  isShopper ? 'text-white placeholder-white/25' : 'text-gray-900'
                }`}
              />
            </div>

            <div className={`flex items-center gap-2 border-2 rounded-xl px-4 py-3 transition-colors ${
              isShopper
                ? `bg-white/[0.05] border-white/10 focus-within:border-orange`
                : `border-gray-100 focus-within:border-red`
            }`}>
              <Lock size={16} className={isShopper ? 'text-white/30' : 'text-gray-400'} />
              <input
                type={showPw ? 'text' : 'password'} value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && login()}
                placeholder="Passwort" autoComplete="current-password"
                className={`flex-1 outline-none text-sm bg-transparent ${
                  isShopper ? 'text-white placeholder-white/25' : 'text-gray-900'
                }`}
              />
              <button type="button" onClick={() => setShowPw(v => !v)}
                className={isShopper ? 'text-white/30 hover:text-white/60' : 'text-gray-300 hover:text-gray-500'}>
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <div className="flex justify-end mb-5">
            <Link href="/passwort-vergessen"
              className={`text-xs font-bold transition-colors ${
                isShopper ? 'text-white/40 hover:text-orange' : 'text-gray-400 hover:text-red'
              }`}>
              Passwort vergessen?
            </Link>
          </div>

          <button
            onClick={login}
            disabled={loading}
            className={`w-full font-black rounded-xl py-3.5 text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50 ${
              isShopper
                ? 'bg-orange text-black hover:bg-orange-dark hover:text-white'
                : 'bg-red text-white hover:bg-red-dark'
            }`}
          >
            {loading ? 'Wird angemeldet…' : <>Anmelden <ArrowRight size={16} /></>}
          </button>
        </div>

        <p className={`text-center text-sm mt-6 ${isShopper ? 'text-white/40' : 'text-gray-400'}`}>
          Noch kein Konto?{' '}
          <Link href="/registrieren"
            className={`font-bold hover:underline ${isShopper ? 'text-orange' : 'text-red'}`}>
            Jetzt registrieren
          </Link>
        </p>

        {isShopper && (
          <p className="text-center text-xs text-white/30 mt-3">
            <Link href="/shopper" className="hover:text-white/60 transition-colors">
              Mehr über die Arbeit als Shopper →
            </Link>
          </p>
        )}
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
