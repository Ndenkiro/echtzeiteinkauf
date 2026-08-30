'use client'
// app/admin/import/page.tsx — preview and import a real product catalogue
import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import {
  Download, Loader2, Check, Search, Package, Euro,
  Image as ImageIcon, AlertCircle, RefreshCw, Store, X
} from 'lucide-react'
import { toast } from 'sonner'

const SUPABASE_URL = 'https://wpxpgszzzfhhsaunolyq.supabase.co'
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndweHBnc3p6emZoaHNhdW5vbHlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0Mzg5ODQsImV4cCI6MjA5NzAxNDk4NH0.8_DVpLNwItAlkn_gL9a4dn-lZ00I8iifX2Cb9N_W-4U'

const CHAINS = ['Lidl', 'Aldi', 'Rewe', 'Edeka', 'Penny', 'Kaufland', 'Netto', 'Norma', 'dm', 'Rossmann']

export default function ImportPage() {
  const [stores, setStores] = useState<any[]>([])
  const [storeId, setStoreId] = useState('')
  const [chain, setChain] = useState('Lidl')
  const [page, setPage] = useState(1)
  const [products, setProducts] = useState<any[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [stats, setStats] = useState<any[]>([])
  const [total, setTotal] = useState(0)

  const supabase = createBrowserClient(SUPABASE_URL, SUPABASE_ANON)

  const loadStores = async () => {
    const { data } = await supabase
      .from('stores').select('id, name, slug, category').eq('is_active', true).order('name')
    setStores(data || [])
    if (data?.length && !storeId) setStoreId(data[0].id)
  }

  const loadStats = async () => {
    const { data } = await supabase.rpc('get_catalog_stats')
    setStats(data || [])
  }

  useEffect(() => { loadStores(); loadStats() }, [])

  const fetchProducts = async (p = 1) => {
    setLoading(true)
    setProducts([])
    try {
      const res = await fetch('/api/admin/import-products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chain, page: p, pageSize: 40, withPrices: true }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setProducts(data.products)
      setTotal(data.total)
      setPage(p)
      // Pre-select everything that has a photo
      setSelected(new Set(
        data.products.filter((x: any) => x.image_url).map((x: any) => x.ean)
      ))
      if (data.products.length === 0) toast.error('Keine Produkte gefunden')
    } catch (e: any) {
      toast.error(e.message)
    }
    setLoading(false)
  }

  const toggle = (ean: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(ean) ? next.delete(ean) : next.add(ean)
      return next
    })
  }

  const doImport = async () => {
    if (!storeId) { toast.error('Bitte Markt wählen'); return }
    const chosen = products.filter(p => selected.has(p.ean))
    if (!chosen.length) { toast.error('Keine Produkte ausgewählt'); return }

    setImporting(true)
    const { data, error } = await supabase.rpc('import_products', {
      p_store_id: storeId,
      p_products: chosen,
    })
    setImporting(false)

    if (error || !data?.ok) {
      toast.error(data?.reason === 'not_admin' ? 'Keine Berechtigung' : 'Import fehlgeschlagen')
      return
    }
    toast.success(`${data.imported} Produkte importiert ✓`)
    loadStats()
  }

  const withImage = products.filter(p => p.image_url).length
  const withRealPrice = products.filter(p => p.price_source === 'openprices').length

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-black text-gray-900">Produktkatalog importieren</h1>
        <p className="text-sm text-gray-500 mt-1">
          Echte Produkte mit Originalfotos aus der Open-Food-Facts-Datenbank
        </p>
      </div>

      {/* Source note */}
      <div className="bg-blue-50 rounded-2xl p-4 mb-6 flex gap-3">
        <AlertCircle size={18} className="text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-blue-900 leading-relaxed">
          <strong>Datenquelle:</strong> Open Food Facts (frei lizenziert, ODbL) liefert Produktnamen,
          Marken, EAN und Originalfotos der Verpackungen. Preise stammen aus Open Prices —
          wo keiner vorliegt, wird ein Richtwert geschätzt und später durch echte Kassenbons ersetzt.
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-6">
        <div className="grid sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-xs font-black text-gray-400 uppercase tracking-wide mb-2 block">
              Kette bei Open Food Facts
            </label>
            <select
              value={chain}
              onChange={e => setChain(e.target.value)}
              className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 text-sm outline-none focus:border-red transition-colors bg-white"
            >
              {CHAINS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs font-black text-gray-400 uppercase tracking-wide mb-2 block">
              Ziel-Markt in Ihrem Katalog
            </label>
            <select
              value={storeId}
              onChange={e => setStoreId(e.target.value)}
              className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 text-sm outline-none focus:border-red transition-colors bg-white"
            >
              {stores.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.category})</option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={() => fetchProducts(1)}
          disabled={loading}
          className="btn-red px-5 py-3 text-sm"
        >
          {loading
            ? <><Loader2 size={16} className="animate-spin" /> Wird geladen…</>
            : <><Search size={16} /> Produkte suchen</>}
        </button>
      </div>

      {/* Results */}
      {products.length > 0 && (
        <>
          <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
            <div className="flex gap-4 text-xs">
              <span className="text-gray-500">
                <strong className="text-gray-900">{products.length}</strong> gefunden
                {total > products.length && ` von ${total}`}
              </span>
              <span className="flex items-center gap-1 text-gray-500">
                <ImageIcon size={12} /> <strong className="text-gray-900">{withImage}</strong> mit Foto
              </span>
              <span className="flex items-center gap-1 text-green-600">
                <Euro size={12} /> <strong>{withRealPrice}</strong> echte Preise
              </span>
              <span className="text-red font-bold">{selected.size} ausgewählt</span>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setSelected(new Set(products.map(p => p.ean)))}
                className="text-xs font-bold text-gray-500 border border-gray-200 rounded-lg px-3 py-1.5 hover:border-gray-300"
              >Alle</button>
              <button
                onClick={() => setSelected(new Set())}
                className="text-xs font-bold text-gray-500 border border-gray-200 rounded-lg px-3 py-1.5 hover:border-gray-300"
              >Keine</button>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
            {products.map(p => {
              const on = selected.has(p.ean)
              return (
                <button
                  key={p.ean}
                  onClick={() => toggle(p.ean)}
                  className={`flex gap-3 p-3 rounded-2xl border-2 text-left transition-all ${
                    on ? 'border-red bg-red/[0.03]' : 'border-gray-100 hover:border-gray-200'
                  }`}
                >
                  <div className="w-16 h-16 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {p.image_small_url || p.image_url ? (
                      <img src={p.image_small_url || p.image_url} alt=""
                        className="w-full h-full object-contain" loading="lazy" />
                    ) : (
                      <Package size={20} className="text-gray-300" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm text-gray-900 line-clamp-2 leading-tight">
                      {p.name}
                    </div>
                    <div className="text-[11px] text-gray-400 mt-0.5 truncate">
                      {p.brand && `${p.brand} · `}{p.unit}
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="font-black text-sm text-gray-900">
                        {Number(p.price).toFixed(2)} €
                      </span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                        p.price_source === 'openprices'
                          ? 'bg-green-50 text-green-700'
                          : 'bg-gray-100 text-gray-400'
                      }`}>
                        {p.price_source === 'openprices' ? 'ECHT' : 'GESCHÄTZT'}
                      </span>
                    </div>
                  </div>

                  <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 ${
                    on ? 'bg-red border-red' : 'border-gray-200'
                  }`}>
                    {on && <Check size={12} className="text-white" strokeWidth={3} />}
                  </div>
                </button>
              )
            })}
          </div>

          <div className="flex items-center gap-3 flex-wrap mb-8">
            <button onClick={doImport} disabled={importing || selected.size === 0}
              className="btn-red px-6 py-3 text-sm">
              {importing
                ? <><Loader2 size={16} className="animate-spin" /> Import läuft…</>
                : <><Download size={16} /> {selected.size} Produkte importieren</>}
            </button>

            <div className="flex gap-2">
              <button onClick={() => fetchProducts(page - 1)} disabled={page <= 1 || loading}
                className="text-xs font-bold text-gray-500 border border-gray-200 rounded-lg px-3 py-2 hover:border-gray-300 disabled:opacity-40">
                ← Zurück
              </button>
              <span className="text-xs text-gray-400 py-2">Seite {page}</span>
              <button onClick={() => fetchProducts(page + 1)} disabled={loading}
                className="text-xs font-bold text-gray-500 border border-gray-200 rounded-lg px-3 py-2 hover:border-gray-300 disabled:opacity-40">
                Weiter →
              </button>
            </div>
          </div>
        </>
      )}

      {/* Catalogue health */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-black text-sm text-gray-900 uppercase tracking-wide">
          Katalog-Übersicht
        </h2>
        <button onClick={loadStats}
          className="flex items-center gap-1.5 text-xs font-bold text-gray-400 hover:text-gray-600">
          <RefreshCw size={12} /> Aktualisieren
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-5 py-3 font-black text-gray-500 text-xs uppercase">Markt</th>
              <th className="text-right px-4 py-3 font-black text-gray-500 text-xs uppercase">Produkte</th>
              <th className="text-right px-4 py-3 font-black text-gray-500 text-xs uppercase">Mit Foto</th>
              <th className="text-right px-4 py-3 font-black text-gray-500 text-xs uppercase">Echte Preise</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {stats.map((s: any) => {
              const imgPct = s.total > 0 ? Math.round((s.with_image / s.total) * 100) : 0
              const pricePct = s.total > 0 ? Math.round((s.real_price / s.total) * 100) : 0
              return (
                <tr key={s.store_id} className="hover:bg-gray-50">
                  <td className="px-5 py-3">
                    <div className="font-bold text-gray-900">{s.store_name}</div>
                    <div className="text-[11px] text-gray-400">{s.category}</div>
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-gray-900">{s.total}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={imgPct > 70 ? 'text-green-600 font-bold' : 'text-gray-400'}>
                      {imgPct}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={pricePct > 30 ? 'text-green-600 font-bold' : 'text-orange-500'}>
                      {pricePct}%
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-400 mt-4 leading-relaxed">
        Der Anteil echter Preise steigt automatisch, sobald Shopper Kassenbons hochladen —
        jeder Bon ist eine Preisbeobachtung für diesen Markt.
      </p>
    </div>
  )
}
