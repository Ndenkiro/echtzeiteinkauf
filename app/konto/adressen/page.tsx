'use client'
// app/konto/adressen/page.tsx
import { useEffect, useState } from 'react'
import { supabaseBrowser } from '@/lib/supabase'
import { toast } from 'sonner'
import { MapPin, Plus, Trash2, Star, X } from 'lucide-react'

type Address = {
  id: string; label: string; street: string; house_number: string | null
  zip_code: string; city: string; notes: string | null; is_default: boolean
}

export default function AdressenPage() {
  const supabase = supabaseBrowser()
  const [userId, setUserId] = useState<string | null>(null)
  const [addresses, setAddresses] = useState<Address[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({ label: 'Zuhause', street: '', house_number: '', zip_code: '', city: '', notes: '' })

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: profile } = await supabase.from('users').select('id').eq('auth_id', user.id).single()
    if (!profile) return
    setUserId(profile.id)
    const { data } = await supabase.from('user_addresses').select('*').eq('user_id', profile.id).order('is_default', { ascending: false })
    setAddresses(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const addAddress = async () => {
    if (!form.street || !form.zip_code || !form.city) { toast.error('Bitte Pflichtfelder ausfüllen'); return }
    const { error } = await supabase.from('user_addresses').insert({ ...form, user_id: userId, is_default: addresses.length === 0 })
    if (error) { toast.error('Fehler beim Speichern'); return }
    toast.success('Adresse hinzugefügt ✓')
    setModalOpen(false)
    setForm({ label: 'Zuhause', street: '', house_number: '', zip_code: '', city: '', notes: '' })
    load()
  }

  const deleteAddress = async (id: string) => {
    await supabase.from('user_addresses').delete().eq('id', id)
    toast.success('Adresse gelöscht')
    load()
  }

  const setDefault = async (id: string) => {
    await supabase.from('user_addresses').update({ is_default: false }).eq('user_id', userId)
    await supabase.from('user_addresses').update({ is_default: true }).eq('id', id)
    load()
  }

  if (loading) return <div className="text-sm text-gray-400">Lädt...</div>

  return (
    <div className="max-w-lg">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Meine Adressen</h1>
          <p className="text-sm text-gray-500 mt-1">Verwalten Sie Ihre Lieferadressen</p>
        </div>
        <button onClick={() => setModalOpen(true)} className="btn-red px-4 py-2.5 text-sm">
          <Plus size={16} /> Neu
        </button>
      </div>

      {addresses.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
          <MapPin size={32} className="text-gray-300 mx-auto mb-3" />
          <p className="font-bold text-gray-900 mb-1">Keine Adressen gespeichert</p>
          <p className="text-sm text-gray-400">Fügen Sie eine Adresse hinzu, um schneller zu bestellen</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {addresses.map(a => (
            <div key={a.id} className="bg-white rounded-2xl border border-gray-100 p-5 flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-red/10 flex items-center justify-center flex-shrink-0">
                <MapPin size={18} className="text-red" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-black text-sm text-gray-900">{a.label}</span>
                  {a.is_default && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-orange-light text-orange-dark">Standard</span>}
                </div>
                <div className="text-sm text-gray-600">{a.street} {a.house_number}</div>
                <div className="text-xs text-gray-400">{a.zip_code} {a.city}</div>
              </div>
              <div className="flex flex-col gap-1 flex-shrink-0">
                {!a.is_default && (
                  <button onClick={() => setDefault(a.id)} title="Als Standard festlegen" className="w-8 h-8 rounded-lg border border-gray-100 flex items-center justify-center hover:border-orange hover:text-orange-dark transition-all">
                    <Star size={14} />
                  </button>
                )}
                <button onClick={() => deleteAddress(a.id)} title="Löschen" className="w-8 h-8 rounded-lg border border-gray-100 flex items-center justify-center hover:border-red hover:text-red transition-all">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setModalOpen(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-black text-lg text-gray-900">Neue Adresse</h2>
              <button onClick={() => setModalOpen(false)}><X size={18} className="text-gray-400" /></button>
            </div>
            <div className="flex flex-col gap-3">
              <select value={form.label} onChange={e => setForm({...form, label: e.target.value})} className="input-field">
                <option>Zuhause</option><option>Arbeit</option><option>Sonstiges</option>
              </select>
              <input placeholder="Straße" value={form.street} onChange={e => setForm({...form, street: e.target.value})} className="input-field" />
              <input placeholder="Hausnummer" value={form.house_number} onChange={e => setForm({...form, house_number: e.target.value})} className="input-field" />
              <div className="grid grid-cols-2 gap-2">
                <input placeholder="PLZ" value={form.zip_code} onChange={e => setForm({...form, zip_code: e.target.value})} className="input-field" />
                <input placeholder="Stadt" value={form.city} onChange={e => setForm({...form, city: e.target.value})} className="input-field" />
              </div>
              <input placeholder="Hinweis (z.B. Klingel, Etage)" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} className="input-field" />
              <button onClick={addAddress} className="btn-red w-full py-3 mt-2">Adresse speichern</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
