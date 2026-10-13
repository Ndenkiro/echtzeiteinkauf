'use client'
// app/admin/import/page.tsx — import only products complete enough to show
import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import {
  Download, Loader2, Check, Search, Package, Euro,
  Image as ImageIcon, AlertCircle, RefreshCw, Trash2,
  FileText, Filter
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
  const [purging, setPurging] = useState(false)
  const [stats, setStats] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [scanned, setScanned] = useState(0)
  const [rejected, setRejected] = useState<any>(null)

  // Completeness filters
  const [requirePhoto, setRequirePhoto] = useState(true)
  const [requireDescription, setRequireDescription] = useState(false)
  const [onlyRealPrices, setOnlyRealPrices] = useState(false)

  const supabase = createBrowserClient(SUPABASE_URL, SUPABASE_ANON)

  const loadStores = async () => {
    const { data } = await supabase
      .from('stores').select('id, name, slug, category, city')
      .eq('is_active', true).order('name')
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
    setRejected(null)
    try {
      const res = await fetch('/api/admin/import-products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chain, page: p, pageSize: 40, withPrices: true,
          requirePhoto, requireDescription, onlyRealPrices,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      setProducts(data.products)
      setTotal(data.total)
      setScanned(data.scanned)
      setRejected(data.rejected)
      setPage(p)
      setSelected(new Set(data.products.map((x: any) => x.ean)))

      if (data.products.length === 0) {
        toast.error('Keine vollständigen Produkte gefunden — Filter lockern')
      }
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
      p_store_id: storeId, p_products: chosen,
    })
    setImporting(false)

    if (error || !data?.ok) {
      toast.error(data?.reason === 'not_admin' ? 'Keine Berechtigung' : 'Import fehlgeschlagen')
      return
    }
    toast.success(
      data.skipped > 0
        ? `${data.imported} importiert · ${data.skipped} übersprungen`
        : `${data.imported} Produkte importiert ✓`
    )
    loadStats()
  }

  const purge = async () => {
    if (!confirm('Unvollständige importierte Produkte aus diesem Markt löschen?')) return
    setPurging(true)
    const { data, error } = await supabase.rpc('purge_incomplete_products', {
      p_store_id: storeId || null,
    })
    setPurging(false)
    if (error || !data?.ok) { toast.error('Bereinigung fehlgeschlagen'); return }
    toast.success(`${data.deleted} unvollständige Produkte entfernt`)
    loadStats()
  }

  const withDesc = products.filter(p => p.description).length
  const withRealPrice = products.filter(p => p.price_source === 'openprices').length
  const totalRejected = rejected
    ? Object.values(rejected).reduce((a: any, b: any) => a + b, 0) as number
    : 0

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-black text-gray-900">Produktkatalog importieren</h1>
        <p className="text-sm text-gray-500 mt-1">
          Nur Produkte mit Foto, Einheit und Preis — unvollständige werden verworfen
        </p>
      </div>

      <div className="bg-blue-50 rounded-2xl p-4 mb-6 flex gap-3">
        <AlertCircle size={18} className="text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-blue-900 leading-relaxed">
          <strong>Datenquelle:</strong> Open Food Facts (ODbL) liefert Namen, Marken, EAN,
          Originalfotos und Nährwerte. Preise kommen aus Open Prices — ohne echten Preis
          wird ein Richtwert geschätzt, der später durch Kassenbons ersetzt wird.
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-6">
        <div className="grid sm:grid-cols-2 gap-4 mb-5">
          <div>
            <label className="text-xs font-black text-gray-400 uppercase tracking-wide mb-2 block">
              Kette bei Open Food Facts
            </label>
            <select value={chain} onChange={e => setChain(e.target.value)}
              className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 text-sm outline-none focus:border-red transition-colors bg-white">
              {CHAINS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-black text-gray-400 uppercase tracking-wide mb-2 block">
              Ziel-Markt
            </label>
            <select value={storeId} onChange={e => setStoreId(e.target.value)}
              className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 text-sm outline-none focus:border-red transition-colors bg-white">
              {stores.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name}{s.city ? ` — ${s.city}` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Completeness filters */}
        <div className="border-t border-gray-50 pt-4 mb-4">
          <div className="flex items-center gap-1.5 mb-3">
            <Filter size={13} className="text-gray-400" />
            <span className="text-xs font-black text-gray-400 uppercase tracking-wide">
              Nur anzeigen wenn vorhanden
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { on: requirePhoto,       set: setRequirePhoto,       label: 'Foto',          icon: ImageIcon },
              { on: requireDescription, set: setRequireDescription, label: 'Beschreibung',  icon: FileText },
              { on: onlyRealPrices,     set: setOnlyRealPrices,     label: 'Echter Preis',  icon: Euro },
            ].map(f => {
              const Icon = f.icon
              return (
                <button key={f.label} onClick={() => f.set(!f.on)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold border-2 transition-all ${
                    f.on ? 'border-red bg-red/5 text-red' : 'border-gray-100 text-gray-400 hover:border-gray-200'
                  }`}>
                  <span className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                    f.on ? 'bg-red border-red' : 'border-gray-200'
                  }`}>
                    {f.on && <Check size={10} className="text-white" strokeWidth={3} />}
                  </span>
                  <Icon size={13} /> {f.label}
                </button>
              )
            })}
          </div>
          {onlyRealPrices && (
            <p className="text-[11px] text-orange-600 mt-2">
              Echte Preise sind selten — rechnen Sie mit deutlich weniger Treffern.
            </p>
          )}
        </div>

        <button onClick={() => fetchProducts(1)} disabled={loading}
          className="btn-red px-5 py-3 text-sm">
          {loading ? <><Loader2 size={16} className="animate-spin" /> Wird geladen…</>
                   : <><Search size={16} /> Produkte suchen</>}
        </button>
      </div>

      {/* Rejected summary */}
      {rejected && totalRejected > 0 && (
        <div className="bg-gray-50 rounded-2xl p-4 mb-4">
          <div className="text-xs font-black text-gray-500 uppercase tracking-wide mb-2">
            Von {scanned} geprüften Produkten verworfen
          </div>
          <div className="flex flex-wrap gap-3 text-xs text-gray-500">
            {rejected.noPhoto > 0 && <span>🖼 {rejected.noPhoto} ohne Foto</span>}
            {rejected.noUnit  > 0 && <span>📦 {rejected.noUnit} ohne Einheit</span>}
            {rejected.noName  > 0 && <span>🏷 {rejected.noName} ohne Namen</span>}
            {rejected.noDesc  > 0 && <span>📝 {rejected.noDesc} ohne Beschreibung</span>}
            {rejected.noPrice > 0 && <span>💶 {rejected.noPrice} ohne echten Preis</span>}
          </div>
        </div>
      )}

      {/* Results */}
      {products.length > 0 && (
        <>
          <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
            <div className="flex gap-4 text-xs flex-wrap">
              <span className="text-gray-500">
                <strong className="text-gray-900">{products.length}</strong> vollständig
                {total > 0 && ` · ${total} in der Datenbank`}
              </span>
              <span className="flex items-center gap-1 text-gray-500">
                <FileText size={12} /> <strong className="text-gray-900">{withDesc}</strong> mit Beschreibung
              </span>
              <span className="flex items-center gap-1 text-green-600">
                <Euro size={12} /> <strong>{withRealPrice}</strong> echte Preise
              </span>
              <span className="text-red font-bold">{selected.size} ausgewählt</span>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setSelected(new Set(products.map(p => p.ean)))}
                className="text-xs font-bold text-gray-500 border border-gray-200 rounded-lg px-3 py-1.5 hover:border-gray-300">
                Alle
              </button>
              <button onClick={() => setSelected(new Set())}
                className="text-xs font-bold text-gray-500 border border-gray-200 rounded-lg px-3 py-1.5 hover:border-gray-300">
                Keine
              </button>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
            {products.map(p => {
              const on = selected.has(p.ean)
              return (
                <button key={p.ean} onClick={() => toggle(p.ean)}
                  className={`flex gap-3 p-3 rounded-2xl border-2 text-left transition-all ${
                    on ? 'border-red bg-red/[0.03]' : 'border-gray-100 hover:border-gray-200'
                  }`}>
                  <div className="w-16 h-16 rounded-xl bg-white border border-gray-50 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    <img src={p.image_small_url || p.image_url} alt=""
                      className="w-full h-full object-contain" loading="lazy" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm text-gray-900 line-clamp-2 leading-tight">
                      {p.name}
                    </div>
                    <div className="text-[11px] text-gray-400 mt-0.5 truncate">
                      {p.brand && `${p.brand} · `}{p.unit}
                    </div>
                    {p.description && (
                      <div className="text-[10px] text-gray-400 mt-1 line-clamp-1 italic">
                        {p.description}
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="font-black text-sm text-gray-900">
                        {Number(p.price).toFixed(2)} €
                      </span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                        p.price_source === 'openprices'
                          ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-400'
                      }`}>
                        {p.price_source === 'openprices' ? 'ECHT' : 'GESCHÄTZT'}
                      </span>
                      {p.nutriscore && (
                        <span className={`w-4 h-4 rounded text-[9px] font-black text-white flex items-center justify-center ${
                          p.nutriscore === 'a' ? 'bg-green-600'
                          : p.nutriscore === 'b' ? 'bg-lime-500'
                          : p.nutriscore === 'c' ? 'bg-yellow-500'
                          : p.nutriscore === 'd' ? 'bg-orange-500' : 'bg-red-600'
                        }`}>
                          {p.nutriscore.toUpperCase()}
                        </span>
                      )}
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
              {importing ? <><Loader2 size={16} className="animate-spin" /> Import läuft…</>
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
      <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
        <h2 className="font-black text-sm text-gray-900 uppercase tracking-wide">
          Katalog-Übersicht
        </h2>
        <div className="flex gap-2">
          <button onClick={purge} disabled={purging}
            className="flex items-center gap-1.5 text-xs font-bold text-gray-400 border border-gray-200 rounded-lg px-3 py-1.5 hover:border-red hover:text-red transition-all">
            {purging ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
            Unvollständige löschen
          </button>
          <button onClick={loadStats}
            className="flex items-center gap-1.5 text-xs font-bold text-gray-400 border border-gray-200 rounded-lg px-3 py-1.5 hover:border-gray-300">
            <RefreshCw size={12} /> Aktualisieren
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-x-auto">
        <table className="w-full text-sm min-w-[560px]">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-5 py-3 font-black text-gray-500 text-xs uppercase">Markt</th>
              <th className="text-right px-4 py-3 font-black text-gray-500 text-xs uppercase">Gesamt</th>
              <th className="text-right px-4 py-3 font-black text-gray-500 text-xs uppercase">Vollständig</th>
              <th className="text-right px-4 py-3 font-black text-gray-500 text-xs uppercase">Beschreibung</th>
              <th className="text-right px-4 py-3 font-black text-gray-500 text-xs uppercase">Echte Preise</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {stats.map((s: any) => {
              const pct = (n: number) => s.total > 0 ? Math.round((n / s.total) * 100) : 0
              return (
                <tr key={s.store_id} className="hover:bg-gray-50">
                  <td className="px-5 py-3">
                    <div className="font-bold text-gray-900">{s.store_name}</div>
                    <div className="text-[11px] text-gray-400">{s.category}</div>
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-gray-900">{s.total}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={pct(s.complete) > 90 ? 'text-green-600 font-bold' : 'text-orange-500 font-bold'}>
                      {pct(s.complete)}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-400">{pct(s.with_desc)}%</td>
                  <td className="px-4 py-3 text-right">
                    <span className={pct(s.real_price) > 30 ? 'text-green-600 font-bold' : 'text-gray-400'}>
                      {pct(s.real_price)}%
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-400 mt-4 leading-relaxed">
        Der Anteil echter Preise steigt automatisch, sobald Shopper Kassenbons hochladen.
      </p>
    </div>
  )
}
