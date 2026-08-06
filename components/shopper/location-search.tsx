'use client'
// components/shopper/location-search.tsx — search missions from anywhere
import { useState } from 'react'
import { Search, Navigation, X, Loader2, MapPin, Home } from 'lucide-react'
import { toast } from 'sonner'

const GOOGLE_MAPS_API_KEY = 'AIzaSyDExSOafkqdChm7ZkqVYAVD2W271a-mU2I'

const RADIUS_OPTIONS = [5, 10, 20, 50]

export type SearchLocation = {
  lat: number
  lng: number
  label: string
  radius: number
} | null

type Props = {
  homeRadius: number
  value: SearchLocation
  onChange: (loc: SearchLocation) => void
}

export function LocationSearch({ homeRadius, value, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [radius, setRadius] = useState(value?.radius ?? homeRadius)
  const [busy, setBusy] = useState(false)

  const searchAddress = async () => {
    if (!query.trim()) { toast.error('Bitte Ort eingeben'); return }
    setBusy(true)
    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query + ', Deutschland')}&region=DE&key=${GOOGLE_MAPS_API_KEY}`
      )
      const data = await res.json()
      setBusy(false)

      if (data.status !== 'OK' || !data.results?.[0]) {
        toast.error('Ort nicht gefunden')
        return
      }
      const r = data.results[0]
      const l = r.geometry.location
      onChange({
        lat: l.lat,
        lng: l.lng,
        label: r.formatted_address.replace(', Deutschland', ''),
        radius,
      })
      setOpen(false)
      setQuery('')
    } catch {
      setBusy(false)
      toast.error('Fehler bei der Suche')
    }
  }

  const useGps = () => {
    if (!navigator.geolocation) { toast.error('Standort nicht verfügbar'); return }
    setBusy(true)
    navigator.geolocation.getCurrentPosition(
      async pos => {
        const c = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        let label = 'Mein aktueller Standort'
        try {
          const res = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?latlng=${c.lat},${c.lng}&language=de&key=${GOOGLE_MAPS_API_KEY}`
          )
          const data = await res.json()
          const comp = data.results?.[0]?.address_components
          const city = comp?.find((x: any) => x.types.includes('locality'))?.long_name
          if (city) label = `Aktueller Standort · ${city}`
        } catch {}
        onChange({ ...c, label, radius })
        setBusy(false)
        setOpen(false)
      },
      () => { setBusy(false); toast.error('Standortzugriff verweigert') },
      { enableHighAccuracy: true, timeout: 15000 }
    )
  }

  const reset = () => {
    onChange(null)
    setOpen(false)
  }

  // ── Compact bar ──
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center gap-3 bg-white/[0.04] border border-white/10 rounded-2xl px-4 py-3 mb-5 hover:border-orange/40 transition-all text-left"
      >
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
          value ? 'bg-orange/20' : 'bg-white/[0.06]'
        }`}>
          {value ? <MapPin size={17} className="text-orange" /> : <Home size={17} className="text-white/40" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-black text-white/40 uppercase tracking-wide">
            Suche ab
          </div>
          <div className="font-bold text-sm text-white truncate">
            {value ? value.label : 'Meiner Adresse'}
          </div>
        </div>
        <div className="text-xs font-black text-orange flex-shrink-0">
          {value?.radius ?? homeRadius} km
        </div>
        <Search size={16} className="text-white/30 flex-shrink-0" />
      </button>
    )
  }

  // ── Expanded panel ──
  return (
    <div className="bg-white/[0.04] border border-orange/30 rounded-2xl p-4 mb-5">
      <div className="flex items-center justify-between mb-3">
        <span className="font-black text-sm text-white">Missionen suchen</span>
        <button onClick={() => setOpen(false)}>
          <X size={17} className="text-white/40 hover:text-white" />
        </button>
      </div>

      <button
        onClick={useGps}
        disabled={busy}
        className="w-full flex items-center gap-2.5 bg-orange/10 border border-orange/30 text-orange rounded-xl px-4 py-3 mb-3 font-bold text-sm hover:bg-orange hover:text-black transition-all disabled:opacity-50"
      >
        {busy ? <Loader2 size={16} className="animate-spin" /> : <Navigation size={16} />}
        Wo ich gerade bin
      </button>

      <div className="flex items-center gap-3 mb-3">
        <div className="flex-1 h-px bg-white/10" />
        <span className="text-[10px] text-white/30 font-bold">ODER ORT EINGEBEN</span>
        <div className="flex-1 h-px bg-white/10" />
      </div>

      <div className="flex gap-2 mb-4">
        <div className="flex-1 flex items-center gap-2 bg-white/[0.06] border border-white/10 rounded-xl px-3.5 py-2.5 focus-within:border-orange transition-colors">
          <Search size={15} className="text-white/30 flex-shrink-0" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && searchAddress()}
            placeholder="Stadt, PLZ oder Adresse…"
            className="flex-1 outline-none text-sm bg-transparent text-white placeholder-white/30"
            autoFocus
          />
        </div>
        <button
          onClick={searchAddress}
          disabled={busy || !query.trim()}
          className="bg-orange text-black font-black rounded-xl px-4 text-sm hover:bg-orange-dark hover:text-white transition-colors disabled:opacity-40 flex-shrink-0"
        >
          {busy ? <Loader2 size={15} className="animate-spin" /> : 'Suchen'}
        </button>
      </div>

      <div className="mb-4">
        <div className="text-[10px] font-black text-white/40 uppercase tracking-wide mb-2">
          Umkreis
        </div>
        <div className="grid grid-cols-4 gap-2">
          {RADIUS_OPTIONS.map(r => (
            <button
              key={r}
              onClick={() => {
                setRadius(r)
                if (value) onChange({ ...value, radius: r })
              }}
              className={`py-2 rounded-xl text-sm font-bold border transition-all ${
                radius === r
                  ? 'border-orange bg-orange/15 text-orange'
                  : 'border-white/10 text-white/50 hover:border-white/25'
              }`}
            >{r} km</button>
          ))}
        </div>
      </div>

      {value && (
        <button
          onClick={reset}
          className="w-full flex items-center justify-center gap-2 border border-white/10 text-white/50 rounded-xl py-2.5 text-xs font-bold hover:border-white/25 hover:text-white transition-all"
        >
          <Home size={13} /> Zurück zu meiner Adresse
        </button>
      )}
    </div>
  )
}
