'use client'
// app/haendler-portal/produkte/page.tsx — merchant manages their catalogue
import { useEffect, useRef, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import {
  Plus, Search, Package, Loader2, X, Camera, Trash2,
  Check, Euro, Pencil, EyeOff, Eye, Barcode, Sparkles
} from 'lucide-react'
import { toast } from 'sonner'
import { getCategory } from '@/lib/categories'

const SUPABASE_URL = 'https://wpxpgszzzfhhsaunolyq.supabase.co'
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndweHBnc3p6emZoaHNhdW5vbHlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0Mzg5ODQsImV4cCI6MjA5NzAxNDk4NH0.8_DVpLNwItAlkn_gL9a4dn-lZ00I8iifX2Cb9N_W-4U'

const SHELVES = [
  'Obst & Gemüse', 'Brot & Gebäck', 'Milch & Eier', 'Fleisch & Fisch',
  'Grundnahrung', 'Getränke', 'Süßes & Snacks', 'Tiefkühl', 'Drogerie', 'Sonstiges',
]

const EMPTY = {
  id: '', name: '', brand: '', category: 'Sonstiges', unit: '1 Stück',
  price: '', image_url: '', ean: '', emoji: '', in_stock: true,
  attributes: {} as Record<string, any>,
}

export default function ProduktePage() {
  const [ctx, setCtx] = useState<any>(null)
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [shelf, setShelf] = useState('all')
  const [editing, setEditing] = useState<typeof EMPTY | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [lookingUp, setLookingUp] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const supabase = createBrowserClient(SUPABASE_URL, SUPABASE_ANON)

  const load = async () => {
    const { data: c } = await supabase.rpc('get_my_merchant_context')
    const context = c?.[0]
    setCtx(context)
    if (context?.store_id) {
      const { data } = await supabase
        .from('products').select('*')
        .eq('store_id', context.store_id)
        .order('category').order('name')
      setProducts(data || [])
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const set = (k: string, v: any) =>
    setEditing(e => e ? { ...e, [k]: v } : e)

  // Fill the form from a barcode via Open Food Facts
  const lookupEan = async () => {
    if (!editing?.ean) { toast.error('Bitte EAN eingeben'); return }
    setLookingUp(true)
    try {
      const res = await fetch(`/api/admin/import-products?ean=${encodeURIComponent(editing.ean)}`)
      const data = await res.json()
      if (!res.ok || !data.ok) { toast.error('Produkt nicht gefunden'); setLookingUp(false); return }
      const p = data.product
      setEditing(e => e ? {
        ...e,
        name: p.name || e.name,
        brand: p.brand || e.brand,
        unit: p.unit || e.unit,
        category: p.category || e.category,
        image_url: p.image_url || e.image_url,
      } : e)
      toast.success('Daten übernommen')
    } catch { toast.error('Suche fehlgeschlagen') }
    setLookingUp(false)
  }

  const uploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !ctx?.store_id) return
    if (file.size > 5 * 1024 * 1024) { toast.error('Bild zu groß (max. 5 MB)'); return }

    setUploading(true)
    const ext = file.name.split('.').pop() || 'jpg'
    const path = `${ctx.store_id}/${Date.now()}.${ext}`
    const { error } = await supabase.storage
      .from('product-images').upload(path, file, { upsert: true })
    if (error) { setUploading(false); toast.error('Upload fehlgeschlagen'); return }

    const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(path)
    set('image_url', publicUrl)
    setUploading(false)
    toast.success('Foto hochgeladen')
  }

  const save = async () => {
    if (!editing) return
    if (!editing.name.trim()) { toast.error('Bitte Produktname angeben'); return }
    if (!editing.price || Number(editing.price) <= 0) { toast.error('Bitte gültigen Preis angeben'); return }

    setSaving(true)
    const { data, error } = await supabase.rpc('upsert_merchant_product', {
      p_data: { ...editing, store_id: ctx.store_id, price: String(editing.price) },
    })
    setSaving(false)

    if (error || !data?.ok) { toast.error('Speichern fehlgeschlagen'); return }
    toast.success(editing.id ? 'Produkt aktualisiert ✓' : 'Produkt angelegt ✓')
    setEditing(null)
    load()
  }

  const remove = async (id: string) => {
    if (!confirm('Produkt wirklich löschen?')) return
    const { data, error } = await supabase.rpc('delete_merchant_product', { p_product_id: id })
    if (error || !data?.ok) { toast.error('Löschen fehlgeschlagen'); return }
    toast.success('Produkt gelöscht')
    load()
  }

  const toggleStock = async (p: any) => {
    const { error } = await supabase
      .from('products').update({ in_stock: !p.in_stock }).eq('id', p.id)
    if (error) { toast.error('Fehler'); return }
    load()
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-4 border-orange border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!ctx?.store_id) return (
    <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-10 text-center max-w-lg">
      <Package size={32} className="text-white/20 mx-auto mb-4" />
      <h1 className="font-black text-xl text-white mb-2">Noch nicht freigeschaltet</h1>
      <p className="text-sm text-white/50">
        Sobald wir Ihren Antrag geprüft haben, können Sie hier Ihre Produkte anlegen.
      </p>
    </div>
  )

  const shelves = ['all', ...Array.from(new Set(products.map(p => p.category).filter(Boolean)))]
  const filtered = products.filter(p => {
    if (shelf !== 'all' && p.category !== shelf) return false
    if (search) {
      const q = search.toLowerCase()
      return p.name?.toLowerCase().includes(q) || p.brand?.toLowerCase().includes(q)
    }
    return true
  })
  const cat = getCategory(ctx.category)

  return (
    <div>
      <div className="flex items-start justify-between gap-3 mb-6 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-white">Produkte</h1>
          <p className="text-sm text-white/40 mt-1">
            {products.length} im Sortiment · {products.filter(p => p.in_stock).length} verfügbar
          </p>
        </div>
        <button onClick={() => setEditing({ ...EMPTY })}
          className="flex items-center gap-2 bg-orange text-black font-black rounded-xl px-4 py-2.5 text-sm hover:bg-orange-dark hover:text-white transition-colors">
          <Plus size={16} /> Produkt anlegen
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 bg-white/[0.05] border border-white/10 rounded-2xl px-4 py-3 mb-3 focus-within:border-orange transition-colors">
        <Search size={16} className="text-white/30 flex-shrink-0" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Produkt suchen…"
          className="flex-1 outline-none text-sm bg-transparent text-white placeholder-white/25" />
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {shelves.map(s => (
          <button key={s} onClick={() => setShelf(s)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex-shrink-0 ${
              shelf === s ? 'bg-orange text-black'
                          : 'bg-white/[0.05] border border-white/10 text-white/50 hover:border-white/25'
            }`}>
            {s === 'all' ? 'Alle' : s}
          </button>
        ))}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-12 text-center">
          <Package size={32} className="text-white/20 mx-auto mb-3" />
          <p className="font-bold text-white mb-1">
            {products.length === 0 ? 'Noch keine Produkte' : 'Nichts gefunden'}
          </p>
          {products.length === 0 && (
            <p className="text-sm text-white/40 mb-5">
              Legen Sie Ihr erstes Produkt an, damit Kunden bei Ihnen bestellen können.
            </p>
          )}
          {products.length === 0 && (
            <button onClick={() => setEditing({ ...EMPTY })}
              className="inline-flex items-center gap-2 bg-orange text-black font-black rounded-xl px-5 py-2.5 text-sm hover:bg-orange-dark hover:text-white transition-colors">
              <Plus size={15} /> Erstes Produkt anlegen
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map(p => (
            <div key={p.id}
              className={`flex items-center gap-3 bg-white/[0.04] border rounded-2xl p-3 transition-all ${
                p.in_stock ? 'border-white/10' : 'border-white/[0.06] opacity-50'
              }`}>
              <div className="w-14 h-14 rounded-xl bg-white/[0.06] flex items-center justify-center flex-shrink-0 overflow-hidden">
                {p.image_url
                  ? <img src={p.image_url} alt="" className="w-full h-full object-contain" />
                  : <span className="text-2xl">{p.emoji || '🛒'}</span>}
              </div>

              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm text-white truncate">{p.name}</div>
                <div className="text-[11px] text-white/40 truncate">
                  {p.brand && `${p.brand} · `}{p.unit} · {p.category}
                </div>
              </div>

              <div className="text-right flex-shrink-0">
                <div className="font-black text-white">{Number(p.price).toFixed(2)} €</div>
              </div>

              <div className="flex gap-1 flex-shrink-0">
                <button onClick={() => toggleStock(p)}
                  title={p.in_stock ? 'Ausblenden' : 'Anzeigen'}
                  className="w-8 h-8 rounded-lg border border-white/10 flex items-center justify-center text-white/40 hover:border-orange hover:text-orange transition-all">
                  {p.in_stock ? <Eye size={14} /> : <EyeOff size={14} />}
                </button>
                <button onClick={() => setEditing({
                    id: p.id, name: p.name, brand: p.brand || '', category: p.category,
                    unit: p.unit, price: String(p.price), image_url: p.image_url || '',
                    ean: p.ean || '', emoji: p.emoji || '', in_stock: p.in_stock,
                    attributes: p.attributes || {},
                  })}
                  className="w-8 h-8 rounded-lg border border-white/10 flex items-center justify-center text-white/40 hover:border-orange hover:text-orange transition-all">
                  <Pencil size={14} />
                </button>
                <button onClick={() => remove(p.id)}
                  className="w-8 h-8 rounded-lg border border-white/10 flex items-center justify-center text-white/40 hover:border-red-500 hover:text-red-400 transition-all">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Editor */}
      {editing && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center sm:justify-center p-0 sm:p-4">
          <div className="w-full sm:max-w-lg bg-[#141414] border border-white/10 rounded-t-3xl sm:rounded-3xl max-h-[92vh] overflow-y-auto">
            <div className="sticky top-0 bg-[#141414] px-5 py-4 border-b border-white/10 flex items-center justify-between">
              <h2 className="font-black text-white">
                {editing.id ? 'Produkt bearbeiten' : 'Neues Produkt'}
              </h2>
              <button onClick={() => setEditing(null)}>
                <X size={20} className="text-white/40 hover:text-white" />
              </button>
            </div>

            <div className="p-5 flex flex-col gap-4">
              {/* Photo */}
              <div>
                <label className="text-[10px] font-black text-white/40 uppercase tracking-wide mb-2 block">
                  Produktfoto
                </label>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={uploadPhoto} />
                {editing.image_url ? (
                  <div className="relative">
                    <img src={editing.image_url} alt=""
                      className="w-full h-44 object-contain bg-white/[0.04] rounded-2xl" />
                    <button onClick={() => set('image_url', '')}
                      className="absolute top-2 right-2 w-8 h-8 bg-black/70 text-white rounded-full flex items-center justify-center">
                      <X size={15} />
                    </button>
                  </div>
                ) : (
                  <button onClick={() => fileRef.current?.click()} disabled={uploading}
                    className="w-full border-2 border-dashed border-white/15 rounded-2xl py-10 flex flex-col items-center gap-2 hover:border-orange transition-colors">
                    {uploading
                      ? <Loader2 size={24} className="animate-spin text-orange" />
                      : <Camera size={24} className="text-white/30" />}
                    <span className="text-xs font-bold text-white/50">
                      {uploading ? 'Wird hochgeladen…' : 'Foto hochladen'}
                    </span>
                  </button>
                )}
              </div>

              {/* EAN lookup */}
              <div>
                <label className="text-[10px] font-black text-white/40 uppercase tracking-wide mb-1.5 block">
                  EAN / Barcode <span className="font-normal normal-case">(optional)</span>
                </label>
                <div className="flex gap-2">
                  <div className="flex-1 flex items-center gap-2 bg-white/[0.06] border border-white/10 rounded-xl px-3 py-2.5 focus-within:border-orange transition-colors">
                    <Barcode size={15} className="text-white/30 flex-shrink-0" />
                    <input value={editing.ean} onChange={e => set('ean', e.target.value)}
                      placeholder="4001234567890"
                      className="flex-1 outline-none text-sm bg-transparent text-white placeholder-white/25" />
                  </div>
                  <button onClick={lookupEan} disabled={lookingUp || !editing.ean}
                    className="px-4 border border-orange/30 text-orange rounded-xl text-xs font-bold hover:bg-orange/10 transition-all disabled:opacity-40 flex items-center gap-1.5">
                    {lookingUp ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                    Laden
                  </button>
                </div>
                <p className="text-[10px] text-white/30 mt-1.5">
                  Mit der EAN füllen wir Name, Marke und Foto automatisch aus.
                </p>
              </div>

              <MField label="Produktname *" value={editing.name} onChange={v => set('name', v)}
                placeholder="Bio-Äpfel Elstar" />

              <div className="grid grid-cols-2 gap-3">
                <MField label="Marke" value={editing.brand} onChange={v => set('brand', v)} />
                <MField label="Einheit *" value={editing.unit} onChange={v => set('unit', v)}
                  placeholder="1 kg, 500 g, 1 Stück" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black text-white/40 uppercase tracking-wide mb-1.5 block">
                    Preis *
                  </label>
                  <div className="flex items-center gap-2 bg-white/[0.06] border border-white/10 rounded-xl px-3 py-2.5 focus-within:border-orange transition-colors">
                    <Euro size={15} className="text-white/30 flex-shrink-0" />
                    <input type="number" step="0.01" min="0" value={editing.price}
                      onChange={e => set('price', e.target.value)} placeholder="0.00"
                      className="flex-1 outline-none text-sm bg-transparent text-white placeholder-white/25" />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black text-white/40 uppercase tracking-wide mb-1.5 block">
                    Regal *
                  </label>
                  <select value={editing.category} onChange={e => set('category', e.target.value)}
                    className="w-full bg-white/[0.06] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-orange transition-colors">
                    {SHELVES.map(s => (
                      <option key={s} value={s} className="bg-[#1a1a1a]">{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Category-specific attributes */}
              {cat.attributeFields.length > 0 && (
                <div className="border-t border-white/[0.06] pt-4">
                  <label className="text-[10px] font-black text-white/40 uppercase tracking-wide mb-2 block">
                    Zusatzangaben
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {cat.attributeFields.map(f => {
                      const val = editing.attributes[f.key]
                      if (f.type === 'boolean') return (
                        <button key={f.key}
                          onClick={() => set('attributes', { ...editing.attributes, [f.key]: !val })}
                          className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold border transition-all ${
                            val ? 'border-orange bg-orange/10 text-orange'
                                : 'border-white/10 bg-white/[0.06] text-white/50'
                          }`}>
                          <span className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                            val ? 'bg-orange border-orange' : 'border-white/25'
                          }`}>
                            {val && <Check size={10} className="text-black" strokeWidth={3} />}
                          </span>
                          {f.label}
                        </button>
                      )
                      if (f.type === 'select') return (
                        <div key={f.key}>
                          <label className="text-[10px] text-white/30 mb-1 block">{f.label}</label>
                          <select value={val || ''} 
                            onChange={e => set('attributes', { ...editing.attributes, [f.key]: e.target.value })}
                            className="w-full bg-white/[0.06] border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-orange">
                            <option value="" className="bg-[#1a1a1a]">—</option>
                            {f.options?.map(o => (
                              <option key={o} value={o} className="bg-[#1a1a1a]">{o}</option>
                            ))}
                          </select>
                        </div>
                      )
                      return (
                        <div key={f.key}>
                          <label className="text-[10px] text-white/30 mb-1 block">
                            {f.label}{f.unit && ` (${f.unit})`}
                          </label>
                          <input
                            type={f.type === 'number' ? 'number' : 'text'}
                            value={val || ''}
                            onChange={e => set('attributes', { ...editing.attributes, [f.key]: e.target.value })}
                            className="w-full bg-white/[0.06] border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-orange" />
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              <button onClick={save} disabled={saving}
                className="w-full bg-orange text-black font-black rounded-xl py-3.5 text-sm flex items-center justify-center gap-2 hover:bg-orange-dark hover:text-white transition-colors disabled:opacity-50 mt-2">
                {saving ? <><Loader2 size={16} className="animate-spin" /> Wird gespeichert…</>
                        : <><Check size={16} /> {editing.id ? 'Änderungen speichern' : 'Produkt anlegen'}</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function MField({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string
}) {
  return (
    <div>
      <label className="text-[10px] font-black text-white/40 uppercase tracking-wide mb-1.5 block">
        {label}
      </label>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full bg-white/[0.06] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/25 outline-none focus:border-orange transition-colors" />
    </div>
  )
}
