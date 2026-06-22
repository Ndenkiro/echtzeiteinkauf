'use client'
// app/anmelden/page.tsx
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Mail, Lock, ArrowRight } from 'lucide-react'
import { supabaseBrowser } from '@/lib/supabase'
import { toast } from 'sonner'

export default function AnmeldenPage() {
  const [tab, setTab]           = useState<'magic' | 'password'>('magic')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [sent, setSent]         = useState(false)
  const router = useRouter()
  const params = useSearchParams()
  const next = params.get('next') || '/konto'
  const supabase = supabaseBrowser()

  const handleMagicLink = async () => {
    if (!email.trim()) { toast.error('Bitte E-Mail eingeben'); return }
    setLoading(true)
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${location.origin}/auth/callback?next=${next}` },
    })
    setLoading(false)
    if (error) { toast.error(error.message); return }
    setSent(true)
  }

  const handlePasswordLogin = async () => {
    if (!email.trim() || !password) { toast.error('Bitte alle Felder ausfüllen'); return }
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) { toast.error('E-Mail oder Passwort falsch'); return }
    toast.success('Willkommen zurück!')
    router.push(next.startsWith('/shopper') ? next : '/shopper-portal')
    router.refresh()
  }

  if (sent) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
        <div className="bg-white rounded-3xl p-10 max-w-md w-full text-center shadow-sm border border-gray-100">
          <div className="w-16 h-16 rounded-full bg-red/10 flex items-center justify-center mx-auto mb-5">
            <Mail size={28} className="text-red" />
          </div>
          <h1 className="text-2xl font-black text-gray-900 mb-2">Link gesendet!</h1>
          <p className="text-gray-500 text-sm leading-relaxed mb-6">
            Öffnen Sie die E-Mail an <strong className="text-gray-900">{email}</strong> und klicken Sie auf den Anmeldelink.
          </p>
          <Link href="/" className="text-red font-bold text-sm hover:underline">Zurück zur Startseite</Link>
        </div>
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
          <h1 className="text-2xl font-black text-gray-900 mb-1 text-center">Anmelden</h1>
          <p className="text-sm text-gray-500 text-center mb-6">Schön, Sie wiederzusehen</p>

          <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
            <button
              onClick={() => setTab('magic')}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${tab === 'magic' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
            >Käufer (Link per E-Mail)</button>
            <button
              onClick={() => setTab('password')}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${tab === 'password' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
            >Shopper (Passwort)</button>
          </div>

          {tab === 'magic' ? (
            <>
              <div className="flex items-center gap-2 border-2 border-gray-100 rounded-xl px-4 py-3 mb-5 focus-within:border-red transition-colors">
                <Mail size={16} className="text-gray-400" />
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleMagicLink()} placeholder="ihre@email.de" className="flex-1 outline-none text-sm bg-transparent" />
              </div>
              <button onClick={handleMagicLink} disabled={loading} className="btn-red w-full py-3.5">
                {loading ? 'Wird gesendet...' : 'Anmeldelink erhalten'} <ArrowRight size={16} />
              </button>
            </>
          ) : (
            <>
              <div className="flex flex-col gap-3 mb-5">
                <div className="flex items-center gap-2 border-2 border-gray-100 rounded-xl px-4 py-3 focus-within:border-orange transition-colors">
                  <Mail size={16} className="text-gray-400" />
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="ihre@email.de" className="flex-1 outline-none text-sm bg-transparent" />
                </div>
                <div className="flex items-center gap-2 border-2 border-gray-100 rounded-xl px-4 py-3 focus-within:border-orange transition-colors">
                  <Lock size={16} className="text-gray-400" />
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handlePasswordLogin()} placeholder="Passwort" className="flex-1 outline-none text-sm bg-transparent" />
                </div>
              </div>
              <button onClick={handlePasswordLogin} disabled={loading} className="w-full bg-orange text-black font-black rounded-xl py-3.5 flex items-center justify-center gap-2 hover:bg-orange-dark hover:text-white transition-colors disabled:opacity-50">
                {loading ? 'Wird angemeldet...' : 'Anmelden'} <ArrowRight size={16} />
              </button>
            </>
          )}
        </div>

        <p className="text-center text-sm text-gray-400 mt-6">
          Noch kein Konto? <Link href="/registrieren" className="text-red font-bold hover:underline">Jetzt registrieren</Link>
        </p>
      </div>
    </div>
  )
}
