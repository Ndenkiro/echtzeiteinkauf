'use client'
// app/passwort-neu/page.tsx — set new password after reset link
import { useState, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createBrowserClient } from '@supabase/ssr'
import { Lock, CheckCircle2, AlertCircle, Eye, EyeOff, KeyRound } from 'lucide-react'
import { toast } from 'sonner'

const SUPABASE_URL = 'https://wpxpgszzzfhhsaunolyq.supabase.co'
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndweHBnc3p6emZoaHNhdW5vbHlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0Mzg5ODQsImV4cCI6MjA5NzAxNDk4NH0.8_DVpLNwItAlkn_gL9a4dn-lZ00I8iifX2Cb9N_W-4U'

function PasswortNeuInner() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [ready, setReady] = useState(false)
  const [invalid, setInvalid] = useState(false)
  const router = useRouter()

  const supabase = createBrowserClient(SUPABASE_URL, SUPABASE_ANON)

  // Establish session from the recovery link (hash fragment)
  useEffect(() => {
    const hash = window.location.hash.substring(1)
    const params = new URLSearchParams(hash)
    const accessToken = params.get('access_token')
    const refreshToken = params.get('refresh_token')
    const type = params.get('type')

    if (accessToken && refreshToken && type === 'recovery') {
      supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      }).then(({ error }) => {
        if (error) setInvalid(true)
        else setReady(true)
      })
    } else {
      // Maybe already has a session (e.g. reloaded the page)
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) setReady(true)
        else setInvalid(true)
      })
    }
  }, [])

  const save = async () => {
    setError('')
    if (password.length < 8) { setError('Das Passwort muss mindestens 8 Zeichen lang sein'); return }
    if (password !== confirm) { setError('Die Passwörter stimmen nicht überein'); return }

    setLoading(true)
    const { error: updateError } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (updateError) {
      setError('Passwort konnte nicht geändert werden. Bitte fordern Sie einen neuen Link an.')
      return
    }

    toast.success('Passwort erfolgreich geändert 🎉')

    // Route by role
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase
        .from('users').select('role').eq('auth_id', user.id).maybeSingle()
      if (profile?.role === 'admin' || profile?.role === 'subadmin') {
        window.location.href = 'https://admin.echtzeiteinkauf.com/'
        return
      }
      router.push(profile?.role === 'shopper' ? '/shopper-portal' : '/konto')
      router.refresh()
      return
    }
    router.push('/anmelden')
  }

  if (invalid) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
        <div className="bg-white rounded-3xl p-10 max-w-md w-full text-center shadow-sm border border-gray-100">
          <div className="w-16 h-16 rounded-full bg-red/10 flex items-center justify-center mx-auto mb-5">
            <AlertCircle size={30} className="text-red" />
          </div>
          <h1 className="text-2xl font-black text-gray-900 mb-2">Link ungültig</h1>
          <p className="text-gray-500 text-sm leading-relaxed mb-6">
            Dieser Link ist abgelaufen oder wurde bereits verwendet.
            Fordern Sie einen neuen Link an.
          </p>
          <Link href="/passwort-vergessen" className="btn-red inline-flex px-6 py-3 text-sm">
            Neuen Link anfordern
          </Link>
        </div>
      </div>
    )
  }

  if (!ready) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-red border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6 py-12">
      <div className="max-w-md w-full">
        <Link href="/" className="flex items-center justify-center gap-2 mb-8">
          <Image src="/logo.png" alt="Echtzeiteinkauf" width={40} height={40} className="rounded-full" />
          <span className="font-black text-xl text-gray-900">Echtzeiteinkauf</span>
        </Link>

        <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
          <div className="w-12 h-12 rounded-xl bg-red/10 flex items-center justify-center mb-4">
            <KeyRound size={22} className="text-red" />
          </div>

          <h1 className="text-xl font-black text-gray-900 mb-1">Neues Passwort festlegen</h1>
          <p className="text-sm text-gray-500 mb-6">
            Wählen Sie ein sicheres Passwort mit mindestens 8 Zeichen.
          </p>

          {error && (
            <div className="flex items-start gap-2 bg-red/5 border border-red/20 rounded-xl px-3.5 py-3 mb-4">
              <AlertCircle size={15} className="text-red flex-shrink-0 mt-0.5" />
              <span className="text-xs text-red font-medium">{error}</span>
            </div>
          )}

          <div className="flex flex-col gap-3 mb-5">
            <div className="flex items-center gap-2 border-2 border-gray-100 rounded-xl px-4 py-3 focus-within:border-red transition-colors">
              <Lock size={16} className="text-gray-400 flex-shrink-0" />
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Neues Passwort"
                autoComplete="new-password"
                className="flex-1 outline-none text-sm bg-transparent"
              />
              <button type="button" onClick={() => setShowPw(v => !v)} className="text-gray-300 hover:text-gray-500">
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>

            <div className={`flex items-center gap-2 border-2 rounded-xl px-4 py-3 transition-colors ${
              confirm && password !== confirm ? 'border-red/40' : 'border-gray-100 focus-within:border-red'
            }`}>
              <Lock size={16} className="text-gray-400 flex-shrink-0" />
              <input
                type={showPw ? 'text' : 'password'}
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && save()}
                placeholder="Passwort bestätigen"
                autoComplete="new-password"
                className="flex-1 outline-none text-sm bg-transparent"
              />
              {confirm && password === confirm && <CheckCircle2 size={15} className="text-green-500" />}
            </div>
          </div>

          <button onClick={save} disabled={loading} className="btn-red w-full py-3.5">
            {loading ? 'Wird gespeichert...' : 'Passwort speichern'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function PasswortNeuPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-red border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <PasswortNeuInner />
    </Suspense>
  )
}
