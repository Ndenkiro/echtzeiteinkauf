'use client'
// app/admin/katalog/page.tsx — confirm product ↔ catalogue links
import { useState, useEffect, useCallback, useRef } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import {
  Loader2, Check, SkipForward, PlusCircle, RefreshCw,
  Link2, AlertTriangle, Keyboard,
} from 'lucide-react'
import { toast } from 'sonner'

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://wpxpgszzzfhhsaunolyq.supabase.co'
const SUPABASE_ANON =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndweHBnc3p6emZoaHNhdW5vbHlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0Mzg5ODQsImV4cCI6MjA5NzAxNDk4NH0.8_DVpLNwItAlkn_gL9a4dn-lZ00I8iifX2Cb9N_W-4U'

type Stat = {
  chain: string; store_id: string; store_name: string
  comparable: number; linked: number; skipped: number; open_items: number
}

type Candidate = {
  catalog_item_id: string
  name: string
  category: string | null
  emoji: string | null
  base_unit: string | null
  base_qty: number | null
  same_category: boolean
  score: number
}

type QueueItem = {
  product_id: string
  product_name: string
  brand: string | null
  unit: string | null
  price: number | null
  category: string | null
  emoji: string | null
  image_url: string | null
  best_score: number
  candidates: Candidate[]
}

const BANDS = [
  { key: 'near', label: 'Fast sicher',  min: 0.45, max: 0.60,
    hint: 'Gute Treffer, die der Automatik zu knapp waren' },
  { key: 'weak', label: 'Unsicher',     min: 0.00, max: 0.45,
    hint: 'Meist ohne passendes Gegenstück — hier neue Einträge anlegen' },
  { key: 'all',  label: 'Alle offenen', min: 0.00, max: 2.00,
    hint: 'Alles, was noch keine Zuordnung hat' },
]

const euro = (n: number | null) =>
  n == null ? '—' : `${n.toFixed(2).replace('.', ',')} €`

const scoreColor = (s: number) =>
  s >= 0.70 ? 'bg-green-50 text-green-700 border-green-200'
: s >= 0.55 ? 'bg-orange-light text-orange-dark border-orange/30'
            : 'bg-gray-50 text-gray-500 border-gray-200'

export default function AdminKatalogPage() {
  const [supabase] = useState(() => createBrowserClient(SUPABASE_URL, SUPABASE_ANON))

  const [stats, setStats]   = useState<Stat[]>([])
  const [storeId, setStore] = useState('')
  const [band, setBand]     = useState(BANDS[0])
  const [queue, setQueue]   = useState<QueueItem[]>([])
  const [loading, setLoad]  = useState(false)
  const [busy, setBusy]     = useState<string | null>(null)
  const [done, setDone]     = useState(0)
  const liveRef = useRef<HTMLDivElement>(null)

  // ── chains and progress ────────────────────────────────────────
  const loadStats = useCallback(async () => {
    const { data, error } = await supabase.rpc('catalog_link_stats')
    if (error) { toast.error(error.message); return }
    const rows = (data ?? []) as Stat[]
    setStats(rows)
    if (!storeId && rows.length) setStore(rows[0].store_id)
  }, [storeId])

  useEffect(() => { loadStats() }, [])

  // ── the queue ──────────────────────────────────────────────────
  const loadQueue = useCallback(async () => {
    if (!storeId) return
    setLoad(true)
    const { data, error } = await supabase.rpc('catalog_review_queue', {
      p_store_id: storeId,
      p_min_score: band.min,
      p_max_score: band.max,
      p_limit: 40,
      p_offset: 0,
    })
    setLoad(false)
    if (error) { toast.error(error.message); return }
    setQueue((data ?? []) as QueueItem[])
  }, [storeId, band])

  useEffect(() => { loadQueue() }, [storeId, band])

  const drop = (productId: string) => {
    setQueue(q => q.filter(x => x.product_id !== productId))
    setDone(d => d + 1)
  }

  // ── actions ────────────────────────────────────────────────────
  const link = async (item: QueueItem, c: Candidate) => {
    setBusy(item.product_id)
    const { data, error } = await supabase.rpc('set_catalog_link', {
      p_product_id: item.product_id,
      p_catalog_item_id: c.catalog_item_id,
    })
    setBusy(null)
    if (error || !data?.ok) { toast.error(error?.message || data?.reason || 'Fehler'); return }
    drop(item.product_id)
  }

  const createNew = async (item: QueueItem) => {
    setBusy(item.product_id)
    const { data, error } = await supabase.rpc('create_catalog_item_from_product', {
      p_product_id: item.product_id,
    })
    setBusy(null)
    if (error || !data?.ok) { toast.error(error?.message || data?.reason || 'Fehler'); return }
    toast.success(`Neuer Katalog-Eintrag: ${data.name}`, { duration: 1800 })
    drop(item.product_id)
  }

  const skip = async (item: QueueItem) => {
    setBusy(item.product_id)
    const { data, error } = await supabase.rpc('skip_catalog_product', {
      p_product_id: item.product_id, p_skip: true,
    })
    setBusy(null)
    if (error || !data?.ok) { toast.error(error?.message || data?.reason || 'Fehler'); return }
    drop(item.product_id)
  }

  // ── keyboard: 1/2/3 pick a candidate, N new entry, S skip ──────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return
      const head = queue[0]
      if (!head || busy) return

      if (e.key === '1' || e.key === '2' || e.key === '3') {
        const c = head.candidates[Number(e.key) - 1]
        if (c) { e.preventDefault(); link(head, c) }
      } else if (e.key.toLowerCase() === 'n') {
        e.preventDefault(); createNew(head)
      } else if (e.key.toLowerCase() === 's') {
        e.preventDefault(); skip(head)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [queue, busy])

  const current = stats.find(s => s.store_id === storeId)

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Katalog-Zuordnung</h1>
          <p className="text-sm text-gray-500 mt-1 max-w-2xl">
            Jede Bestätigung macht ein Produkt vergleichbar. Nur Produkte mit
            geprüftem Preis stehen hier — alles andere ändert am Vergleich nichts.
          </p>
        </div>
        <button onClick={() => { loadStats(); loadQueue() }}
          className="flex items-center gap-2 border-2 border-gray-100 rounded-xl px-3.5 py-2.5 text-xs font-bold text-gray-500 hover:border-gray-200">
          <RefreshCw size={13} /> Neu laden
        </button>
      </div>

      {/* chains */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {stats.map(s => {
          const active = s.store_id === storeId
          const pct = s.comparable > 0 ? Math.round(s.linked * 100 / s.comparable) : 0
          return (
            <button key={s.store_id} onClick={() => { setStore(s.store_id); setDone(0) }}
              className={`text-left rounded-2xl border-2 p-4 transition-colors ${
                active ? 'border-red bg-red-lighter' : 'border-gray-100 bg-white hover:border-gray-200'
              }`}>
              <div className="font-black text-gray-900">{s.chain}</div>
              <div className="text-[11px] text-gray-400 truncate">{s.store_name}</div>
              <div className="mt-2.5 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-green-500 rounded-full" style={{ width: `${pct}%` }} />
              </div>
              <div className="flex items-center justify-between text-[11px] mt-1.5">
                <span className="font-bold text-gray-600">{s.linked} zugeordnet</span>
                <span className="text-orange-dark font-bold">{s.open_items} offen</span>
              </div>
            </button>
          )
        })}
      </div>

      {/* band + shortcuts */}
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div className="flex gap-2 flex-wrap">
          {BANDS.map(b => (
            <button key={b.key} onClick={() => { setBand(b); setDone(0) }}
              className={`px-4 py-2 rounded-full text-xs font-bold border-2 transition-colors ${
                band.key === b.key ? 'bg-gray-900 text-white border-gray-900'
                                   : 'border-gray-100 text-gray-500 hover:border-gray-200'
              }`}>
              {b.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
          <Keyboard size={13} />
          <span><kbd className="font-black text-gray-600">1</kbd>…<kbd className="font-black text-gray-600">3</kbd> zuordnen</span>
          <span>· <kbd className="font-black text-gray-600">N</kbd> neu</span>
          <span>· <kbd className="font-black text-gray-600">S</kbd> überspringen</span>
        </div>
      </div>

      <p className="text-xs text-gray-400 mb-4">{band.hint}</p>

      {done > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-2.5 mb-4 text-xs font-bold text-green-700">
          {done} in dieser Sitzung bearbeitet
        </div>
      )}

      {/* queue */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-400">
          <Loader2 size={22} className="animate-spin" />
        </div>
      ) : queue.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
          <div className="text-4xl mb-3">✓</div>
          <h2 className="font-black text-gray-900">Nichts mehr in diesem Bereich</h2>
          <p className="text-sm text-gray-500 mt-1">
            Wechseln Sie die Kette oben oder den Bereich darüber.
          </p>
        </div>
      ) : (
        <div className="space-y-3" ref={liveRef}>
          {queue.map((item, idx) => (
            <div key={item.product_id}
              className={`bg-white rounded-2xl border-2 p-4 transition-colors ${
                idx === 0 ? 'border-gray-900' : 'border-gray-100'
              }`}>
              <div className="grid lg:grid-cols-[1fr_1.3fr] gap-5">

                {/* the product */}
                <div className="flex gap-3">
                  <div className="w-14 h-14 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {item.image_url
                      ? <img src={item.image_url} alt="" loading="lazy" className="w-full h-full object-contain" />
                      : <span className="text-2xl">{item.emoji || '🛒'}</span>}
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-sm text-gray-900 leading-tight">
                      {item.product_name}
                    </div>
                    <div className="text-[11px] text-gray-400 mt-0.5">
                      {item.brand && <>{item.brand} · </>}{item.unit} · {item.category}
                    </div>
                    <div className="text-sm font-black text-gray-900 mt-1">{euro(item.price)}</div>
                  </div>
                </div>

                {/* the candidates */}
                <div>
                  {item.candidates.length === 0 ? (
                    <div className="flex items-start gap-2 text-xs text-gray-500 bg-gray-50 rounded-xl px-3.5 py-3">
                      <AlertTriangle size={14} className="text-orange-dark flex-shrink-0 mt-0.5" />
                      <span>
                        Kein Gegenstück im Katalog — mit <strong>Neuer Eintrag</strong>
                        {' '}aufnehmen, damit andere Ketten sich daran hängen können.
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {item.candidates.map((c, i) => (
                        <button key={c.catalog_item_id}
                          onClick={() => link(item, c)}
                          disabled={busy === item.product_id}
                          className="w-full flex items-center gap-2.5 text-left border-2 border-gray-100 hover:border-red rounded-xl px-3 py-2 transition-colors disabled:opacity-50 group">
                          {idx === 0 && (
                            <kbd className="w-5 h-5 rounded bg-gray-100 group-hover:bg-red group-hover:text-white text-[10px] font-black flex items-center justify-center flex-shrink-0 transition-colors">
                              {i + 1}
                            </kbd>
                          )}
                          <span className="text-lg flex-shrink-0">{c.emoji || '🛒'}</span>
                          <span className="flex-1 min-w-0">
                            <span className="block text-sm font-semibold text-gray-900 truncate">{c.name}</span>
                            <span className="block text-[10px] text-gray-400">
                              {c.category}
                              {c.base_qty != null && c.base_unit && <> · {c.base_qty} {c.base_unit}</>}
                              {!c.same_category && <span className="text-orange-dark"> · anderes Regal</span>}
                            </span>
                          </span>
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border flex-shrink-0 ${scoreColor(c.score)}`}>
                            {c.score.toFixed(2).replace('.', ',')}
                          </span>
                          <Link2 size={14} className="text-gray-300 group-hover:text-red flex-shrink-0 transition-colors" />
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                    <button onClick={() => createNew(item)} disabled={busy === item.product_id}
                      className="flex items-center gap-1.5 text-xs font-bold text-gray-600 border-2 border-gray-100 hover:border-gray-900 rounded-lg px-3 py-2 transition-colors disabled:opacity-50">
                      {busy === item.product_id
                        ? <Loader2 size={12} className="animate-spin" />
                        : <PlusCircle size={12} />}
                      Neuer Eintrag
                      {idx === 0 && <kbd className="ml-1 text-[9px] text-gray-400">N</kbd>}
                    </button>
                    <button onClick={() => skip(item)} disabled={busy === item.product_id}
                      className="flex items-center gap-1.5 text-xs font-bold text-gray-400 hover:text-gray-700 px-2 py-2 transition-colors disabled:opacity-50">
                      <SkipForward size={12} /> Überspringen
                      {idx === 0 && <kbd className="ml-1 text-[9px] text-gray-300">S</kbd>}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {queue.length >= 40 && (
            <button onClick={loadQueue}
              className="w-full border-2 border-gray-100 rounded-xl py-3 text-xs font-bold text-gray-500 hover:border-gray-200">
              Nächste 40 laden
            </button>
          )}
        </div>
      )}

      {/* why this matters */}
      <div className="mt-8 bg-gray-50 rounded-2xl p-5">
        <div className="flex gap-3">
          <Check size={16} className="text-gray-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-gray-500 leading-relaxed space-y-1.5">
            <p>
              Ein Katalog-Eintrag ist ein Produkt als <em>Begriff</em> — „Knäckebrot 200 g" —
              an dem mehrere Ketten mit ihrem eigenen Artikel hängen. Erst dadurch
              lässt sich ein Korb überhaupt zwischen Ketten rechnen.
            </p>
            <p>
              Falsch zugeordnet? <strong>Überspringen</strong> nimmt das Produkt aus der
              Liste, ohne es zu verknüpfen. Eine falsche Verknüpfung lässt sich im
              SQL-Editor mit <code className="bg-white px-1 rounded">set_catalog_link(produkt_id, NULL)</code> lösen.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
