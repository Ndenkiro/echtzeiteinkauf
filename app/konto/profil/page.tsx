'use client'
// app/konto/profil/page.tsx — edit profile
import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import {
  User, Mail, Phone, Save, Lock, CheckCircle2,
  AlertCircle, Eye, EyeOff, Trash2
} from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

const SUPABASE_URL = 'https://wpxpgszzzfhhsaunolyq.supabase.co'
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndweHBnc3p6emZoaHNhdW5vbHlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0Mzg5ODQsImV4cCI6MjA5NzAxNDk4NH0.8_DVpLNwItAlkn_gL9a4dn-lZ00I8iifX2Cb9N_W-4U'

export default function ProfilPage() {
  const [profile, setProfile] = useState<any>(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Password change
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [pwSaving, setPwSaving] = useState(false)
  const [pwError, setPwError] = useState('')

  const router = useRouter()
  const supabase = createBrowserClient(SUPABASE_URL, SUPABASE_ANON)

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/anmelden'); return }
      const { data } = await supabase
        .from('users')
        .select('id, full_name, email, phone, role, created_at')
        .eq('auth_id', user.id)
        .single()
      if (data) {
        setProfile(data)
        setName(data.full_name || '')
        setPhone(data.phone || '')
      }
      setLoading(false)
    })()
  }, [])

  const saveProfile = async () => {
    if (!name.trim()) { toast.error('Bitte geben Sie Ihren Namen ein'); return }
    setSaving(true)
    const { error } = await supabase
      .from('users')
      .update({ full_name: name.trim(), phone: phone.trim() || null })
      .eq('id', profile.id)
    setSaving(false)
    if (error) { toast.error('Speichern fehlgeschlagen'); return }
    toast.success('Profil aktualisiert ✓')
    setProfile({ ...profile, full_name: name.trim(), phone: phone.trim() })
    router.refresh()
  }

  const changePassword = async () => {
    setPwError('')
    if (newPw.length < 8) { setPwError('Das Passwort muss mindestens 8 Zeichen lang sein'); return }
    if (newPw !== confirmPw) { setPwError('Die Passwörter stimmen nicht überein'); return }

    setPwSaving(true)
    const { error } = await supabase.auth.updateUser({ password: newPw })
    setPwSaving(false)

    if (error) { setPwError('Passwort konnte nicht geändert werden'); return }
    toast.success('Passwort geändert ✓')
    setNewPw('')
    setConfirmPw('')
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-4 border-red border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const initials = (profile?.full_name || profile?.email || 'K')
    .split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()

  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })
    : ''

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-gray-900">Profil</h1>
        <p className="text-sm text-gray-500 mt-1">Verwalten Sie Ihre persönlichen Daten</p>
      </div>

      {/* Profile card */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-50">
          <div className="w-16 h-16 rounded-full bg-red/10 flex items-center justify-center font-black text-xl text-red flex-shrink-0">
            {initials}
          </div>
          <div>
            <div className="font-black text-lg text-gray-900">{profile?.full_name || 'Mein Konto'}</div>
            <div className="text-sm text-gray-400">{profile?.email}</div>
            {memberSince && (
              <div className="text-xs text-gray-400 mt-0.5">Mitglied seit {memberSince}</div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-black text-gray-400 uppercase tracking-wide mb-2 block">
              Vollständiger Name
            </label>
            <div className="flex items-center gap-2 border-2 border-gray-100 rounded-xl px-4 py-3 focus-within:border-red transition-colors">
              <User size={16} className="text-gray-400 flex-shrink-0" />
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Ihr Name"
                className="flex-1 outline-none text-sm bg-transparent"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-black text-gray-400 uppercase tracking-wide mb-2 block">
              E-Mail-Adresse
            </label>
            <div className="flex items-center gap-2 border-2 border-gray-50 bg-gray-50 rounded-xl px-4 py-3">
              <Mail size={16} className="text-gray-300 flex-shrink-0" />
              <input
                value={profile?.email || ''}
                disabled
                className="flex-1 outline-none text-sm bg-transparent text-gray-400 cursor-not-allowed"
              />
            </div>
            <p className="text-[11px] text-gray-400 mt-1.5">
              Die E-Mail-Adresse kann nicht geändert werden.
            </p>
          </div>

          <div>
            <label className="text-xs font-black text-gray-400 uppercase tracking-wide mb-2 block">
              Telefonnummer <span className="font-normal normal-case">(optional)</span>
            </label>
            <div className="flex items-center gap-2 border-2 border-gray-100 rounded-xl px-4 py-3 focus-within:border-red transition-colors">
              <Phone size={16} className="text-gray-400 flex-shrink-0" />
              <input
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+49 ..."
                className="flex-1 outline-none text-sm bg-transparent"
              />
            </div>
            <p className="text-[11px] text-gray-400 mt-1.5">
              Ihr Shopper kann Sie bei Rückfragen zur Lieferung erreichen.
            </p>
          </div>

          <button onClick={saveProfile} disabled={saving} className="btn-red w-full py-3.5 mt-2">
            {saving ? 'Wird gespeichert...' : <><Save size={16} /> Änderungen speichern</>}
          </button>
        </div>
      </div>

      {/* Password change */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex items-center gap-2 mb-1">
          <Lock size={16} className="text-gray-400" />
          <h2 className="font-black text-gray-900">Passwort ändern</h2>
        </div>
        <p className="text-sm text-gray-500 mb-5">
          Wählen Sie ein sicheres Passwort mit mindestens 8 Zeichen.
        </p>

        {pwError && (
          <div className="flex items-start gap-2 bg-red/5 border border-red/20 rounded-xl px-3.5 py-3 mb-4">
            <AlertCircle size={15} className="text-red flex-shrink-0 mt-0.5" />
            <span className="text-xs text-red font-medium">{pwError}</span>
          </div>
        )}

        <div className="flex flex-col gap-3 mb-4">
          <div className="flex items-center gap-2 border-2 border-gray-100 rounded-xl px-4 py-3 focus-within:border-red transition-colors">
            <Lock size={16} className="text-gray-400 flex-shrink-0" />
            <input
              type={showPw ? 'text' : 'password'}
              value={newPw}
              onChange={e => setNewPw(e.target.value)}
              placeholder="Neues Passwort"
              autoComplete="new-password"
              className="flex-1 outline-none text-sm bg-transparent"
            />
            <button type="button" onClick={() => setShowPw(v => !v)} className="text-gray-300 hover:text-gray-500">
              {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>

          <div className={`flex items-center gap-2 border-2 rounded-xl px-4 py-3 transition-colors ${
            confirmPw && newPw !== confirmPw ? 'border-red/40' : 'border-gray-100 focus-within:border-red'
          }`}>
            <Lock size={16} className="text-gray-400 flex-shrink-0" />
            <input
              type={showPw ? 'text' : 'password'}
              value={confirmPw}
              onChange={e => setConfirmPw(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && changePassword()}
              placeholder="Passwort bestätigen"
              autoComplete="new-password"
              className="flex-1 outline-none text-sm bg-transparent"
            />
            {confirmPw && newPw === confirmPw && <CheckCircle2 size={15} className="text-green-500" />}
          </div>
        </div>

        <button
          onClick={changePassword}
          disabled={pwSaving || !newPw || !confirmPw}
          className="w-full border-2 border-gray-200 text-gray-700 font-black rounded-xl py-3 text-sm hover:border-red hover:text-red transition-all disabled:opacity-40"
        >
          {pwSaving ? 'Wird geändert...' : 'Passwort ändern'}
        </button>
      </div>
    </div>
  )
}
