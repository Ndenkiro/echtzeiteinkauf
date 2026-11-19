'use client'
// app/preisvergleich/page.tsx — basket price comparator
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import {
  Search, Plus, Minus, Trash2, MapPin, Loader2, Check, AlertTriangle,
  ChevronDown, ChevronUp, ShoppingCart, Receipt, Store as StoreIcon,
  Globe, Info,
} from 'lucide-react'
import { toast } from 'sonner'
import { useCart } from '@/lib/cart-store'

// The build does not inline NEXT_PUBLIC_* in this project, so fall back to
// the literal values — same approach as app/admin/import-csv/page.tsx.
// The anon key is public by design; RLS is what protects the data.
const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://wpxpgszzzfhhsaunolyq.supabase.co'
const SUPABASE_ANON =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndweHBnc3p6emZoaHNhdW5vbHlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0Mzg5ODQsImV4cCI6MjA5NzAxNDk4NH0.8_DVpLNwItAlkn_gL9a4dn-lZ00I8iifX2Cb9N_W-4U'

type CatalogItem = {
  id: string
  name: string
  category: string
  emoji: string | null
  image_url: string | null
  base_qty: number | null
  base_unit: string | null
}

type Line = {
  catalog_item_id: string
  product_id: string
  product_name: string
  brand: string | null
  unit: string | null
  quantity: number
  unit_price: number
  line_total: number
  base_price: number | null
  base_unit: string | null
  price_source: string
  price_updated_at: string
}

type ChainResult = {
  chain: string
  store_id: string
  store_name: string
  city: string | null
  slug: string | null
  distance_km: number | null
  branches_in_range: number | null
  delivery_fee: number | null
  total: number
  total_with_delivery: number
  matched: number
  requested: number
  coverage_pct: number
  comparable: boolean
  oldest_price_at: string | null
  max_price_age_days: number | null
  sources: Record<string, number>
  items: Line[]
  missing: { catalog_item_id: string; name: string }[]
}

/** How a price was established — shown to the customer, never hidden */
const SOURCE_LABEL: Record<string, { label: string; icon: any }> = {
  merchant:    { label: 'Vom Händler',    icon: StoreIcon },
  api:         { label: 'Händler-Feed',   icon: StoreIcon },
  receipt:     { label: 'Vom Kassenbon',  icon: Receipt },
  open_prices: { label: 'Open Prices',    icon: Globe },
}

const euro = (n: number) => `${n.toFixed(2).replace('.', ',')} €`

const ageLabel = (days: number | null) => {
  if (days === null || days === undefined) return '—'
  if (days <= 0) return 'heute'
  if (days === 1) return 'gestern'
  if (days < 7)  return `vor ${days} Tagen`
  if (days < 14) return 'vor 1 Woche'
  return `vor ${Math.floor(days / 7)} Wochen`
}

export default function PreisvergleichPage() {
  // created once, not on every render
  const [supabase] = useState(() => createBrowserClient(SUPABASE_URL, SUPABASE_ANON))
  const router = useRouter()
  const cart = useCart()

  const [query, setQuery]         = useState('')
  const [hits, setHits]           = useState<CatalogItem[]>([])
  const [searching, setSearching] = useState(false)
  const [basket, setBasket]       = useState<{ item: CatalogItem; qty: number }[]>([])
  const [results, setResults]     = useState<ChainResult[] | null>(null)
  const [asOf, setAsOf]           = useState<string | null>(null)
  const [comparing, setComparing] = useState(false)
  const [expanded, setExpanded]   = useState<string | null>(null)
  const [coords, setCoords]       = useState<{ lat: number; lng: number } | null>(null)
  const [locating, setLocating]   = useState(false)
  const [adding, setAdding]       = useState<string | null>(null)
  const debounce = useRef<any>(null)

  // ── restore the basket between visits ──────────────────────────
  useEffect(() => {
    try {
      const raw = localStorage.getItem('ee_compare_basket')
      if (raw) setBasket(JSON.parse(raw))
      const loc = localStorage.getItem('ee_compare_coords')
      if (loc) setCoords(JSON.parse(loc))
    } catch { /* private mode, blocked storage — ignore */ }
  }, [])

  useEffect(() => {
    try { localStorage.setItem('ee_compare_basket', JSON.stringify(basket)) } catch {}
  }, [basket])

  // ── catalogue search ───────────────────────────────────────────
  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current)
    if (query.trim().length < 2) { setHits([]); return }
    debounce.current = setTimeout(async () => {
      setSearching(true)
      const { data, error } = await supabase
        .from('catalog_items')
        .select('id, name, category, emoji, image_url, base_qty, base_unit')
        .ilike('name', `%${query.trim()}%`)
        .eq('is_active', true)
        .order('name')
        .limit(25)
      if (error) toast.error('Suche fehlgeschlagen')
      setHits(data ?? [])
      setSearching(false)
    }, 250)
    return () => clearTimeout(debounce.current)
  }, [query])

  const add = (item: CatalogItem) => {
    setBasket(b => b.some(x => x.item.id === item.id)
      ? b.map(x => x.item.id === item.id ? { ...x, qty: x.qty + 1 } : x)
      : [...b, { item, qty: 1 }])
    setQuery(''); setHits([]); setResults(null)
  }

  const setQty = (id: string, qty: number) => {
    setBasket(b => qty <= 0 ? b.filter(x => x.item.id !== id)
                            : b.map(x => x.item.id === id ? { ...x, qty } : x))
    setResults(null)
  }

  // ── location (optional, keeps the comparison local) ────────────
  const locate = () => {
    if (!navigator.geolocation) { toast.error('Standort nicht verfügbar'); return }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      pos => {
        const c = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setCoords(c); setLocating(false); setResults(null)
        try { localStorage.setItem('ee_compare_coords', JSON.stringify(c)) } catch {}
        toast.success('Standort übernommen')
      },
      () => { setLocating(false); toast.error('Standort konnte nicht ermittelt werden') },
      { timeout: 8000 },
    )
  }

  // ── the comparison itself ──────────────────────────────────────
  const compare = useCallback(async () => {
    if (!basket.length) return
    setComparing(true); setExpanded(null)
    const { data, error } = await supabase.rpc('compare_basket', {
      p_items: basket.map(b => ({ catalog_item_id: b.item.id, quantity: b.qty })),
      p_lat: coords?.lat ?? null,
      p_lng: coords?.lng ?? null,
      p_radius_km: coords ? 30 : null,
      p_max_age_days: 30,
    })
    setComparing(false)
    if (error)      { toast.error(error.message); return }
    if (!data?.ok)  { toast.error('Vergleich nicht möglich'); return }
    setResults(data.chains as ChainResult[])
    setAsOf(data.as_of)
    if (!data.chains?.length) toast('Für diesen Korb liegen keine geprüften Preise vor', { icon: 'ℹ️' })
  }, [basket, coords])

  // ── hand the winning basket over to the normal order flow ──────
  const orderFrom = async (c: ChainResult) => {
    setAdding(c.chain)
    const ids = c.items.map(i => i.product_id)
    const { data: products, error } = await supabase
      .from('products').select('*').in('id', ids)
    setAdding(null)
    if (error || !products?.length) { toast.error('Produkte konnten nicht geladen werden'); return }

    cart.clearCart()
    cart.setStore(c.store_id, c.store_name, c.delivery_fee ?? undefined)
    for (const line of c.items) {
      const p = products.find((x: any) => x.id === line.product_id)
      if (!p) continue
      cart.addItem(p, c.store_id, c.store_name, c.delivery_fee ?? undefined)
      cart.setQty(p.id, line.quantity)
    }
    toast.success(`${c.items.length} Artikel aus ${c.chain} im Warenkorb`)
    router.push(c.slug ? `/markt/${c.slug}` : '/konto')
  }

  const complete   = (results ?? []).filter(r => r.comparable)
  const incomplete = (results ?? []).filter(r => !r.comparable)
  const best       = complete[0]
  const saving     = complete.length > 1 ? complete[complete.length - 1].total - complete[0].total : 0

  return (
    <main className="min-h-screen bg-gray-50">
      {/* ─── Header ─── */}
      {/* pt-16 clears the fixed 64px navbar, otherwise the title sits under it */}
      <div className="bg-white border-b border-gray-100 pt-16">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <h1 className="text-3xl font-black text-gray-900">Preisvergleich</h1>
          <p className="text-sm text-gray-500 mt-1.5 max-w-xl">
            Stellen Sie Ihren Einkauf zusammen — wir rechnen den Korb bei jeder
            Kette durch und liefern ihn Ihnen.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 grid lg:grid-cols-[380px_1fr] gap-8 items-start">

        {/* ═══ Left: the basket ═══ */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 lg:sticky lg:top-6">
          <div className="relative">
            <div className="flex items-center gap-2 border-2 border-gray-100 rounded-xl px-4 py-3 focus-within:border-red transition-colors">
              <Search size={16} className="text-gray-400 flex-shrink-0" />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Artikel suchen — z.B. Milch"
                className="flex-1 outline-none text-sm bg-transparent min-w-0"
              />
              {searching && <Loader2 size={14} className="animate-spin text-gray-300" />}
            </div>

            {hits.length > 0 && (
              <div className="absolute z-20 left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-xl max-h-80 overflow-y-auto">
                {hits.map(h => (
                  <button key={h.id} onClick={() => add(h)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-left border-b border-gray-50 last:border-0">
                    <span className="text-xl flex-shrink-0">{h.emoji || '🛒'}</span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-semibold text-gray-900 truncate">{h.name}</span>
                      <span className="block text-[11px] text-gray-400">{h.category}</span>
                    </span>
                    <Plus size={15} className="text-gray-300 flex-shrink-0" />
                  </button>
                ))}
              </div>
            )}
            {query.trim().length >= 2 && !searching && hits.length === 0 && (
              <p className="text-xs text-gray-400 mt-2 px-1">
                Nichts gefunden. Nur Artikel mit geprüften Preisen sind vergleichbar.
              </p>
            )}
          </div>

          {/* basket lines */}
          <div className="mt-5">
            {basket.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <div className="text-3xl mb-2">🧺</div>
                <p className="text-sm font-semibold">Ihr Korb ist leer</p>
                <p className="text-xs mt-1">Suchen Sie oben nach Artikeln.</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-wide">
                    {basket.length} {basket.length === 1 ? 'Artikel' : 'Artikel'}
                  </span>
                  <button onClick={() => { setBasket([]); setResults(null) }}
                    className="text-[11px] font-bold text-gray-400 hover:text-red transition-colors">
                    Leeren
                  </button>
                </div>

                <div className="space-y-1.5 max-h-[22rem] overflow-y-auto -mx-1 px-1">
                  {basket.map(({ item, qty }) => (
                    <div key={item.id} className="flex items-center gap-2.5 py-1.5">
                      <span className="text-lg flex-shrink-0">{item.emoji || '🛒'}</span>
                      <span className="flex-1 min-w-0 text-sm text-gray-900 leading-tight truncate">
                        {item.name}
                      </span>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button onClick={() => setQty(item.id, qty - 1)}
                          className="w-6 h-6 rounded-full border border-gray-200 hover:border-red hover:text-red flex items-center justify-center transition-colors">
                          {qty === 1 ? <Trash2 size={11} /> : <Minus size={11} />}
                        </button>
                        <span className="w-6 text-center text-sm font-black">{qty}</span>
                        <button onClick={() => setQty(item.id, qty + 1)}
                          className="w-6 h-6 rounded-full border border-gray-200 hover:border-red hover:text-red flex items-center justify-center transition-colors">
                          <Plus size={11} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <button onClick={locate} disabled={locating}
                  className={`w-full mt-4 flex items-center justify-center gap-2 border-2 rounded-xl py-2.5 text-xs font-bold transition-colors ${
                    coords ? 'border-green-200 bg-green-50 text-green-700'
                           : 'border-gray-100 text-gray-500 hover:border-gray-200'
                  }`}>
                  {locating ? <Loader2 size={13} className="animate-spin" /> : <MapPin size={13} />}
                  {coords ? 'Märkte in Ihrer Nähe' : 'Standort verwenden (optional)'}
                </button>

                <button onClick={compare} disabled={comparing || !basket.length}
                  className="w-full mt-2 bg-red hover:bg-red-dark text-white font-black rounded-xl py-3.5 text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                  {comparing
                    ? <><Loader2 size={16} className="animate-spin" /> Wird verglichen…</>
                    : <>Preise vergleichen</>}
                </button>
              </>
            )}
          </div>
        </div>

        {/* ═══ Right: the comparison ═══ */}
        <div>
          {!results && (
            <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
              <div className="text-4xl mb-3">⚖️</div>
              <h2 className="font-black text-gray-900">Noch kein Vergleich</h2>
              <p className="text-sm text-gray-500 mt-1.5 max-w-sm mx-auto">
                Legen Sie Artikel in den Korb. Wir vergleichen nur Ketten, die
                <strong className="text-gray-700"> jeden </strong>
                Artikel Ihres Korbes führen — sonst wäre der Preis nicht vergleichbar.
              </p>
            </div>
          )}

          {results && results.length === 0 && (
            <div className="bg-orange-light border-2 border-orange/30 rounded-2xl p-6">
              <div className="flex gap-3">
                <AlertTriangle size={20} className="text-orange-dark flex-shrink-0 mt-0.5" />
                <div>
                  <h2 className="font-black text-gray-900">Keine geprüften Preise</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Für diesen Korb liegen uns keine Preise vor, die jünger als
                    30 Tage und durch Händler oder Kassenbon belegt sind. Geschätzte
                    Preise nehmen wir bewusst nicht in den Vergleich auf.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* winner banner */}
          {best && complete.length > 1 && saving > 0 && (
            <div className="bg-gray-900 rounded-2xl p-5 mb-4 text-white flex items-center gap-4 flex-wrap">
              <div className="w-11 h-11 rounded-xl bg-orange flex items-center justify-center flex-shrink-0">
                <Check size={22} className="text-black" strokeWidth={3} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-black text-lg">{best.chain} ist am günstigsten</div>
                <div className="text-white/60 text-sm">
                  {euro(saving)} weniger als die teuerste vollständige Kette
                </div>
              </div>
            </div>
          )}

          {/* complete baskets */}
          <div className="space-y-3">
            {complete.map((c, i) => (
              <ChainCard key={c.chain} c={c} rank={i + 1} best={i === 0}
                expanded={expanded === c.chain}
                onToggle={() => setExpanded(expanded === c.chain ? null : c.chain)}
                onOrder={() => orderFrom(c)} busy={adding === c.chain} />
            ))}
          </div>

          {/* incomplete — deliberately separated, never ranked against the rest */}
          {incomplete.length > 0 && (
            <div className="mt-8">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle size={14} className="text-gray-400" />
                <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-wide">
                  Unvollständig — nicht vergleichbar
                </h3>
              </div>
              <p className="text-xs text-gray-500 mb-3 max-w-xl">
                Diesen Ketten fehlen Artikel aus Ihrem Korb, oder ihr Preis ist
                älter als 30 Tage. Ihre Summe steht nur zur Information und ist
                <strong> kein </strong> günstigerer Gesamtpreis.
              </p>
              <div className="space-y-3 opacity-75">
                {incomplete.map(c => (
                  <ChainCard key={c.chain} c={c} rank={null} best={false}
                    expanded={expanded === c.chain}
                    onToggle={() => setExpanded(expanded === c.chain ? null : c.chain)}
                    onOrder={() => orderFrom(c)} busy={adding === c.chain} />
                ))}
              </div>
            </div>
          )}

          {/* provenance footer — required, not decoration */}
          {results && results.length > 0 && (
            <div className="mt-6 bg-white rounded-2xl border border-gray-100 p-5">
              <div className="flex gap-3">
                <Info size={16} className="text-gray-400 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-gray-500 leading-relaxed space-y-1.5">
                  <p>
                    Stand: {asOf ? new Date(asOf).toLocaleString('de-DE') : '—'}.
                    Verglichen werden ausschließlich Preise, die von Händlern
                    gemeldet, aus Kassenbons erfasst oder aus Open Prices
                    übernommen wurden, und die nicht älter als 30 Tage sind.
                  </p>
                  <p>
                    Preise können sich seit der Erfassung geändert haben und je
                    nach Filiale abweichen. Maßgeblich ist der Preis an der Kasse.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}

/* ─────────────────────────────────────────────────────────────── */

function ChainCard({
  c, rank, best, expanded, onToggle, onOrder, busy,
}: {
  c: ChainResult; rank: number | null; best: boolean
  expanded: boolean; onToggle: () => void; onOrder: () => void; busy: boolean
}) {
  return (
    <div className={`bg-white rounded-2xl border-2 transition-colors ${
      best ? 'border-red' : 'border-gray-100'
    }`}>
      <div className="p-5">
        <div className="flex items-start gap-4 flex-wrap">
          {rank !== null && (
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm flex-shrink-0 ${
              best ? 'bg-red text-white' : 'bg-gray-100 text-gray-500'
            }`}>{rank}</div>
          )}

          <div className="flex-1 min-w-[10rem]">
            <div className="font-black text-gray-900 text-lg leading-tight">{c.chain}</div>
            <div className="text-xs text-gray-500 mt-0.5">
              {c.store_name}
              {c.distance_km !== null && <> · {String(c.distance_km).replace('.', ',')} km</>}
              {(c.branches_in_range ?? 0) > 1 && <> · {c.branches_in_range} Filialen</>}
            </div>
          </div>

          <div className="text-right">
            <div className="text-2xl font-black text-gray-900 leading-none">{euro(c.total)}</div>
            {c.delivery_fee != null && (
              <div className="text-[11px] text-gray-400 mt-1">
                mit Lieferung {euro(c.total_with_delivery)}
              </div>
            )}
          </div>
        </div>

        {/* coverage */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-[11px] mb-1.5">
            <span className={c.comparable ? 'font-bold text-green-700' : 'font-bold text-orange-dark'}>
              {c.comparable
                ? `Alle ${c.requested} Artikel verfügbar`
                : `${c.matched} von ${c.requested} Artikeln`}
            </span>
            <span className="text-gray-400">
              Preise {ageLabel(c.max_price_age_days)}
            </span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${c.comparable ? 'bg-green-500' : 'bg-orange'}`}
                 style={{ width: `${c.coverage_pct}%` }} />
          </div>
        </div>

        {/* provenance chips */}
        <div className="flex items-center gap-1.5 mt-3 flex-wrap">
          {Object.entries(c.sources).map(([src, n]) => {
            const meta = SOURCE_LABEL[src] ?? { label: src, icon: Info }
            const Icon = meta.icon
            return (
              <span key={src}
                className="inline-flex items-center gap-1 bg-gray-50 text-gray-500 text-[10px] font-bold px-2 py-1 rounded-full">
                <Icon size={10} /> {meta.label} · {n}
              </span>
            )
          })}
        </div>

        {!c.comparable && c.missing.length > 0 && (
          <p className="text-[11px] text-orange-dark mt-3 leading-relaxed">
            <strong>Fehlt:</strong> {c.missing.map(m => m.name).join(' · ')}
          </p>
        )}

        <div className="flex items-center gap-2 mt-4 flex-wrap">
          <button onClick={onOrder} disabled={busy}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-black transition-colors disabled:opacity-50 ${
              best ? 'bg-red text-white hover:bg-red-dark'
                   : 'border-2 border-gray-100 text-gray-700 hover:border-red hover:text-red'
            }`}>
            {busy ? <Loader2 size={14} className="animate-spin" /> : <ShoppingCart size={14} />}
            Bei {c.chain} bestellen
          </button>
          <button onClick={onToggle}
            className="flex items-center gap-1 text-xs font-bold text-gray-400 hover:text-gray-600 px-2 py-2.5">
            {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            {expanded ? 'Details ausblenden' : 'Einzelpreise'}
          </button>
        </div>
      </div>

      {/* per-item detail, with Grundpreis and provenance */}
      {expanded && (
        <div className="border-t border-gray-100 px-5 py-4 bg-gray-50/60 rounded-b-2xl">
          <table className="w-full text-xs">
            <tbody>
              {c.items.map(l => {
                const meta = SOURCE_LABEL[l.price_source] ?? { label: l.price_source, icon: Info }
                return (
                  <tr key={l.catalog_item_id} className="border-b border-gray-100 last:border-0">
                    <td className="py-2 pr-2">
                      <div className="font-semibold text-gray-900 leading-tight">{l.product_name}</div>
                      <div className="text-[10px] text-gray-400">
                        {l.brand && <>{l.brand} · </>}{l.unit}
                        {l.base_price != null && l.base_unit && (
                          <> · {euro(l.base_price)}/{l.base_unit}</>
                        )}
                      </div>
                    </td>
                    <td className="py-2 px-2 text-center text-gray-400 whitespace-nowrap">
                      {l.quantity > 1 && `${l.quantity} ×`}
                    </td>
                    <td className="py-2 px-2 text-right text-gray-500 whitespace-nowrap">
                      {euro(l.unit_price)}
                    </td>
                    <td className="py-2 pl-2 text-right font-black text-gray-900 whitespace-nowrap">
                      {euro(l.line_total)}
                    </td>
                    <td className="py-2 pl-3 text-right text-[10px] text-gray-400 whitespace-nowrap hidden sm:table-cell">
                      {meta.label}
                      <br />
                      {new Date(l.price_updated_at).toLocaleDateString('de-DE')}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
