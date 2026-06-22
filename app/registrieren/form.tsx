'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ShoppingBag, Bike, ArrowRight, Mail, Lock, User, Check } from 'lucide-react'
import { createBrowserClient } from '@supabase/ssr'
import { toast } from 'sonner'

type Role = 'customer' | 'shopper'

export function RegistrierenForm() {
  const [role, setRole]         = useState<Role | null>(null)
  const [name, setName]         = useState('')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [sent, setSent]         = useState(false)
  const router = useRouter()

  const getSupabase = () => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const handleCustomerSignup = async () => {
    if (!email.trim() || !name.trim()) { toast.error('Bitte alle Felder ausfüllen'); return }
    setLoading(true)
    const { error } = await getSupabase().auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${location.origin}/auth/callback?next=/konto`,
        data: { full_name: name, role: 'customer' },
      },
    })
    setLoading(false)
    if (error) { toast.error(error.message); return }
    setSent(true)
  }

  const handleShopperSignup = async () => {
    if (!email.trim() || !name.trim() || password.length < 8) {
      toast.error('Bitte alle Felder ausfüllen (Passwort min. 8 Zeichen)')
      return
    }
    setLoading(true)
    const { data, error } = await getSupabase().auth.signUp({
      email, password,
      options: {
        emailRedirectTo: `${location.origin}/auth/callback?next=/shopper-portal/dokumente`,
        data: { full_name: name, role: 'shopper' },
      },
    })
    setLoading(false)
    if (error) { toast.error(error.message); return }
    if (data.user && !data.session) { setSent(true) }
    else { toast.success('Konto erstellt!'); router.push('/shopper-portal/dokumente') }
  }

  if (sent) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
        <div className="bg-white rounded-3xl p-10 max-w-md w-full text-center shadow-sm border border-gray-100">
          <div className="w-16 h-16 rounded-full bg-red/10 flex items-center justify-center mx-auto mb-5">
            <Mail size={28} className="text-red" />
          </div>
          <h1 className="text-2xl font-black text-gray-900 mb-2">Fast geschafft!</h1>
          <p className="text-gray-500 text-sm leading-relaxed mb-6">
            Wir haben Ihnen eine E-Mail an <strong className="text-gray-900">{email}</strong> gesendet.
            {role === 'customer'
              ? ' Klicken Sie auf den Link, um sich anzumelden.'
              : ' Bestätigen Sie Ihre E-Mail, um fortzufahren.'}
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
          {!role ? (
            <>
              <h1 className="text-2xl font-black text-gray-900 mb-1 text-center">Konto erstellen</h1>
              <p className="text-sm text-gray-500 text-center mb-7">Wählen Sie, wie Sie Echtzeiteinkauf nutzen möchten</p>
              <div className="flex flex-col gap-3">
                <button onClick={() => setRole('customer')} className="flex items-center gap-4 p-5 border-2 border-gray-100 rounded-2xl hover:border-red hover:bg-red/[0.03] transition-all text-left group">
                  <div className="w-12 h-12 rounded-xl bg-red/10 flex items-center justify-center flex-shrink-0 group-hover:bg-red transition-colors">
                    <ShoppingBag size={22} className="text-red group-hover:text-white transition-colors" />
                  </div>
                  <div className="flex-1">
                    <div className="font-black text-gray-900">Ich möchte einkaufen</div>
                    <div className="text-xs text-gray-400">Bestellen Sie bei Ihren Lieblingsmärkten</div>
                  </div>
                  <ArrowRight size={18} className="text-gray-300 group-hover:text-red transition-all" />
                </button>
                <button onClick={() => setRole('shopper')} className="flex items-center gap-4 p-5 border-2 border-gray-100 rounded-2xl hover:border-orange hover:bg-orange/5 transition-all text-left group">
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
            </>
          ) : role === 'customer' ? (
            <>
              <button onClick={() => setRole(null)} className="text-xs text-gray-400 font-bold mb-4 hover:text-gray-600">← Zurück</button>
              <div className="flex items-center gap-2 mb-1"><ShoppingBag size={18} className="text-red" /><h1 className="text-xl font-black text-gray-900">Als Käufer registrieren</h1></div>
              <p className="text-sm text-gray-500 mb-6">Kein Passwort nötig — wir senden Ihnen einen Anmeldelink per E-Mail.</p>
              <div className="flex flex-col gap-3 mb-5">
                <div className="flex items-center gap-2 border-2 border-gray-100 rounded-xl px-4 py-3 focus-within:border-red transition-colors">
                  <User size={16} className="text-gray-400" />
                  <input value={name} onChange={e => setName(e.target.value)} placeholder="Ihr Name" className="flex-1 outline-none text-sm bg-transparent" />
                </div>
                <div className="flex items-center gap-2 border-2 border-gray-100 rounded-xl px-4 py-3 focus-within:border-red transition-colors">
                  <Mail size={16} className="text-gray-400" />
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="ihre@email.de" className="flex-1 outline-none text-sm bg-transparent" />
                </div>
              </div>
              <button onClick={handleCustomerSignup} disabled={loading} className="btn-red w-full py-3.5">
                {loading ? 'Wird gesendet...' : 'Anmeldelink erhalten'} <ArrowRight size={16} />
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setRole(null)} className="text-xs text-gray-400 font-bold mb-4 hover:text-gray-600">← Zurück</button>
              <div className="flex items-center gap-2 mb-1"><Bike size={18} className="text-orange-dark" /><h1 className="text-xl font-black text-gray-900">Als Shopper registrieren</h1></div>
              <p className="text-sm text-gray-500 mb-5">Nach der Registrierung benötigen wir noch einige Dokumente.</p>
              <div className="flex flex-col gap-3 mb-5">
                <div className="flex items-center gap-2 border-2 border-gray-100 rounded-xl px-4 py-3 focus-within:border-orange transition-colors">
                  <User size={16} className="text-gray-400" />
                  <input value={name} onChange={e => setName(e.target.value)} placeholder="Ihr Name" className="flex-1 outline-none text-sm bg-transparent" />
                </div>
                <div className="flex items-center gap-2 border-2 border-gray-100 rounded-xl px-4 py-3 focus-within:border-orange transition-colors">
                  <Mail size={16} className="text-gray-400" />
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="ihre@email.de" className="flex-1 outline-none text-sm bg-transparent" />
                </div>
                <div className="flex items-center gap-2 border-2 border-gray-100 rounded-xl px-4 py-3 focus-within:border-orange transition-colors">
                  <Lock size={16} className="text-gray-400" />
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Passwort (min. 8 Zeichen)" className="flex-1 outline-none text-sm bg-transparent" />
                </div>
              </div>
              <div className="bg-orange/10 rounded-xl p-3.5 mb-5 flex gap-2.5">
                <Check size={15} className="text-orange-dark flex-shrink-0 mt-0.5" />
                <p className="text-xs text-orange-dark leading-relaxed">Führungszeugnis, Aufenthaltstitel (bei Bedarf) und Fahrzeugart werden danach abgefragt.</p>
              </div>
              <button onClick={handleShopperSignup} disabled={loading} className="w-full bg-orange text-black font-black rounded-xl py-3.5 flex items-center justify-center gap-2 hover:bg-orange-dark hover:text-white transition-colors disabled:opacity-50">
                {loading ? 'Wird erstellt...' : 'Konto erstellen'} <ArrowRight size={16} />
              </button>
            </>
          )}
        </div>
        <p className="text-center text-sm text-gray-400 mt-6">
          Bereits registriert? <Link href="/anmelden" className="text-red font-bold hover:underline">Anmelden</Link>
        </p>
      </div>
    </div>
  )
}
