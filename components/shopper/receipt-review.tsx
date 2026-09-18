'use client'
// components/shopper/receipt-review.tsx — check what the receipt said
import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import {
  Receipt, Loader2, Check, X, Search, AlertCircle,
  Link2, CheckCircle2, Sparkles, TrendingDown, TrendingUp
} from 'lucide-react'
import { toast } from 'sonner'

const SUPABASE_URL = 'https://wpxpgszzzfhhsaunolyq.supabase.co'
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndweHBnc3p6emZoaHNhdW5vbHlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0Mzg5ODQsImV4cCI6MjA5NzAxNDk4NH0.8_DVpLNwItAlkn_gL9a4dn-lZ00I8iifX2Cb9N_W-4U'

type Line = {
  line_id: string
  raw_text: string
  quantity: number
  total_price: number
  unit_price: number | null
  product_id: string | null
  product_name: string | null
  catalog_price: number | null
  match_score: number | null
  confirmed: boolean
}

export function ReceiptReview({
  orderId,
  storeId,
  onDone,
}: {
  orderId: string
  storeId: string
  onDone?: () => void
}) {
  const [lines, setLines] = useState<Line[]>([])
  const [loading, setLoading] = useState(true)
  const [parsing, setParsing] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<any[]>([])

  const supabase = createBrowserClient(SUPABASE_URL, SUPABASE_ANON)

  const load = async () => {
    const { data } = await supabase.rpc('get_receipt_lines', { p_order_id: orderId })
    setLines(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [orderId])

  const parse = async () => {
    setParsing(true)
    try {
      const res = await fetch('/api/receipts/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      if (data.lines === 0) {
        toast.error('Keine Artikel erkannt — bitte Foto prüfen')
      } else {
        toast.success(`${data.lines} Positionen gelesen · ${data.matched} zugeordnet`)
      }
      load()
    } catch (e: any) {
      toast.error(e.message || 'Bon konnte nicht gelesen werden')
    }
    setParsing(false)
  }

  const searchProducts = async (q: string) => {
    setQuery(q)
    const { data } = await supabase.rpc('search_store_products', {
      p_store_id: storeId, p_query: q, p_limit: 8,
    })
    setResults(data || [])
  }

  const relink = async (lineId: string, productId: string) => {
    const { data, error } = await supabase.rpc('relink_receipt_line', {
      p_line_id: lineId, p_product_id: productId,
    })
    if (error || !data?.ok) { toast.error('Zuordnung fehlgeschlagen'); return }
    setEditing(null); setQuery(''); setResults([])
    load()
  }

  const confirm = async () => {
    setConfirming(true)
    const { data, error } = await supabase.rpc('confirm_receipt_lines', {
      p_order_id: orderId,
    })
    setConfirming(false)
    if (error || !data?.ok) { toast.error('Bestätigung fehlgeschlagen'); return }
    toast.success(`${data.observations} Preise aktualisiert ✓`)
    load()
    onDone?.()
  }

  if (loading) return (
    <div className="bg-white/[0.04] rounded-2xl border border-white/10 p-6 mb-4 flex justify-center">
      <Loader2 size={20} className="animate-spin text-orange" />
    </div>
  )

  // Nothing parsed yet
  if (lines.length === 0) {
    return (
      <div className="bg-white/[0.04] rounded-2xl border border-white/10 p-5 mb-4">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-orange/20 flex items-center justify-center flex-shrink-0">
            <Receipt size={18} className="text-orange" />
          </div>
          <div className="flex-1">
            <div className="font-black text-sm text-white mb-0.5">Kassenbon auswerten</div>
            <p className="text-xs text-white/50 leading-relaxed">
              Wir lesen die Positionen aus Ihrem Bon und aktualisieren damit die
              Preise für diesen Markt.
            </p>
          </div>
        </div>
        <button onClick={parse} disabled={parsing}
          className="w-full bg-orange text-black font-black rounded-xl py-3 text-sm flex items-center justify-center gap-2 hover:bg-orange-dark hover:text-white transition-colors disabled:opacity-50">
          {parsing
            ? <><Loader2 size={15} className="animate-spin" /> Bon wird gelesen…</>
            : <><Sparkles size={15} /> Bon auswerten</>}
        </button>
      </div>
    )
  }

  const matched = lines.filter(l => l.product_id).length
  const allConfirmed = lines.every(l => l.confirmed || !l.product_id)
  const receiptTotal = lines.reduce((a, l) => a + Number(l.total_price), 0)

  return (
    <div className="bg-white/[0.04] rounded-2xl border border-white/10 overflow-hidden mb-4">
      <div className="px-4 py-3.5 flex items-center gap-3 border-b border-white/[0.06]">
        <div className="w-9 h-9 rounded-xl bg-orange/20 flex items-center justify-center flex-shrink-0">
          <Receipt size={17} className="text-orange" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-black text-sm text-white">Kassenbon</div>
          <div className="text-[11px] text-white/40">
            {lines.length} Positionen · {matched} zugeordnet · {receiptTotal.toFixed(2)} €
          </div>
        </div>
        {allConfirmed && (
          <span className="flex items-center gap-1 text-[10px] font-black text-green-400 bg-green-500/15 px-2 py-1 rounded-full flex-shrink-0">
            <CheckCircle2 size={10} /> Bestätigt
          </span>
        )}
      </div>

      <div className="p-3 max-h-96 overflow-y-auto">
        <div className="flex flex-col gap-1.5">
          {lines.map(l => {
            const score = Number(l.match_score || 0)
            const good = score >= 0.6
            const diff = l.catalog_price != null && l.unit_price != null
              ? Number(l.unit_price) - Number(l.catalog_price)
              : null

            return (
              <div key={l.line_id}
                className={`rounded-xl border p-3 ${
                  !l.product_id ? 'bg-red-500/[0.07] border-red-500/20'
                  : good ? 'bg-white/[0.03] border-white/[0.08]'
                  : 'bg-orange/[0.07] border-orange/20'
                }`}>
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    {/* What the receipt says */}
                    <div className="font-mono text-[11px] text-white/40 truncate">
                      {l.raw_text}
                    </div>

                    {/* What we matched it to */}
                    {l.product_id ? (
                      <div className="flex items-center gap-1.5 mt-1">
                        <Link2 size={11} className={good ? 'text-green-400' : 'text-orange'} />
                        <span className="text-sm font-bold text-white truncate">
                          {l.product_name}
                        </span>
                        {!good && (
                          <span className="text-[9px] font-black text-orange bg-orange/15 px-1.5 py-0.5 rounded flex-shrink-0">
                            UNSICHER
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 mt-1">
                        <AlertCircle size={11} className="text-red-400" />
                        <span className="text-xs text-red-400 font-bold">
                          Kein Produkt zugeordnet
                        </span>
                      </div>
                    )}

                    {/* Price comparison */}
                    <div className="flex items-center gap-2 mt-1.5 text-[11px]">
                      <span className="text-white/60">
                        {Number(l.quantity) !== 1 && `${Number(l.quantity)}× `}
                        <strong className="text-white">
                          {Number(l.unit_price ?? l.total_price).toFixed(2)} €
                        </strong>
                      </span>
                      {diff != null && Math.abs(diff) > 0.05 && (
                        <span className={`flex items-center gap-0.5 font-bold ${
                          diff > 0 ? 'text-red-400' : 'text-green-400'
                        }`}>
                          {diff > 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                          {diff > 0 ? '+' : ''}{diff.toFixed(2)} € vs. Katalog
                        </span>
                      )}
                    </div>
                  </div>

                  {!l.confirmed && (
                    <button
                      onClick={() => {
                        setEditing(editing === l.line_id ? null : l.line_id)
                        setQuery(l.raw_text.replace(/[0-9,.]+\s*$/, '').trim())
                        searchProducts(l.raw_text.replace(/[0-9,.]+\s*$/, '').trim())
                      }}
                      className="text-[10px] font-bold text-white/40 border border-white/15 rounded-lg px-2.5 py-1.5 hover:border-orange hover:text-orange transition-all flex-shrink-0"
                    >
                      {l.product_id ? 'Ändern' : 'Zuordnen'}
                    </button>
                  )}
                </div>

                {/* Product picker */}
                {editing === l.line_id && (
                  <div className="mt-3 pt-3 border-t border-white/[0.06]">
                    <div className="flex items-center gap-2 bg-white/[0.06] rounded-xl px-3 py-2 mb-2">
                      <Search size={13} className="text-white/30 flex-shrink-0" />
                      <input
                        value={query}
                        onChange={e => searchProducts(e.target.value)}
                        placeholder="Produkt suchen…"
                        className="flex-1 outline-none text-xs bg-transparent text-white placeholder-white/25"
                        autoFocus
                      />
                      <button onClick={() => { setEditing(null); setQuery('') }}>
                        <X size={13} className="text-white/30 hover:text-white" />
                      </button>
                    </div>
                    <div className="flex flex-col gap-1 max-h-44 overflow-y-auto">
                      {results.map(r => (
                        <button key={r.id}
                          onClick={() => relink(l.line_id, r.id)}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-white/[0.06] transition-colors text-left"
                        >
                          <span className="text-base flex-shrink-0">{r.emoji || '🛒'}</span>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-bold text-white truncate">{r.name}</div>
                            <div className="text-[10px] text-white/30">{r.unit}</div>
                          </div>
                          <span className="text-xs font-black text-white/60 flex-shrink-0">
                            {Number(r.price).toFixed(2)} €
                          </span>
                        </button>
                      ))}
                      {results.length === 0 && (
                        <p className="text-xs text-white/30 text-center py-3">
                          Nichts gefunden
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {!allConfirmed && (
        <div className="p-3 border-t border-white/[0.06]">
          <button onClick={confirm} disabled={confirming || matched === 0}
            className="w-full bg-green-600 text-white font-black rounded-xl py-3 text-sm flex items-center justify-center gap-2 hover:bg-green-700 transition-colors disabled:opacity-40">
            {confirming
              ? <><Loader2 size={15} className="animate-spin" /> Wird gespeichert…</>
              : <><Check size={15} /> {matched} Preise bestätigen</>}
          </button>
          <p className="text-[10px] text-white/30 text-center mt-2">
            Bestätigte Preise verbessern den Katalog für alle Kunden.
          </p>
        </div>
      )}
    </div>
  )
}
