'use client'
// app/admin/promo/page.tsx
import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { toast } from 'sonner'
import { Plus, Trash2, Tag, X, ToggleLeft, ToggleRight } from 'lucide-react'

const SUPABASE_URL = 'https://wpxpgszzzfhhsaunolyq.supabase.co'
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndweHBnc3p6emZoaHNhdW5vbHlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0Mzg5ODQsImV4cCI6MjA5NzAxNDk4NH0.8_DVpLNwItAlkn_gL9a4dn-lZ00I8iifX2Cb9N_W-4U'

type PromoCode = {
  id: string; code: string; discount_type: 'percent' | 'fixed'
  discount_value: number; min_order: number; max_uses: number | null
  used_count: number; valid_from: string; valid_until: string | null
  is_active: boolean; created_at: string
}

const defaultForm = {
  code: '', discount_type: 'percent' as const, discount_value: 10,
  min_order: 0, max_uses: '', valid_until: ''
}

export default function AdminPromoPage() {
  const [codes, setCodes] = useState<PromoCode[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(defaultForm)
  const [saving, setSaving] = useState(false)

  const supabase = createBrowserClient(SUPABASE_URL, SUPABASE_ANON)

  const load = async () => {
    const { data } = await supabase
      .from('promo_codes')
      .select('*')
      .order('created_at', { ascending: false })
    setCodes(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    const code = Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
    setForm(f => ({ ...f, code }))
  }

  const save = async () => {
    if (!form.code.trim()) { toast.error('Bitte Code eingeben'); return }
    if (form.discount_value <= 0) { toast.error('Rabatt muss größer als 0 sein'); return }
    if (form.discount_type === 'percent' && form.discount_value > 100) { toast.error('Prozent max. 100'); return }

    setSaving(true)
    const { error } = await supabase.from('promo_codes').insert({
      code: form.code.toUpperCase().trim(),
      discount_type: form.discount_type,
      discount_value: form.discount_value,
      min_order: form.min_order || 0,
      max_uses: form.max_uses ? parseInt(form.max_uses) : null,
      valid_until: form.valid_until || null,
      is_active: true,
    })
    setSaving(false)
    if (error) { toast.error(error.message.includes('unique') ? 'Code existiert bereits' : error.message); return }
    toast.success('Code erstellt ✓')
    setModal(false)
    setForm(defaultForm)
    load()
  }

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from('promo_codes').update({ is_active: !current }).eq('id', id)
    load()
  }

  const deleteCode = async (id: string) => {
    if (!confirm('Code wirklich löschen?')) return
    await supabase.from('promo_codes').delete().eq('id', id)
    toast.success('Code gelöscht')
    load()
  }

  const isExpired = (code: PromoCode) =>
    code.valid_until && new Date(code.valid_until) < new Date()
  const isExhausted = (code: PromoCode) =>
    code.max_uses !== null && code.used_count >= code.max_uses

  if (loading) return <div className="text-sm text-gray-400">Lädt...</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Aktionscodes</h1>
          <p className="text-sm text-gray-500 mt-1">{codes.length} Codes · {codes.filter(c => c.is_active).length} aktiv</p>
        </div>
        <button onClick={() => setModal(true)} className="btn-red px-4 py-2.5 text-sm">
          <Plus size={16} /> Neuer Code
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Aktive Codes', value: codes.filter(c => c.is_active && !isExpired(c) && !isExhausted(c)).length },
          { label: 'Gesamt verwendet', value: codes.reduce((a, c) => a + c.used_count, 0) },
          { label: 'Abgelaufen/Erschöpft', value: codes.filter(c => isExpired(c) || isExhausted(c)).length },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="text-2xl font-black text-gray-900">{s.value}</div>
            <div className="text-xs text-gray-400 mt-1 font-bold uppercase tracking-wide">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Codes table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {codes.length === 0 ? (
          <div className="p-14 text-center">
            <Tag size={32} className="text-gray-300 mx-auto mb-3" />
            <p className="font-bold text-gray-900 mb-1">Noch keine Codes</p>
            <p className="text-sm text-gray-400">Erstellen Sie Ihren ersten Aktionscode</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-5 py-3.5 font-black text-gray-500 text-xs uppercase tracking-wide">Code</th>
                <th className="text-left px-5 py-3.5 font-black text-gray-500 text-xs uppercase tracking-wide">Rabatt</th>
                <th className="text-left px-5 py-3.5 font-black text-gray-500 text-xs uppercase tracking-wide">Mindest.</th>
                <th className="text-left px-5 py-3.5 font-black text-gray-500 text-xs uppercase tracking-wide">Verwendet</th>
                <th className="text-left px-5 py-3.5 font-black text-gray-500 text-xs uppercase tracking-wide">Gültig bis</th>
                <th className="text-left px-5 py-3.5 font-black text-gray-500 text-xs uppercase tracking-wide">Status</th>
                <th className="px-5 py-3.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {codes.map(c => {
                const expired = isExpired(c)
                const exhausted = isExhausted(c)
                const statusLabel = expired ? 'Abgelaufen' : exhausted ? 'Erschöpft' : c.is_active ? 'Aktiv' : 'Inaktiv'
                const statusColor = expired || exhausted ? 'bg-red/10 text-red' : c.is_active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
                return (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-4">
                      <span className="font-black text-gray-900 bg-gray-100 px-2.5 py-1 rounded-lg text-xs tracking-widest">
                        {c.code}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-bold text-gray-900">
                      {c.discount_type === 'percent' ? `${c.discount_value}%` : `${c.discount_value.toFixed(2)} €`}
                    </td>
                    <td className="px-5 py-4 text-gray-500">
                      {c.min_order > 0 ? `ab ${c.min_order.toFixed(2)} €` : '—'}
                    </td>
                    <td className="px-5 py-4 text-gray-500">
                      {c.used_count}{c.max_uses ? ` / ${c.max_uses}` : ''}
                    </td>
                    <td className="px-5 py-4 text-gray-400 text-xs">
                      {c.valid_until ? new Date(c.valid_until).toLocaleDateString('de-DE') : '∞'}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${statusColor}`}>{statusLabel}</span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2 justify-end">
                        <button onClick={() => toggleActive(c.id, c.is_active)} title={c.is_active ? 'Deaktivieren' : 'Aktivieren'}>
                          {c.is_active
                            ? <ToggleRight size={20} className="text-green-600 hover:text-green-700" />
                            : <ToggleLeft size={20} className="text-gray-400 hover:text-gray-600" />}
                        </button>
                        <button onClick={() => deleteCode(c.id)} className="text-gray-300 hover:text-red transition-colors">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Create modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setModal(false)}>
          <div className="bg-white rounded-3xl p-8 max-w-md w-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-black text-xl text-gray-900">Neuer Aktionscode</h2>
              <button onClick={() => setModal(false)}><X size={20} className="text-gray-400" /></button>
            </div>

            <div className="flex flex-col gap-4">
              {/* Code */}
              <div>
                <label className="text-xs font-black text-gray-400 uppercase mb-2 block">Code</label>
                <div className="flex gap-2">
                  <input
                    value={form.code}
                    onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                    placeholder="z.B. SOMMER25"
                    className="flex-1 border-2 border-gray-100 rounded-xl px-4 py-3 text-sm outline-none focus:border-red transition-colors font-black tracking-widest uppercase"
                  />
                  <button onClick={generateCode} className="px-3 py-2 border-2 border-gray-100 rounded-xl text-xs font-bold text-gray-500 hover:border-red hover:text-red transition-all">
                    Zufällig
                  </button>
                </div>
              </div>

              {/* Type */}
              <div>
                <label className="text-xs font-black text-gray-400 uppercase mb-2 block">Rabatttyp</label>
                <div className="flex gap-2">
                  {[{ v: 'percent', l: 'Prozent (%)' }, { v: 'fixed', l: 'Festbetrag (€)' }].map(t => (
                    <button
                      key={t.v}
                      onClick={() => setForm(f => ({ ...f, discount_type: t.v as any }))}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-bold border-2 transition-all ${form.discount_type === t.v ? 'border-red bg-red/5 text-red' : 'border-gray-100 text-gray-500'}`}
                    >{t.l}</button>
                  ))}
                </div>
              </div>

              {/* Value */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-black text-gray-400 uppercase mb-2 block">
                    {form.discount_type === 'percent' ? 'Rabatt (%)' : 'Rabatt (€)'}
                  </label>
                  <input
                    type="number" min="1" max={form.discount_type === 'percent' ? 100 : undefined}
                    value={form.discount_value}
                    onChange={e => setForm(f => ({ ...f, discount_value: Number(e.target.value) }))}
                    className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 text-sm outline-none focus:border-red transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs font-black text-gray-400 uppercase mb-2 block">Mindestbestellwert (€)</label>
                  <input
                    type="number" min="0" step="0.01"
                    value={form.min_order}
                    onChange={e => setForm(f => ({ ...f, min_order: Number(e.target.value) }))}
                    className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 text-sm outline-none focus:border-red transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-black text-gray-400 uppercase mb-2 block">Max. Verwendungen</label>
                  <input
                    type="number" min="1" placeholder="Unbegrenzt"
                    value={form.max_uses}
                    onChange={e => setForm(f => ({ ...f, max_uses: e.target.value }))}
                    className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 text-sm outline-none focus:border-red transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs font-black text-gray-400 uppercase mb-2 block">Gültig bis</label>
                  <input
                    type="date"
                    value={form.valid_until}
                    onChange={e => setForm(f => ({ ...f, valid_until: e.target.value }))}
                    className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 text-sm outline-none focus:border-red transition-colors"
                  />
                </div>
              </div>

              {/* Preview */}
              {form.code && (
                <div className="bg-gray-50 rounded-2xl p-4">
                  <div className="text-xs text-gray-400 mb-1">Vorschau</div>
                  <div className="font-black text-gray-900">
                    Code <span className="bg-white px-2 py-0.5 rounded-lg text-red tracking-widest">{form.code}</span>{' '}
                    gibt {form.discount_type === 'percent' ? `${form.discount_value}% Rabatt` : `${form.discount_value.toFixed(2)} € Rabatt`}
                    {form.min_order > 0 ? ` ab ${form.min_order.toFixed(2)} €` : ''}
                    {form.valid_until ? ` bis ${new Date(form.valid_until).toLocaleDateString('de-DE')}` : ''}
                    {form.max_uses ? ` · max. ${form.max_uses}x` : ''}
                  </div>
                </div>
              )}

              <button onClick={save} disabled={saving} className="btn-red w-full py-3.5 mt-2">
                {saving ? 'Wird erstellt...' : 'Code erstellen ✓'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
