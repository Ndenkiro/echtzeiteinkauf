'use client'
// app/admin-login/page.tsx — dedicated admin login (served on admin subdomain)
import { useState, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createBrowserClient } from '@supabase/ssr'
import { Mail, Lock, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

const SUPABASE_URL = 'https://wpxpgszzzfhhsaunolyq.supabase.co'
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndweHBnc3p6emZoaHNhdW5vbHlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0Mzg5ODQsImV4cCI6MjA5NzAxNDk4NH0.8_DVpLNwItAlkn_gL9a4dn-lZ00I8iifX2Cb9N_W-4U'

function AdminLoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const supabase = createBrowserClient(SUPABASE_URL, SUPABASE_ANON)

  const login = async () => {
    if (!email.trim() || !password) {
      setError('Bitte E-Mail und Passwort eingeben')
      return
    }
    setLoading(true)
    setError('')

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    if (authError) {
      setLoading(false)
      setError('E-Mail oder Passwort ist falsch')
      return
    }

    // Verify admin role before redirecting
    const { data: profile } = await supabase
      .from('users')
      .select('role, full_name')
      .eq('auth_id', data.user.id)
      .single()

    if (!profile || !['admin', 'subadmin'].includes(profile.role)) {
      await supabase.auth.signOut()
      setLoading(false)
      setError('Dieser Account hat keine Administratorrechte')
      return
    }

    toast.success(`Willkommen zurück, ${profile.full_name?.split(' ')[0] || 'Admin'}!`)
    router.push('/')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center px-6 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-red/10 blur-3xl" />
      <div className="absolute -bottom-40 -left-40 w-[400px] h-[400px] rounded-full bg-orange/5 blur-3xl" />

      <div className="max-w-sm w-full relative z-10">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <Image
            src="/logo.png"
            alt="Echtzeiteinkauf"
            width={52}
            height={52}
            className="rounded-full mb-4"
          />
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck size={18} className="text-red" />
            <span className="font-black text-xl text-white">Admin Panel</span>
          </div>
          <p className="text-white/40 text-xs">Echtzeiteinkauf GmbH</p>
        </div>

        {/* Login card */}
        <div className="bg-white/[0.03] backdrop-blur border border-white/10 rounded-3xl p-7">
          <h1 className="text-lg font-black text-white mb-1">Anmelden</h1>
          <p className="text-xs text-white/40 mb-6">
            Nur für autorisierte Administratoren
          </p>

          {error && (
            <div className="flex items-start gap-2 bg-red/10 border border-red/20 rounded-xl px-3.5 py-3 mb-4">
              <AlertCircle size={15} className="text-red flex-shrink-0 mt-0.5" />
              <span className="text-xs text-red font-medium">{error}</span>
            </div>
          )}

          <div className="flex flex-col gap-3 mb-5">
            <div className="flex items-center gap-2.5 bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus-within:border-red transition-colors">
              <Mail size={15} className="text-white/30 flex-shrink-0" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && login()}
                placeholder="admin@echtzeiteinkauf.com"
                autoComplete="username"
                className="flex-1 outline-none text-sm bg-transparent text-white placeholder-white/25"
              />
            </div>

            <div className="flex items-center gap-2.5 bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus-within:border-red transition-colors">
              <Lock size={15} className="text-white/30 flex-shrink-0" />
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && login()}
                placeholder="Passwort"
                autoComplete="current-password"
                className="flex-1 outline-none text-sm bg-transparent text-white placeholder-white/25"
              />
            </div>
          </div>

          <button
            onClick={login}
            disabled={loading}
            className="w-full bg-red text-white font-black rounded-xl py-3.5 text-sm flex items-center justify-center gap-2 hover:bg-red-dark transition-colors disabled:opacity-50"
          >
            {loading ? 'Wird angemeldet...' : <>Anmelden <ArrowRight size={16} /></>}
          </button>
        </div>

        <p className="text-center text-[11px] text-white/25 mt-6">
          Alle Zugriffe werden protokolliert.<br />
          © 2026 Echtzeiteinkauf GmbH · Fürth
        </p>
      </div>
    </div>
  )
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-red border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <AdminLoginForm />
    </Suspense>
  )
}
