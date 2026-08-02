'use client'
// app/passwort-vergessen/page.tsx
import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { createBrowserClient } from '@supabase/ssr'
import { Mail, ArrowLeft, CheckCircle2, AlertCircle, KeyRound } from 'lucide-react'

const SUPABASE_URL = 'https://wpxpgszzzfhhsaunolyq.supabase.co'
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndweHBnc3p6emZoaHNhdW5vbHlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0Mzg5ODQsImV4cCI6MjA5NzAxNDk4NH0.8_DVpLNwItAlkn_gL9a4dn-lZ00I8iifX2Cb9N_W-4U'

export default function PasswortVergessenPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const supabase = createBrowserClient(SUPABASE_URL, SUPABASE_ANON)

  const sendReset = async () => {
    setError('')
    if (!email.trim()) { setError('Bitte geben Sie Ihre E-Mail-Adresse ein'); return }

    setLoading(true)
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email.trim(),
      { redirectTo: 'https://echtzeiteinkauf.com/passwort-neu' }
    )
    setLoading(false)

    if (resetError) {
      setError('Es ist ein Fehler aufgetreten. Bitte versuchen Sie es später erneut.')
      return
    }
    setSent(true)
  }

  if (sent) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
        <div className="bg-white rounded-3xl p-10 max-w-md w-full text-center shadow-sm border border-gray-100">
          <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 size={30} className="text-green-600" />
          </div>
          <h1 className="text-2xl font-black text-gray-900 mb-2">E-Mail gesendet</h1>
          <p className="text-gray-500 text-sm leading-relaxed mb-6">
            Falls ein Konto mit <strong className="text-gray-900">{email}</strong> existiert,
            haben wir Ihnen einen Link zum Zurücksetzen Ihres Passworts gesendet.
            Prüfen Sie auch Ihren Spam-Ordner.
          </p>
          <Link href="/anmelden" className="btn-red inline-flex px-6 py-3 text-sm">
            Zurück zur Anmeldung
          </Link>
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
          <Link href="/anmelden" className="flex items-center gap-1.5 text-xs text-gray-400 font-bold mb-5 hover:text-gray-600">
            <ArrowLeft size={13} /> Zurück zur Anmeldung
          </Link>

          <div className="w-12 h-12 rounded-xl bg-red/10 flex items-center justify-center mb-4">
            <KeyRound size={22} className="text-red" />
          </div>

          <h1 className="text-xl font-black text-gray-900 mb-1">Passwort vergessen?</h1>
          <p className="text-sm text-gray-500 mb-6">
            Kein Problem. Geben Sie Ihre E-Mail-Adresse ein und wir senden Ihnen
            einen Link zum Zurücksetzen.
          </p>

          {error && (
            <div className="flex items-start gap-2 bg-red/5 border border-red/20 rounded-xl px-3.5 py-3 mb-4">
              <AlertCircle size={15} className="text-red flex-shrink-0 mt-0.5" />
              <span className="text-xs text-red font-medium">{error}</span>
            </div>
          )}

          <div className="flex items-center gap-2 border-2 border-gray-100 rounded-xl px-4 py-3 mb-5 focus-within:border-red transition-colors">
            <Mail size={16} className="text-gray-400 flex-shrink-0" />
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendReset()}
              placeholder="ihre@email.de"
              autoComplete="email"
              className="flex-1 outline-none text-sm bg-transparent"
            />
          </div>

          <button onClick={sendReset} disabled={loading} className="btn-red w-full py-3.5">
            {loading ? 'Wird gesendet...' : 'Link zum Zurücksetzen senden'}
          </button>
        </div>
      </div>
    </div>
  )
}
