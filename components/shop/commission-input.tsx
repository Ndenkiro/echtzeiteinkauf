'use client'
// components/shop/commission-input.tsx — customer sets the shopper commission
import { useState, useEffect } from 'react'
import { Euro, TrendingUp, Zap, Info, Clock, MapPin, Package } from 'lucide-react'

type Props = {
  distanceKm: number
  itemCount: number
  value: number
  onChange: (v: number) => void
}

// Same formula as the SQL suggest_commission()
function computeSuggestion(distanceKm: number, itemCount: number) {
  const hour = new Date().getHours()
  const isPeak = (hour >= 7 && hour <= 8) || (hour >= 16 && hour <= 18)
  const base = 3.99 + distanceKm * 0.40 + itemCount * 0.15
  const peak = isPeak ? base * 0.30 : 0
  const suggested = Math.round((base + peak) * 100) / 100
  return {
    suggested,
    minimum: Math.round(suggested * 0.6 * 100) / 100,
    base: Math.round(base * 100) / 100,
    peak: Math.round(peak * 100) / 100,
    isPeak,
  }
}

export function CommissionInput({ distanceKm, itemCount, value, onChange }: Props) {
  const s = computeSuggestion(distanceKm, itemCount)
  const [touched, setTouched] = useState(false)
  const [showDetail, setShowDetail] = useState(false)

  // Pre-fill with the suggestion until the customer changes it
  useEffect(() => {
    if (!touched) onChange(s.suggested)
  }, [s.suggested, touched])

  const setValue = (v: number) => {
    setTouched(true)
    onChange(Math.max(0, Math.round(v * 100) / 100))
  }

  const ratio = s.suggested > 0 ? value / s.suggested : 1
  const speed =
    ratio >= 1.25 ? { label: 'Sehr schnell', sub: 'Shopper nehmen diesen Auftrag sofort an', color: 'text-green-700 bg-green-50 border-green-200', icon: '⚡' }
    : ratio >= 0.95 ? { label: 'Schnell', sub: 'Übliche Wartezeit: wenige Minuten', color: 'text-blue-700 bg-blue-50 border-blue-200', icon: '👍' }
    : ratio >= 0.7 ? { label: 'Normal', sub: 'Kann etwas länger dauern', color: 'text-orange-700 bg-orange-50 border-orange-200', icon: '🕐' }
    : { label: 'Langsam', sub: 'Möglicherweise findet sich kein Shopper', color: 'text-red bg-red/5 border-red/20', icon: '⚠️' }

  const quickValues = [
    { v: s.minimum,                       label: 'Minimum' },
    { v: s.suggested,                     label: 'Empfohlen' },
    { v: Math.round(s.suggested * 1.3 * 100) / 100, label: 'Schnell' },
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs font-black text-gray-400 uppercase tracking-wide">
          💰 Ihre Provision für den Shopper
        </label>
        <button
          onClick={() => setShowDetail(v => !v)}
          className="text-[10px] font-bold text-gray-400 hover:text-gray-600 flex items-center gap-1"
        >
          <Info size={11} /> Wie wird das berechnet?
        </button>
      </div>

      {showDetail && (
        <div className="bg-gray-50 rounded-xl p-3 mb-3 flex flex-col gap-1.5 text-xs">
          <div className="flex justify-between text-gray-500">
            <span className="flex items-center gap-1.5"><Package size={11} /> Grundbetrag</span>
            <span>3,99 €</span>
          </div>
          <div className="flex justify-between text-gray-500">
            <span className="flex items-center gap-1.5"><MapPin size={11} /> Entfernung ({distanceKm} km × 0,40 €)</span>
            <span>{(distanceKm * 0.40).toFixed(2)} €</span>
          </div>
          <div className="flex justify-between text-gray-500">
            <span className="flex items-center gap-1.5"><Package size={11} /> Artikel ({itemCount} × 0,15 €)</span>
            <span>{(itemCount * 0.15).toFixed(2)} €</span>
          </div>
          {s.isPeak && (
            <div className="flex justify-between text-orange-600 font-bold">
              <span className="flex items-center gap-1.5"><Clock size={11} /> Stoßzeit +30 %</span>
              <span>+{s.peak.toFixed(2)} €</span>
            </div>
          )}
          <div className="flex justify-between font-black text-gray-900 border-t border-gray-200 pt-1.5 mt-0.5">
            <span>Empfehlung</span><span>{s.suggested.toFixed(2)} €</span>
          </div>
          <p className="text-[10px] text-gray-400 mt-1 leading-relaxed">
            Sie bestimmen den Betrag frei. Eine höhere Provision bedeutet, dass Shopper
            Ihren Auftrag schneller annehmen.
          </p>
        </div>
      )}

      {/* Big amount input */}
      <div className="flex items-center gap-2 border-2 border-gray-100 rounded-2xl px-4 py-3 mb-3 focus-within:border-red transition-colors bg-white">
        <Euro size={20} className="text-gray-400 flex-shrink-0" />
        <input
          type="number"
          min="0"
          step="0.50"
          value={value || ''}
          onChange={e => setValue(Number(e.target.value))}
          className="flex-1 outline-none text-2xl font-black bg-transparent text-gray-900 w-full"
          placeholder="0.00"
        />
        <span className="text-lg font-black text-gray-300">€</span>
      </div>

      {/* Quick picks */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        {quickValues.map(q => {
          const active = Math.abs(value - q.v) < 0.01
          return (
            <button
              key={q.label}
              onClick={() => setValue(q.v)}
              className={`py-2.5 rounded-xl border-2 transition-all ${
                active ? 'border-red bg-red/5' : 'border-gray-100 hover:border-gray-200'
              }`}
            >
              <div className={`text-sm font-black ${active ? 'text-red' : 'text-gray-900'}`}>
                {q.v.toFixed(2)} €
              </div>
              <div className="text-[10px] text-gray-400 font-bold">{q.label}</div>
            </button>
          )
        })}
      </div>

      {/* Speed feedback */}
      <div className={`rounded-xl border px-3.5 py-2.5 flex items-center gap-2.5 ${speed.color}`}>
        <span className="text-base">{speed.icon}</span>
        <div className="min-w-0">
          <div className="text-xs font-black">{speed.label}</div>
          <div className="text-[10px] opacity-80">{speed.sub}</div>
        </div>
      </div>

      {s.isPeak && (
        <div className="flex items-center gap-1.5 text-[10px] text-orange-600 bg-orange-50 rounded-lg px-2.5 py-1.5 mt-2">
          <Zap size={11} /> Stoßzeit (7–9 / 16–19 Uhr) — Shopper sind stärker ausgelastet
        </div>
      )}
    </div>
  )
}
