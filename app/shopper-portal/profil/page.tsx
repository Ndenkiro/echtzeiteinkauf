'use client'
// app/shopper-portal/profil/page.tsx
import { useEffect, useState } from 'react'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { toast } from 'sonner'
import { User, Mail, Phone, CreditCard, Save } from 'lucide-react'

export default function ShopperProfilPage() {
  const supabase = supabaseBrowser()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [profile, setProfile] = useState<any>(null)
  const [application, setApplication] = useState<any>(null)
  const [name, setName]   = useState('')
  const [phone, setPhone] = useState('')
  const [iban, setIban]   = useState('')

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: p } = await supabase.from('users').select('*').eq('auth_id', user.id).single()
      if (p) {
        setProfile(p)
        setName(p.full_name || '')
        setPhone(p.phone || '')
        const { data: app } = await supabase.from('shopper_applications').select('*').eq('user_id', p.id).maybeSingle()
        setApplication(app)
        setIban(app?.iban || '')
      }
      setLoading(false)
    })()
  }, [])

  const save = async () => {
    setSaving(true)
    await supabase.from('users').update({ full_name: name, phone, updated_at: new Date().toISOString() }).eq('id', profile.id)
    if (application) {
      await supabase.from('shopper_applications').update({ iban }).eq('id', application.id)
    }
    setSaving(false)
    toast.success('Profil gespeichert ✓')
  }

  if (loading) return <div className="text-sm text-gray-400">Lädt...</div>

  return (
    <div className="max-w-lg">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-gray-900">Mein Profil</h1>
        <p className="text-sm text-gray-500 mt-1">Persönliche Daten und Auszahlungsinformationen</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6 flex flex-col gap-5">
        <div>
          <label className="text-xs font-black text-gray-400 uppercase tracking-wide mb-2 block">Name</label>
          <div className="flex items-center gap-2 border-2 border-gray-100 rounded-xl px-4 py-3 focus-within:border-orange transition-colors">
            <User size={16} className="text-gray-400" />
            <input value={name} onChange={e => setName(e.target.value)} className="flex-1 outline-none text-sm bg-transparent" />
          </div>
        </div>

        <div>
          <label className="text-xs font-black text-gray-400 uppercase tracking-wide mb-2 block">E-Mail</label>
          <div className="flex items-center gap-2 border-2 border-gray-100 bg-gray-50 rounded-xl px-4 py-3">
            <Mail size={16} className="text-gray-400" />
            <span className="text-sm text-gray-500">{profile?.email}</span>
          </div>
        </div>

        <div>
          <label className="text-xs font-black text-gray-400 uppercase tracking-wide mb-2 block">Telefon</label>
          <div className="flex items-center gap-2 border-2 border-gray-100 rounded-xl px-4 py-3 focus-within:border-orange transition-colors">
            <Phone size={16} className="text-gray-400" />
            <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+49 ..." className="flex-1 outline-none text-sm bg-transparent" />
          </div>
        </div>

        <div>
          <label className="text-xs font-black text-gray-400 uppercase tracking-wide mb-2 block">IBAN (für Auszahlungen)</label>
          <div className="flex items-center gap-2 border-2 border-gray-100 rounded-xl px-4 py-3 focus-within:border-orange transition-colors">
            <CreditCard size={16} className="text-gray-400" />
            <input value={iban} onChange={e => setIban(e.target.value)} placeholder="DE89 3704 0044 0532 0130 00" className="flex-1 outline-none text-sm bg-transparent" />
          </div>
        </div>

        <button onClick={save} disabled={saving} className="w-full bg-orange text-black font-black rounded-xl py-3 flex items-center justify-center gap-2 hover:bg-orange-dark hover:text-white transition-colors mt-2">
          <Save size={16} /> {saving ? 'Speichert...' : 'Speichern'}
        </button>
      </div>
    </div>
  )
}
