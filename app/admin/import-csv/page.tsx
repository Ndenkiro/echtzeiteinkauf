'use client'
// app/admin/import-csv/page.tsx — import a partner product file
import { useRef, useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import Papa from 'papaparse'
import {
  Upload, Loader2, Check, X, AlertCircle, Download,
  Euro, Eye, ArrowRight
} from 'lucide-react'
import { toast } from 'sonner'

const SUPABASE_URL = 'https://wpxpgszzzfhhsaunolyq.supabase.co'
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndweHBnc3p6emZoaHNhdW5vbHlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0Mzg5ODQsImV4cCI6MjA5NzAxNDk4NH0.8_DVpLNwItAlkn_gL9a4dn-lZ00I8iifX2Cb9N_W-4U'

const SHELVES = [
  'Obst & Gemüse','Brot & Gebäck','Milch & Eier','Fleisch & Fisch',
  'Grundnahrung','Getränke','Süßes & Snacks','Tiefkühl','Drogerie',
  'Haushalt','Elektronik','Werkzeug','Mode','Garten','Spielzeug','Sonstiges',
]

/** Exact category names used by German retailers → our shelves */
const EXACT_SHELF: Record<string, string> = {
  // Getränke
  'kaffee ganze bohnen': 'Getränke', 'kaffee gemahlen / instant': 'Getränke',
  'kaffeekapseln': 'Getränke', 'kaffeepads': 'Getränke', 'filter': 'Getränke',
  'tee in beutel & lose': 'Getränke', 'cappuccino-kakao': 'Getränke',
  'exklusiv: coffeeb': 'Getränke', 'getraenke': 'Getränke',

  // Milch & Eier
  'milch, sahne, -alternativen': 'Milch & Eier', 'käse & -cremes': 'Milch & Eier',
  'margarine & butterschmalz': 'Milch & Eier', 'pudding-dessert': 'Milch & Eier',
  'milchprodukte': 'Milch & Eier', 'kaese': 'Milch & Eier',

  // Brot & Gebäck
  'brot-brötchen': 'Brot & Gebäck', 'knäckebrot-zwieback-waffeln': 'Brot & Gebäck',
  'fertige kuchen': 'Brot & Gebäck', 'brot backwaren': 'Brot & Gebäck',

  // Obst & Gemüse
  'obst gemuese': 'Obst & Gemüse', 'obst & gemüse': 'Obst & Gemüse',
  'obst': 'Obst & Gemüse', 'gemuese': 'Obst & Gemüse', 'salate': 'Obst & Gemüse',

  // Fleisch & Fisch
  'wurst & schinken': 'Fleisch & Fisch', 'fleisch fisch': 'Fleisch & Fisch',
  'fleisch': 'Fleisch & Fisch', 'fisch': 'Fleisch & Fisch',

  // Süßes & Snacks
  'tafelschokolade': 'Süßes & Snacks', 'schoko-leckereien': 'Süßes & Snacks',
  'schokoriegel': 'Süßes & Snacks', 'bonbons & kaugummi': 'Süßes & Snacks',
  'fruchtgummi & lakritz': 'Süßes & Snacks', 'chips & knabbereien': 'Süßes & Snacks',
  'gebäck-kekse-waffeln': 'Süßes & Snacks', 'nüsse & getrocknete früchte': 'Süßes & Snacks',
  'nüsse & mehr': 'Süßes & Snacks', 'müsli- & fruchtriegel': 'Süßes & Snacks',
  'suessigkeiten': 'Süßes & Snacks', 'snacks': 'Süßes & Snacks',

  // Grundnahrung
  'backmischungen': 'Grundnahrung', 'backzutaten & dekor': 'Grundnahrung',
  'mehl-backpulver-hefe': 'Grundnahrung', 'zucker & zuckerersatz': 'Grundnahrung',
  'müsli-cerealien': 'Grundnahrung', 'konfitüre & fruchtaufstriche': 'Grundnahrung',
  'nuss- & schokocreme': 'Grundnahrung', 'streichcreme-aufstrich': 'Grundnahrung',
  'honig': 'Grundnahrung', 'öle': 'Grundnahrung', 'essig': 'Grundnahrung',
  'brühen': 'Grundnahrung', 'gewürze-kräuter': 'Grundnahrung',
  'feinwürzmittel': 'Grundnahrung', 'salatkräuter': 'Grundnahrung',
  'aromen-vanille': 'Grundnahrung', 'geliermittel-sahnefest': 'Grundnahrung',
  'kuvertüre-glasur': 'Grundnahrung', 'grundnahrung': 'Grundnahrung',
  'nudeln reis': 'Grundnahrung', 'konserven': 'Grundnahrung',

  // Tiefkühl / Drogerie
  'tiefkuehl': 'Tiefkühl', 'tiefkühlkost': 'Tiefkühl',
  'drogerie': 'Drogerie', 'haushalt': 'Haushalt',
}

/** Fallback: guess from German words in the hint or title */
const QUERY_SHELF: { words: string[]; shelf: string }[] = [
  { words: ['milch','käse','joghurt','quark','butter','sahne','eier','pudding','margarine'], shelf: 'Milch & Eier' },
  { words: ['brot','brötchen','toast','backwaren','knäcke','zwieback','kuchen'], shelf: 'Brot & Gebäck' },
  { words: ['obst','gemüse','gemuese','äpfel','banane','tomate','gurke','kartoffel','salat','zwiebel','paprika','möhre','karotte'], shelf: 'Obst & Gemüse' },
  { words: ['fleisch','hähnchen','rind','schwein','wurst','schinken','fisch','salami','lachs'], shelf: 'Fleisch & Fisch' },
  { words: ['nudel','pasta','reis','mehl','zucker','salz','öl','essig','sauce','soße','gewürz','müsli','honig','marmelade','konfitüre','brühe','backen'], shelf: 'Grundnahrung' },
  { words: ['wasser','saft','limonade','kaffee','tee','getränk','cola','bier','wein','kakao'], shelf: 'Getränke' },
  { words: ['schokolade','süßigkeit','snack','chips','keks','bonbon','gummi','riegel','nuss','eis','praline'], shelf: 'Süßes & Snacks' },
  { words: ['tiefkühl','pizza','gefrier'], shelf: 'Tiefkühl' },
  { words: ['shampoo','zahnpasta','körperpflege','windel','baby','waschmittel','spülmittel','reinigung','hygiene'], shelf: 'Drogerie' },
  { words: ['küche','haushalt','aufbewahrung','dekoration','möbel','lampen','textilien'], shelf: 'Haushalt' },
  { words: ['elektronik','computer','handy','uhren','silvercrest'], shelf: 'Elektronik' },
  { words: ['werkzeug','parkside','auto','fahrrad'], shelf: 'Werkzeug' },
  { words: ['kleidung','damen','herren','schuhe','sport','koffer','esmara','crivit'], shelf: 'Mode' },
  { words: ['garten','pflanzen','grillen','camping'], shelf: 'Garten' },
  { words: ['spielzeug'], shelf: 'Spielzeug' },
]

function guessShelf(hint: string, title: string): string {
  const exact = EXACT_SHELF[hint.toLowerCase().trim()]
  if (exact) return exact
  const h = `${hint} ${title}`.toLowerCase()
  for (const r of QUERY_SHELF) {
    if (r.words.some(w => h.includes(w))) return r.shelf
  }
  return 'Sonstiges'
}

/** Pull the real selling price out of a German price string */
function parsePrice(raw: string): { price: number | null; original: number | null } {
  if (!raw) return { price: null, original: null }
  const s = String(raw).trim()
  if (!s) return { price: null, original: null }

  // Current price is the number followed by *
  const m = s.match(/(\d+[.,]\d{2})\s*\*/)
  const price = m ? Number(m[1].replace(',', '.')) : null
  // Strikethrough price
  const m2 = s.match(/(?:vorher|UVP|statt):\s*(\d+[.,]\d{2})/i)
  const original = m2 ? Number(m2[1].replace(',', '.')) : null

  if (price === null) {
    const m3 = s.match(/(\d+[.,]\d{2})/)
    return { price: m3 ? Number(m3[1].replace(',', '.')) : null, original }
  }
  return { price, original }
}

/** A stable id per product, from its URL */
function extractId(url: string): string | null {
  if (!url) return null
  const m = url.match(/\/p(\d{6,})/)          // Lidl style
  if (m) return m[1]
  const m2 = url.match(/\/(\d{5,})(?:\?|$)/)  // Rewe style: …/483303
  if (m2) return m2[1]
  const seg = url.split('?')[0].split('/').filter(Boolean).pop()
  return seg ? seg.replace(/\.html?$/i, '').slice(0, 120) : null
}

const FIELDS = [
  { key: 'name',        label: 'Produktname',  required: true },
  { key: 'image_url',   label: 'Bild-URL',     required: false },
  { key: 'emoji',       label: 'Emoji',        required: false },
  { key: 'ean',         label: 'EAN',          required: false },
  { key: 'price',       label: 'Preis',        required: false },
  { key: 'brand',       label: 'Marke',        required: false },
  { key: 'category',    label: 'Kategorie',    required: false },
  { key: 'unit',        label: 'Einheit',      required: false },
  { key: 'description', label: 'Beschreibung', required: false },
  { key: 'product_url', label: 'Produkt-Link', required: false },
]

const AUTO: Record<string, string[]> = {
  name:        ['title','name','produktname','artikelbezeichnung','bezeichnung','product_name'],
  price:       ['price','preis','vk','verkaufspreis'],
  image_url:   ['image_url','image','bild','bild_url','bildurl','picture'],
  brand:       ['brand','marke','hersteller'],
  category:    ['category','kategorie','warengruppe','search_query','rubrik'],
  unit:        ['unit','einheit','inhalt','menge','gebinde'],
  description: ['description','beschreibung','text','langtext'],
  product_url: ['product_url','url','link','produkt_url'],
  emoji:       ['emoji','icon','symbol'],
  ean:         ['ean','gtin','barcode','artikelnummer'],
}

export default function ImportCsvPage() {
  const [stores, setStores] = useState<any[]>([])
  const [storeId, setStoreId] = useState('')
  const [rows, setRows] = useState<any[]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [fileName, setFileName] = useState('')
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [preview, setPreview] = useState(false)
  const [allowNoPrice, setAllowNoPrice] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const supabase = createBrowserClient(SUPABASE_URL, SUPABASE_ANON)

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('stores').select('id, name, city, category')
        .eq('is_active', true).order('name')
      setStores(data || [])
      if (data?.length) setStoreId(data[0].id)
    })()
  }, [])

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    setResult(null)

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      encoding: 'utf-8',
      complete: (res: any) => {
        const data = res.data as any[]
        if (!data.length) { toast.error('Datei ist leer'); return }

        const cols = Object.keys(data[0]).map(c => c.replace(/^\ufeff/, '').trim())
        setHeaders(cols)
        setRows(data)

        const guess: Record<string, string> = {}
        for (const [field, candidates] of Object.entries(AUTO)) {
          const found =
            cols.find(c => candidates.some(cd => c.toLowerCase().trim() === cd)) ??
            cols.find(c => candidates.some(cd => c.toLowerCase().includes(cd)))
          if (found) guess[field] = found
        }
        setMapping(guess)

        // If the price column is empty throughout, suggest importing anyway
        const priceCol = guess.price
        if (priceCol) {
          const anyPrice = data.some(r => String(r[priceCol] ?? '').trim())
          if (!anyPrice) {
            setAllowNoPrice(true)
            toast(`${data.length} Zeilen gelesen — keine Preise gefunden`, { icon: 'ℹ️' })
            return
          }
        }
        toast.success(`${data.length} Zeilen gelesen`)
      },
      error: () => toast.error('Datei konnte nicht gelesen werden'),
    })
  }

  const buildProducts = () => {
    const get = (row: any, field: string) => {
      const col = mapping[field]
      if (!col) return ''
      return String(row[col] ?? row['\ufeff' + col] ?? '').trim()
    }

    return rows.map(row => {
      const title = get(row, 'name')
      const { price, original } = parsePrice(get(row, 'price'))
      const imageUrl = get(row, 'image_url')
      const productUrl = get(row, 'product_url')
      const catHint = get(row, 'category')

      return {
        name: title,
        brand: get(row, 'brand') || null,
        category: SHELVES.includes(catHint) ? catHint : guessShelf(catHint, title),
        unit: get(row, 'unit') || '1 Stück',
        price,
        price_original: original,
        image_url: imageUrl || null,
        emoji: get(row, 'emoji') || null,
        ean: get(row, 'ean') || null,
        product_url: productUrl || null,
        external_id: extractId(productUrl),
        description: get(row, 'description') || null,
      }
    }).filter(p =>
      p.name && (p.image_url || p.emoji) && (allowNoPrice || (p.price && p.price > 0))
    )
  }

  const doImport = async () => {
    if (!storeId) { toast.error('Bitte Markt wählen'); return }
    for (const f of FIELDS.filter(f => f.required)) {
      if (!mapping[f.key]) { toast.error(`Spalte für "${f.label}" fehlt`); return }
    }

    const products = buildProducts()
    if (!products.length) { toast.error('Keine gültigen Zeilen gefunden'); return }

    setImporting(true)
    let inserted = 0, updated = 0, skipped = 0, noPrice = 0
    try {
      for (let i = 0; i < products.length; i += 100) {
        const chunk = products.slice(i, i + 100)
        const { data, error } = await supabase.rpc('import_feed_products', {
          p_store_id: storeId, p_products: chunk, p_allow_no_price: allowNoPrice,
        })
        if (error) throw error
        if (!data?.ok) throw new Error(data?.reason || 'Fehler')
        inserted += data.inserted
        updated  += data.updated
        skipped  += data.skipped
        noPrice  += data.without_price ?? 0
      }
      setResult({ inserted, updated, skipped, noPrice, total: products.length })
      toast.success(`${inserted} neu · ${updated} aktualisiert`)
    } catch (e: any) {
      toast.error(e.message || 'Import fehlgeschlagen')
    }
    setImporting(false)
  }

  const products = rows.length > 0 && mapping.name ? buildProducts() : []
  const dropped = rows.length - products.length
  const withoutPrice = products.filter(p => !p.price).length

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-black text-gray-900">Partner-Datei importieren</h1>
        <p className="text-sm text-gray-500 mt-1">
          CSV-Export eines Lieferanten — Spalten werden automatisch erkannt
        </p>
      </div>

      {/* Upload */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-6">
        <div className="grid sm:grid-cols-2 gap-4 mb-5">
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
          <div>
            <label className="text-xs font-black text-gray-400 uppercase tracking-wide mb-2 block">
              Datei
            </label>
            <input ref={fileRef} type="file" accept=".csv,text/csv"
              className="hidden" onChange={onFile} />
            <button onClick={() => fileRef.current?.click()}
              className="w-full flex items-center gap-2 border-2 border-gray-100 rounded-xl px-4 py-3 text-sm hover:border-red transition-colors">
              <Upload size={16} className="text-gray-400 flex-shrink-0" />
              <span className="truncate text-gray-600">
                {fileName || 'CSV-Datei wählen…'}
              </span>
            </button>
          </div>
        </div>

        <div className="border-t border-gray-50 pt-4 mb-3">
          <button onClick={() => setAllowNoPrice(v => !v)}
            className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold border-2 transition-all ${
              allowNoPrice ? 'border-orange bg-orange/5 text-orange-dark'
                           : 'border-gray-100 text-gray-400 hover:border-gray-200'
            }`}>
            <span className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
              allowNoPrice ? 'bg-orange border-orange' : 'border-gray-200'
            }`}>
              {allowNoPrice && <Check size={10} className="text-black" strokeWidth={3} />}
            </span>
            Produkte ohne Preis übernehmen
          </button>
          {allowNoPrice && (
            <p className="text-[11px] text-orange-600 mt-2 leading-relaxed">
              Diese Produkte bleiben für Kunden unsichtbar, bis Sie unter „Preise"
              einen Preis eintragen.
            </p>
          )}
        </div>

        <p className="text-[11px] text-gray-400">
          Excel-Dateien zuerst als CSV speichern (Datei → Speichern unter → CSV UTF-8).
        </p>
      </div>

      {/* Mapping */}
      {headers.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-6">
          <h2 className="font-black text-gray-900 mb-1">Spalten zuordnen</h2>
          <p className="text-xs text-gray-400 mb-5">
            {rows.length} Zeilen · {headers.length} Spalten gefunden
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            {FIELDS.map(f => (
              <div key={f.key}>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-wide mb-1.5 block">
                  {f.label}
                  {f.required && <span className="text-red ml-1">*</span>}
                </label>
                <select
                  value={mapping[f.key] || ''}
                  onChange={e => setMapping(m => ({ ...m, [f.key]: e.target.value }))}
                  className={`w-full border-2 rounded-xl px-3 py-2.5 text-sm outline-none transition-colors bg-white ${
                    f.required && !mapping[f.key]
                      ? 'border-red/40 focus:border-red'
                      : 'border-gray-100 focus:border-red'
                  }`}>
                  <option value="">— keine —</option>
                  {headers.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Preview */}
      {products.length > 0 && (
        <>
          <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
            <div className="flex gap-4 text-xs flex-wrap">
              <span className="text-gray-500">
                <strong className="text-gray-900">{products.length}</strong> importierbar
              </span>
              {dropped > 0 && (
                <span className="text-orange-600">{dropped} verworfen</span>
              )}
              {withoutPrice > 0 && (
                <span className="text-orange-600">{withoutPrice} ohne Preis</span>
              )}
            </div>
            <button onClick={() => setPreview(v => !v)}
              className="flex items-center gap-1.5 text-xs font-bold text-gray-500 border border-gray-200 rounded-lg px-3 py-1.5 hover:border-gray-300">
              <Eye size={12} /> {preview ? 'Vorschau ausblenden' : 'Vorschau'}
            </button>
          </div>

          {preview && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
              {products.slice(0, 12).map((p, i) => (
                <div key={i} className="flex gap-3 p-3 rounded-2xl border border-gray-100 bg-white">
                  <div className="w-16 h-16 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {p.image_url ? (
                      <img src={p.image_url} alt="" loading="lazy"
                        className="w-full h-full object-contain"
                        onError={e => { (e.target as HTMLImageElement).style.opacity = '0.2' }} />
                    ) : (
                      <span className="text-3xl">{p.emoji || '🛒'}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm text-gray-900 line-clamp-2 leading-tight">
                      {p.name}
                    </div>
                    <div className="text-[11px] text-gray-400 truncate">
                      {p.brand && `${p.brand} · `}{p.category}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      {p.price ? (
                        <>
                          <span className="font-black text-sm text-gray-900">
                            {p.price.toFixed(2)} €
                          </span>
                          {p.price_original && (
                            <span className="text-[11px] text-gray-400 line-through">
                              {p.price_original.toFixed(2)} €
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">
                          OHNE PREIS
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <button onClick={doImport} disabled={importing}
            className="btn-red px-6 py-3.5 text-sm mb-8">
            {importing
              ? <><Loader2 size={16} className="animate-spin" /> Import läuft…</>
              : <><Download size={16} /> {products.length} Produkte importieren</>}
          </button>
        </>
      )}

      {/* Result */}
      {result && (
        <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-5 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0">
              <Check size={18} className="text-green-600" />
            </div>
            <div>
              <div className="font-black text-gray-900">Import abgeschlossen</div>
              <div className="text-xs text-gray-500">
                aus {result.total} verarbeiteten Zeilen
              </div>
            </div>
          </div>

          <div className={`grid gap-3 ${result.noPrice > 0 ? 'grid-cols-4' : 'grid-cols-3'}`}>
            {[
              { label: 'Neu',          value: result.inserted, color: 'text-green-600' },
              { label: 'Aktualisiert', value: result.updated,  color: 'text-blue-600' },
              { label: 'Übersprungen', value: result.skipped,  color: 'text-gray-400' },
              ...(result.noPrice > 0
                ? [{ label: 'Ohne Preis', value: result.noPrice, color: 'text-orange-500' }]
                : []),
            ].map(s => (
              <div key={s.label} className="bg-white rounded-xl p-3 text-center">
                <div className={`text-xl font-black ${s.color}`}>{s.value}</div>
                <div className="text-[10px] font-bold text-gray-400 uppercase">{s.label}</div>
              </div>
            ))}
          </div>

          {result.noPrice > 0 && (
            <a href="/preise"
              className="flex items-center justify-center gap-2 bg-orange text-black font-black rounded-xl py-3 text-sm mt-4 hover:bg-orange-dark hover:text-white transition-colors">
              <Euro size={15} /> {result.noPrice} Preise jetzt nachtragen
              <ArrowRight size={15} />
            </a>
          )}
        </div>
      )}

      {/* Format help */}
      <div className="bg-gray-50 rounded-2xl p-5">
        <h3 className="font-black text-sm text-gray-900 mb-3">Erwartetes Format</h3>
        <div className="text-xs text-gray-500 leading-relaxed space-y-2">
          <p>
            Pflichtspalte: <strong>Produktname</strong>, dazu ein <strong>Bild</strong> oder ein <strong>Emoji</strong>.
            Ein Preis ist empfohlen — fehlt er, aktivieren Sie oben die Option
            „Produkte ohne Preis übernehmen".
          </p>
          <p>
            Preise werden auch aus zusammengesetzten Angaben erkannt —{' '}
            <code className="bg-white px-1.5 py-0.5 rounded">vorher: 49.99 -20% 39.99*</code>{' '}
            ergibt 39,99 € Verkaufspreis und 49,99 € Streichpreis.
          </p>
          <p>
            Fehlt eine Kategorie-Spalte, wird das Regal aus Produktname und Suchbegriff
            abgeleitet.
          </p>
        </div>
      </div>
    </div>
  )
}
