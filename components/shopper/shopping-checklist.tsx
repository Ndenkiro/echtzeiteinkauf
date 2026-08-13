'use client'
// components/shopper/shopping-checklist.tsx — tick items while shopping
import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import {
  Check, X, AlertCircle, Loader2, ShoppingCart,
  Package, MessageSquare, ChevronDown, ChevronUp
} from 'lucide-react'
import { toast } from 'sonner'

const SUPABASE_URL = 'https://wpxpgszzzfhhsaunolyq.supabase.co'
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndweHBnc3p6emZoaHNhdW5vbHlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0Mzg5ODQsImV4cCI6MjA5NzAxNDk4NH0.8_DVpLNwItAlkn_gL9a4dn-lZ00I8iifX2Cb9N_W-4U'

type Item = {
  item_id: string
  product_name: string
  unit: string
  quantity: number
  price: number
  category: string
  picked: boolean
  unavailable: boolean
  substitute_note: string | null
  actual_price: number | null
}

export function ShoppingChecklist({
  orderId,
  onProgress,
}: {
  orderId: string
  onProgress?: (allDone: boolean, remaining: number) => void
}) {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [collapsed, setCollapsed] = useState(false)
  const [noteFor, setNoteFor] = useState<string | null>(null)
  const [noteText, setNoteText] = useState('')

  const supabase = createBrowserClient(SUPABASE_URL, SUPABASE_ANON)

  const load = async () => {
    const { data } = await supabase.rpc('get_shopping_list', { p_order_id: orderId })
    const list = (data || []) as Item[]
    setItems(list)
    setLoading(false)
    const remaining = list.filter(i => !i.picked && !i.unavailable).length
    onProgress?.(remaining === 0 && list.length > 0, remaining)
  }

  useEffect(() => { load() }, [orderId])

  const update = async (
    itemId: string,
    patch: { picked?: boolean; unavailable?: boolean; note?: string }
  ) => {
    setBusy(itemId)
    // Optimistic update
    setItems(prev => prev.map(i => i.item_id === itemId
      ? {
          ...i,
          picked: patch.picked ?? i.picked,
          unavailable: patch.unavailable ?? i.unavailable,
          substitute_note: patch.note ?? i.substitute_note,
        }
      : i))

    const { data, error } = await supabase.rpc('update_shopping_item', {
      p_item_id: itemId,
      p_picked: patch.picked ?? null,
      p_unavailable: patch.unavailable ?? null,
      p_note: patch.note ?? null,
      p_actual_price: null,
    })
    setBusy(null)

    if (error || !data?.ok) {
      toast.error('Konnte nicht gespeichert werden')
      load()
      return
    }
    load()
  }

  const togglePicked = (item: Item) => {
    if (item.unavailable) {
      // Un-flag as missing and tick it
      update(item.item_id, { picked: true, unavailable: false })
      return
    }
    update(item.item_id, { picked: !item.picked })
  }

  const markMissing = (item: Item) => {
    setNoteFor(item.item_id)
    setNoteText(item.substitute_note || '')
  }

  const saveMissing = async () => {
    if (!noteFor) return
    await update(noteFor, { unavailable: true, picked: false, note: noteText.trim() || 'Nicht verfügbar' })
    setNoteFor(null)
    setNoteText('')
    toast.success('Als nicht verfügbar markiert')
  }

  const picked = items.filter(i => i.picked).length
  const missing = items.filter(i => i.unavailable).length
  const remaining = items.filter(i => !i.picked && !i.unavailable).length
  const pct = items.length > 0 ? Math.round(((picked + missing) / items.length) * 100) : 0

  // Group by category
  const grouped = items.reduce((acc, i) => {
    (acc[i.category] ||= []).push(i)
    return acc
  }, {} as Record<string, Item[]>)

  if (loading) return (
    <div className="bg-white/[0.04] rounded-2xl border border-white/10 p-6 mb-4 flex justify-center">
      <Loader2 size={20} className="animate-spin text-orange" />
    </div>
  )

  if (items.length === 0) return null

  return (
    <div className="bg-white/[0.04] rounded-2xl border border-white/10 overflow-hidden mb-4">
      {/* Header with progress */}
      <button
        onClick={() => setCollapsed(v => !v)}
        className="w-full px-4 py-3.5 flex items-center gap-3 hover:bg-white/[0.02] transition-colors"
      >
        <div className="w-9 h-9 rounded-xl bg-orange/20 flex items-center justify-center flex-shrink-0">
          <ShoppingCart size={17} className="text-orange" />
        </div>
        <div className="flex-1 min-w-0 text-left">
          <div className="font-black text-sm text-white">Einkaufsliste</div>
          <div className="text-[11px] text-white/40">
            {picked} von {items.length} eingekauft
            {missing > 0 && ` · ${missing} nicht verfügbar`}
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <div className={`text-lg font-black ${remaining === 0 ? 'text-green-400' : 'text-orange'}`}>
            {pct}%
          </div>
        </div>
        {collapsed ? <ChevronDown size={17} className="text-white/30" />
                   : <ChevronUp size={17} className="text-white/30" />}
      </button>

      {/* Progress bar */}
      <div className="h-1 bg-white/[0.06]">
        <div
          className={`h-full transition-all duration-300 ${
            remaining === 0 ? 'bg-green-500' : 'bg-orange'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {!collapsed && (
        <div className="p-3">
          {Object.entries(grouped).map(([category, catItems]) => (
            <div key={category} className="mb-3 last:mb-0">
              <div className="text-[10px] font-black text-white/30 uppercase tracking-wide px-1 mb-1.5">
                {category}
              </div>
              <div className="flex flex-col gap-1.5">
                {catItems.map(item => {
                  const isBusy = busy === item.item_id
                  return (
                    <div
                      key={item.item_id}
                      className={`rounded-xl border transition-all ${
                        item.picked
                          ? 'bg-green-500/10 border-green-500/25'
                          : item.unavailable
                            ? 'bg-red-500/10 border-red-500/25'
                            : 'bg-white/[0.03] border-white/[0.08]'
                      }`}
                    >
                      <div className="flex items-center gap-3 p-3">
                        {/* Checkbox */}
                        <button
                          onClick={() => togglePicked(item)}
                          disabled={isBusy}
                          className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                            item.picked
                              ? 'bg-green-500 border-green-500'
                              : item.unavailable
                                ? 'bg-red-500/20 border-red-500/40'
                                : 'border-white/20 hover:border-orange'
                          }`}
                        >
                          {isBusy ? <Loader2 size={12} className="animate-spin text-white" />
                            : item.picked ? <Check size={14} className="text-white" strokeWidth={3} />
                            : item.unavailable ? <X size={13} className="text-red-400" strokeWidth={3} />
                            : null}
                        </button>

                        {/* Name */}
                        <div className="flex-1 min-w-0">
                          <div className={`font-bold text-sm ${
                            item.picked ? 'text-white/50 line-through'
                            : item.unavailable ? 'text-white/40 line-through'
                            : 'text-white'
                          }`}>
                            {item.quantity}× {item.product_name}
                          </div>
                          <div className="text-[11px] text-white/30">
                            {item.unit && `${item.unit} · `}
                            {Number(item.price).toFixed(2)} €
                          </div>
                          {item.substitute_note && (
                            <div className="flex items-start gap-1 mt-1">
                              <MessageSquare size={10} className="text-orange flex-shrink-0 mt-0.5" />
                              <span className="text-[10px] text-orange/80 italic">
                                {item.substitute_note}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Missing button */}
                        {!item.picked && !item.unavailable && (
                          <button
                            onClick={() => markMissing(item)}
                            className="text-[10px] font-bold text-white/40 border border-white/15 rounded-lg px-2.5 py-1.5 hover:border-red-500/50 hover:text-red-400 transition-all flex-shrink-0"
                          >
                            Fehlt
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}

          {/* Summary */}
          <div className={`rounded-xl p-3 mt-3 flex items-center gap-2.5 ${
            remaining === 0 ? 'bg-green-500/10' : 'bg-white/[0.04]'
          }`}>
            {remaining === 0 ? (
              <>
                <Check size={16} className="text-green-400 flex-shrink-0" strokeWidth={3} />
                <span className="text-xs font-bold text-green-400">
                  Alle Artikel bearbeitet — Sie können zur Kasse
                </span>
              </>
            ) : (
              <>
                <Package size={15} className="text-white/40 flex-shrink-0" />
                <span className="text-xs text-white/50">
                  Noch <strong className="text-white">{remaining}</strong>{' '}
                  {remaining === 1 ? 'Artikel' : 'Artikel'} einzukaufen
                </span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Missing item modal */}
      {noteFor && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center sm:justify-center p-0 sm:p-4">
          <div className="w-full sm:max-w-sm bg-white rounded-t-3xl sm:rounded-3xl p-6">
            <div className="flex items-center gap-2.5 mb-1">
              <AlertCircle size={18} className="text-red" />
              <h3 className="font-black text-gray-900">Artikel nicht verfügbar</h3>
            </div>
            <p className="text-xs text-gray-400 mb-4">
              Beschreiben Sie kurz, was Sie stattdessen gekauft haben — oder lassen Sie
              das Feld leer, wenn Sie nichts ersetzt haben.
            </p>

            <textarea
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              placeholder="z.B. Stattdessen Bio-Variante genommen"
              rows={3}
              className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 text-sm outline-none focus:border-red transition-colors resize-none mb-4"
              autoFocus
            />

            <div className="flex gap-2">
              <button
                onClick={() => { setNoteFor(null); setNoteText('') }}
                className="flex-1 border-2 border-gray-200 text-gray-600 font-bold rounded-xl py-3 text-sm hover:border-gray-300 transition-all"
              >
                Abbrechen
              </button>
              <button
                onClick={saveMissing}
                className="flex-1 bg-red text-white font-black rounded-xl py-3 text-sm hover:bg-red-dark transition-colors"
              >
                Bestätigen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
