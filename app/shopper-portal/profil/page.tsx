'use client'
// app/shopper-portal/profil/page.tsx — address, radius, availability
import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'
import {
  User, Mail, Phone, MapPin, Save, Lock, CheckCircle2,
  AlertCircle, Eye, EyeOff, Loader2, Power, Navigation, Bike
} from 'lucide-react'
import { toast } from 'sonner'

const SUPABASE_URL = 'https://wpxpgszzzfhhsaunolyq.supabase.co'
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndweHBnc3p6emZoaHNhdW5vbHlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0Mzg5ODQsImV4cCI6MjA5NzAxNDk4NH0.8_DVpLNwItAlkn_gL9a4dn-lZ00I8iifX2Cb9N_W-4U'
const GOOGLE_MAPS_API_KEY = 'AIzaSyDExSOafkqdChm7ZkqVYAVD2W271a-mU4Z'

const RADIUS_OPTIONS = [5, 10, 20, 50]

export default function ShopperProfilPage() {
  const [profile, setProfile] = useState<any>(null)
  const [shopper, setShopper] = useState<any>(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [zip, setZip] = useState('')
  const [city, setCity] = useState('')
  const [radius, setRadius] = useState(20)
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [isOnline, setIsOnline] = useState(false)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [geocoding, setGeocoding] = useState(false)
  const [togglingOnline, setTogglingOnline] = useState(false)

  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [pwSaving, setPwSaving] = useState(false)
  const [pwError, setPwError] = useState('')

  const router = useRouter()
  const supabase = createBrowserClient(SUPABASE_URL, SUPABASE_ANON)

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/anmelden'); return }

      const { data: p } = await supabase
        .from('users').select('id, full_name, email, phone').eq('auth_id', user.id).single()
      if (p) {
        setProfile(p)
        setName(p.full_name || '')
        setPhone(p.phone || '')
      }

      const { data: s } = await supabase
        .from('shoppers')
        .select('id, address, zip_code, city, radius_km, rating, total_deliveries')
        .eq('user_id', p?.id)
        .maybeSingle()

      if (s) {
        setShopper(s)
        setAddress(s.address || '')
        setZip(s.zip_code || '')
        setCity(s.city || '')
        setRadius(s.radius_km || 20)

        const { data: loc } = await supabase
          .from('shopper_locations')
          .select('lat, lng, is_online')
          .eq('shopper_id', s.id)
          .maybeSingle()
        if (loc) {
          setCoords({ lat: loc.lat, lng: loc.lng })
          setIsOnline(loc.is_online)
        }
      }
      setLoading(false)
    })()
  }, [])

  // Geocode the typed address
  const geocode = async (): Promise<{ lat: number; lng: number } | null> => {
    const full = [address, zip, city].filter(Boolean).join(', ')
    if (!full.trim()) { toast.error('Bitte Adresse eingeben'); return null }

    setGeocoding(true)
    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(full + ', Deutschland')}&region=DE&key=${GOOGLE_MAPS_API_KEY}`
      )
      const data = await res.json()
      setGeocoding(false)

      if (data.status !== 'OK' || !data.results?.[0]) {
        toast.error('Adresse nicht gefunden — bitte vollständige Adresse angeben')
        return null
      }
      const loc = data.results[0].geometry.location
      const c = { lat: loc.lat, lng: loc.lng }
      setCoords(c)
      return c
    } catch {
      setGeocoding(false)
      toast.error('Fehler bei der Adresssuche')
      return null
    }
  }

  const useMyLocation = () => {
    if (!navigator.geolocation) { toast.error('Standort nicht verfügbar'); return }
    setGeocoding(true)
    navigator.geolocation.getCurrentPosition(
      async pos => {
        const c = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        // Reverse geocode to fill the fields
        try {
          const res = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?latlng=${c.lat},${c.lng}&language=de&key=${GOOGLE_MAPS_API_KEY}`
          )
          const data = await res.json()
          const r = data.results?.[0]
          if (r) {
            const get = (type: string) =>
              r.address_components?.find((x: any) => x.types.includes(type))?.long_name || ''
            const street = [get('route'), get('street_number')].filter(Boolean).join(' ')
            setAddress(street || r.formatted_address)
            setZip(get('postal_code'))
            setCity(get('locality') || get('administrative_area_level_1'))
          }
        } catch {}
        setCoords(c)
        setGeocoding(false)
        toast.success('Standort übernommen')
      },
      () => { setGeocoding(false); toast.error('Standortzugriff verweigert') }
    )
  }

  const saveProfile = async () => {
    if (!name.trim()) { toast.error('Bitte Namen eingeben'); return }
    setSaving(true)

    // Basic profile
    await supabase.from('users')
      .update({ full_name: name.trim(), phone: phone.trim() || null })
      .eq('id', profile.id)

    // Address: geocode if needed
    let c = coords
    if (address.trim() && !c) {
      c = await geocode()
      if (!c) { setSaving(false); return }
    }

    if (c) {
      const { data, error } = await supabase.rpc('update_shopper_location', {
        p_address:   address.trim() || null,
        p_zip:       zip.trim() || null,
        p_city:      city.trim() || null,
        p_lat:       c.lat,
        p_lng:       c.lng,
        p_radius_km: radius,
        p_is_online: null,
      })
      if (error || !data?.ok) {
        setSaving(false)
        toast.error('Adresse konnte nicht gespeichert werden')
        return
      }
    }

    setSaving(false)
    toast.success('Profil gespeichert ✓')
    router.refresh()
  }

  const toggleOnline = async () => {
    setTogglingOnline(true)
    const next = !isOnline
    const { data, error } = await supabase.rpc('set_shopper_online', { p_online: next })
    setTogglingOnline(false)

    if (error || !data?.ok) {
      if (data?.reason === 'no_address') {
        toast.error('Bitte speichern Sie zuerst Ihre Adresse')
      } else {
        toast.error('Status konnte nicht geändert werden')
      }
      return
    }
    setIsOnline(next)
    toast.success(next ? 'Sie sind jetzt online 🟢' : 'Sie sind offline')
  }

  const changePassword = async () => {
    setPwError('')
    if (newPw.length < 8) { setPwError('Mindestens 8 Zeichen'); return }
    if (newPw !== confirmPw) { setPwError('Die Passwörter stimmen nicht überein'); return }
    setPwSaving(true)
    const { error } = await supabase.auth.updateUser({ password: newPw })
    setPwSaving(false)
    if (error) { setPwError('Passwort konnte nicht geändert werden'); return }
    toast.success('Passwort geändert ✓')
    setNewPw(''); setConfirmPw('')
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-4 border-orange border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const initials = (profile?.full_name || profile?.email || 'S')
    .split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-gray-900">Profil</h1>
        <p className="text-sm text-gray-500 mt-1">Ihre Daten und Ihr Einsatzgebiet</p>
      </div>

      {/* Availability */}
      {shopper && (
        <div className={`rounded-2xl border-2 p-5 mb-6 transition-colors ${
          isOnline ? 'border-green-200 bg-green-50' : 'border-gray-100 bg-white'
        }`}>
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
              isOnline ? 'bg-green-100' : 'bg-gray-100'
            }`}>
              <Power size={22} className={isOnline ? 'text-green-600' : 'text-gray-400'} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-black text-gray-900">
                {isOnline ? 'Sie sind online' : 'Sie sind offline'}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">
                {isOnline
                  ? 'Sie erhalten Aufträge in Ihrem Einsatzgebiet'
                  : 'Schalten Sie sich online, um Aufträge zu erhalten'}
              </div>
            </div>
            <button
              onClick={toggleOnline}
              disabled={togglingOnline}
              className={`relative w-14 h-8 rounded-full transition-colors flex-shrink-0 ${
                isOnline ? 'bg-green-500' : 'bg-gray-300'
              } disabled:opacity-50`}
            >
              <span className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow transition-transform ${
                isOnline ? 'translate-x-7' : 'translate-x-1'
              }`} />
            </button>
          </div>
        </div>
      )}

      {/* Identity */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-50">
          <div className="w-16 h-16 rounded-full bg-orange/20 flex items-center justify-center font-black text-xl text-orange-dark flex-shrink-0">
            {initials}
          </div>
          <div className="min-w-0">
            <div className="font-black text-lg text-gray-900 truncate">
              {profile?.full_name || 'Shopper'}
            </div>
            <div className="text-sm text-gray-400 truncate">{profile?.email}</div>
            {shopper && (
              <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                <Bike size={11} />
                {shopper.rating ? `⭐ ${Number(shopper.rating).toFixed(1)}` : 'Neu'}
                {shopper.total_deliveries ? ` · ${shopper.total_deliveries} Lieferungen` : ''}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-black text-gray-400 uppercase tracking-wide mb-2 block">Name</label>
            <div className="flex items-center gap-2 border-2 border-gray-100 rounded-xl px-4 py-3 focus-within:border-orange transition-colors">
              <User size={16} className="text-gray-400 flex-shrink-0" />
              <input value={name} onChange={e => setName(e.target.value)}
                className="flex-1 outline-none text-sm bg-transparent" />
            </div>
          </div>

          <div>
            <label className="text-xs font-black text-gray-400 uppercase tracking-wide mb-2 block">E-Mail</label>
            <div className="flex items-center gap-2 border-2 border-gray-50 bg-gray-50 rounded-xl px-4 py-3">
              <Mail size={16} className="text-gray-300 flex-shrink-0" />
              <input value={profile?.email || ''} disabled
                className="flex-1 outline-none text-sm bg-transparent text-gray-400" />
            </div>
          </div>

          <div>
            <label className="text-xs font-black text-gray-400 uppercase tracking-wide mb-2 block">
              Telefon <span className="font-normal normal-case">(für Kunden erreichbar)</span>
            </label>
            <div className="flex items-center gap-2 border-2 border-gray-100 rounded-xl px-4 py-3 focus-within:border-orange transition-colors">
              <Phone size={16} className="text-gray-400 flex-shrink-0" />
              <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+49 ..."
                className="flex-1 outline-none text-sm bg-transparent" />
            </div>
          </div>
        </div>
      </div>

      {/* Working area */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
        <div className="flex items-center gap-2 mb-1">
          <MapPin size={16} className="text-gray-400" />
          <h2 className="font-black text-gray-900">Einsatzgebiet</h2>
        </div>
        <p className="text-sm text-gray-500 mb-5">
          Ihre Adresse bestimmt, welche Aufträge Sie sehen. Sie wird Kunden nicht angezeigt.
        </p>

        <button
          onClick={useMyLocation}
          disabled={geocoding}
          className="w-full flex items-center gap-2.5 border-2 border-orange/20 bg-orange/5 text-orange-dark rounded-xl px-4 py-3 mb-4 font-bold text-sm hover:bg-orange hover:text-black transition-all disabled:opacity-60"
        >
          {geocoding
            ? <Loader2 size={17} className="animate-spin flex-shrink-0" />
            : <Navigation size={17} className="flex-shrink-0" />}
          Aktuellen Standort verwenden
        </button>

        <div className="flex flex-col gap-3 mb-5">
          <div className="flex items-center gap-2 border-2 border-gray-100 rounded-xl px-4 py-3 focus-within:border-orange transition-colors">
            <MapPin size={16} className="text-gray-400 flex-shrink-0" />
            <input
              value={address}
              onChange={e => { setAddress(e.target.value); setCoords(null) }}
              placeholder="Straße und Hausnummer"
              className="flex-1 outline-none text-sm bg-transparent"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <input
              value={zip}
              onChange={e => { setZip(e.target.value); setCoords(null) }}
              placeholder="PLZ"
              className="border-2 border-gray-100 rounded-xl px-4 py-3 text-sm outline-none focus:border-orange transition-colors"
            />
            <input
              value={city}
              onChange={e => { setCity(e.target.value); setCoords(null) }}
              placeholder="Stadt"
              className="col-span-2 border-2 border-gray-100 rounded-xl px-4 py-3 text-sm outline-none focus:border-orange transition-colors"
            />
          </div>

          {!coords && address.trim() && (
            <button
              onClick={geocode}
              disabled={geocoding}
              className="text-xs font-bold text-orange-dark border border-orange/30 rounded-xl px-4 py-2.5 hover:bg-orange/5 transition-all disabled:opacity-50"
            >
              {geocoding ? 'Wird geprüft…' : 'Adresse prüfen'}
            </button>
          )}

          {coords && (
            <p className="text-xs text-green-600 font-bold flex items-center gap-1">
              <CheckCircle2 size={13} /> Adresse bestätigt
            </p>
          )}
        </div>

        <div>
          <label className="text-xs font-black text-gray-400 uppercase tracking-wide mb-2 block">
            Einsatzradius
          </label>
          <div className="grid grid-cols-4 gap-2">
            {RADIUS_OPTIONS.map(r => (
              <button
                key={r}
                onClick={() => setRadius(r)}
                className={`py-2.5 rounded-xl text-sm font-bold border-2 transition-all ${
                  radius === r
                    ? 'border-orange bg-orange/10 text-orange-dark'
                    : 'border-gray-100 text-gray-500 hover:border-gray-200'
                }`}
              >{r} km</button>
            ))}
          </div>
          <p className="text-[11px] text-gray-400 mt-2">
            Sie sehen nur Aufträge innerhalb dieses Radius um Ihre Adresse.
          </p>
        </div>

        <button onClick={saveProfile} disabled={saving} className="w-full bg-orange text-black font-black rounded-xl py-3.5 text-sm mt-5 hover:bg-orange-dark hover:text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
          {saving ? <Loader2 size={16} className="animate-spin" /> : <><Save size={16} /> Speichern</>}
        </button>
      </div>

      {/* Password */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex items-center gap-2 mb-1">
          <Lock size={16} className="text-gray-400" />
          <h2 className="font-black text-gray-900">Passwort ändern</h2>
        </div>
        <p className="text-sm text-gray-500 mb-5">Mindestens 8 Zeichen.</p>

        {pwError && (
          <div className="flex items-start gap-2 bg-red/5 border border-red/20 rounded-xl px-3.5 py-3 mb-4">
            <AlertCircle size={15} className="text-red flex-shrink-0 mt-0.5" />
            <span className="text-xs text-red font-medium">{pwError}</span>
          </div>
        )}

        <div className="flex flex-col gap-3 mb-4">
          <div className="flex items-center gap-2 border-2 border-gray-100 rounded-xl px-4 py-3 focus-within:border-orange transition-colors">
            <Lock size={16} className="text-gray-400 flex-shrink-0" />
            <input
              type={showPw ? 'text' : 'password'}
              value={newPw} onChange={e => setNewPw(e.target.value)}
              placeholder="Neues Passwort" autoComplete="new-password"
              className="flex-1 outline-none text-sm bg-transparent"
            />
            <button type="button" onClick={() => setShowPw(v => !v)} className="text-gray-300 hover:text-gray-500">
              {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          <div className={`flex items-center gap-2 border-2 rounded-xl px-4 py-3 transition-colors ${
            confirmPw && newPw !== confirmPw ? 'border-red/40' : 'border-gray-100 focus-within:border-orange'
          }`}>
            <Lock size={16} className="text-gray-400 flex-shrink-0" />
            <input
              type={showPw ? 'text' : 'password'}
              value={confirmPw} onChange={e => setConfirmPw(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && changePassword()}
              placeholder="Bestätigen" autoComplete="new-password"
              className="flex-1 outline-none text-sm bg-transparent"
            />
            {confirmPw && newPw === confirmPw && <CheckCircle2 size={15} className="text-green-500" />}
          </div>
        </div>

        <button
          onClick={changePassword}
          disabled={pwSaving || !newPw || !confirmPw}
          className="w-full border-2 border-gray-200 text-gray-700 font-black rounded-xl py-3 text-sm hover:border-orange hover:text-orange-dark transition-all disabled:opacity-40"
        >
          {pwSaving ? 'Wird geändert…' : 'Passwort ändern'}
        </button>
      </div>
    </div>
  )
}
