'use client'
// components/shopper/mission-actions.tsx — GPS tracking + proof photos
import { useEffect, useRef, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import {
  Camera, Loader2, CheckCircle2, X, ShoppingCart,
  Truck, Navigation, AlertCircle, Receipt
} from 'lucide-react'
import { toast } from 'sonner'

const SUPABASE_URL = 'https://wpxpgszzzfhhsaunolyq.supabase.co'
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndweHBnc3p6emZoaHNhdW5vbHlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0Mzg5ODQsImV4cCI6MjA5NzAxNDk4NH0.8_DVpLNwItAlkn_gL9a4dn-lZ00I8iifX2Cb9N_W-4U'

// ── Live GPS while the order is in transit ─────────────────────
export function useLiveTracking(orderId: string | null, active: boolean) {
  const watchId = useRef<number | null>(null)
  const [tracking, setTracking] = useState(false)

  useEffect(() => {
    if (!orderId || !active || !navigator.geolocation) {
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current)
        watchId.current = null
        setTracking(false)
      }
      return
    }

    const supabase = createBrowserClient(SUPABASE_URL, SUPABASE_ANON)
    let last = 0

    watchId.current = navigator.geolocation.watchPosition(
      pos => {
        const now = Date.now()
        // Throttle: one point every 15 s
        if (now - last < 15000) return
        last = now
        supabase.rpc('push_tracking_point', {
          p_order_id: orderId,
          p_lat: pos.coords.latitude,
          p_lng: pos.coords.longitude,
          p_accuracy: pos.coords.accuracy ?? null,
        })
      },
      () => { toast.error('Standortzugriff nötig für die Lieferung') },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 }
    )
    setTracking(true)

    return () => {
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current)
        watchId.current = null
      }
      setTracking(false)
    }
  }, [orderId, active])

  return tracking
}

// ── Photo capture + status advance ─────────────────────────────
type Props = {
  order: any
  onDone: () => void
}

export function MissionActions({ order, onDone }: Props) {
  const [busy, setBusy] = useState(false)
  const [modal, setModal] = useState<'receipt' | 'delivery' | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [amount, setAmount] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const supabase = createBrowserClient(SUPABASE_URL, SUPABASE_ANON)
  const isTracking = useLiveTracking(order.id, order.status === 'in_transit')

  const pickPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    if (f.size > 8 * 1024 * 1024) { toast.error('Bild zu groß (max. 8 MB)'); return }
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  const closeModal = () => {
    setModal(null); setPreview(null); setFile(null); setAmount('')
    if (fileRef.current) fileRef.current.value = ''
  }

  const startShopping = async () => {
    setBusy(true)
    const { data, error } = await supabase.rpc('advance_order_status', {
      p_order_id: order.id, p_status: 'shopping',
      p_photo_url: null, p_amount: null,
    })
    setBusy(false)
    if (error || !data?.ok) { toast.error('Fehler'); return }
    toast.success('Einkauf gestartet 🛒')
    onDone()
  }

  const submitPhoto = async () => {
    if (!file) { toast.error('Bitte Foto aufnehmen'); return }
    if (modal === 'receipt' && !amount) { toast.error('Bitte Kassenbon-Betrag eingeben'); return }

    setBusy(true)
    const ext = file.name.split('.').pop() || 'jpg'
    const path = `${order.id}/${modal}-${Date.now()}.${ext}`

    const { error: upErr } = await supabase.storage
      .from('order-proofs').upload(path, file, { upsert: true })
    if (upErr) { setBusy(false); toast.error('Upload fehlgeschlagen'); return }

    const { data: { publicUrl } } = supabase.storage.from('order-proofs').getPublicUrl(path)

    const { data, error } = await supabase.rpc('advance_order_status', {
      p_order_id: order.id,
      p_status: modal === 'receipt' ? 'in_transit' : 'delivered',
      p_photo_url: publicUrl,
      p_amount: modal === 'receipt' ? Number(amount) : null,
    })
    setBusy(false)

    if (error || !data?.ok) { toast.error('Fehler beim Speichern'); return }
    toast.success(modal === 'receipt'
      ? 'Kassenbon gespeichert — Lieferung gestartet 🚗'
      : 'Lieferung bestätigt! 🎉 Verdienst gutgeschrieben.')
    closeModal()
    onDone()
  }

  return (
    <>
      {/* Live GPS badge */}
      {order.status === 'in_transit' && (
        <div className={`flex items-center gap-2 rounded-xl px-3 py-2 mb-3 text-xs font-bold ${
          isTracking ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-700'
        }`}>
          <Navigation size={13} className={isTracking ? 'animate-pulse' : ''} />
          {isTracking
            ? 'GPS aktiv — der Kunde sieht Ihre Position'
            : 'GPS nicht aktiv — bitte Standortzugriff erlauben'}
        </div>
      )}

      <div className="flex gap-2">
        {order.status === 'confirmed' && (
          <button onClick={startShopping} disabled={busy}
            className="flex-1 bg-gray-900 text-white font-black rounded-xl py-2.5 text-sm hover:bg-black transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            {busy ? <Loader2 size={15} className="animate-spin" /> : <><ShoppingCart size={15} /> Einkauf starten</>}
          </button>
        )}

        {order.status === 'shopping' && (
          <button onClick={() => setModal('receipt')}
            className="flex-1 bg-gray-900 text-white font-black rounded-xl py-2.5 text-sm hover:bg-black transition-colors flex items-center justify-center gap-2">
            <Receipt size={15} /> Kassenbon &amp; losfahren
          </button>
        )}

        {order.status === 'in_transit' && (
          <button onClick={() => setModal('delivery')}
            className="flex-1 bg-green-600 text-white font-black rounded-xl py-2.5 text-sm hover:bg-green-700 transition-colors flex items-center justify-center gap-2">
            <Camera size={15} /> Lieferung bestätigen
          </button>
        )}
      </div>

      {/* Photo modal */}
      {modal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center sm:justify-center p-0 sm:p-4">
          <div className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-6 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-black text-gray-900">
                {modal === 'receipt' ? 'Kassenbon fotografieren' : 'Lieferung fotografieren'}
              </h2>
              <button onClick={closeModal}><X size={20} className="text-gray-400" /></button>
            </div>
            <p className="text-xs text-gray-400 mb-5">
              {modal === 'receipt'
                ? 'Fotografieren Sie den Kassenbon als Nachweis für den Kunden.'
                : 'Fotografieren Sie die abgestellte Lieferung als Zustellnachweis.'}
            </p>

            <input ref={fileRef} type="file" accept="image/*" capture="environment"
              className="hidden" onChange={pickPhoto} />

            {preview ? (
              <div className="relative mb-4">
                <img src={preview} alt="" className="w-full rounded-2xl object-cover max-h-64" />
                <button
                  onClick={() => { setPreview(null); setFile(null); if (fileRef.current) fileRef.current.value = '' }}
                  className="absolute top-2 right-2 w-8 h-8 bg-black/60 text-white rounded-full flex items-center justify-center"
                >
                  <X size={15} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                className="w-full border-2 border-dashed border-gray-200 rounded-2xl py-10 flex flex-col items-center gap-2 hover:border-orange transition-colors mb-4"
              >
                <Camera size={28} className="text-gray-300" />
                <span className="text-sm font-bold text-gray-500">Foto aufnehmen</span>
              </button>
            )}

            {modal === 'receipt' && (
              <div className="mb-4">
                <label className="text-xs font-black text-gray-400 uppercase tracking-wide mb-2 block">
                  Betrag auf dem Kassenbon
                </label>
                <div className="flex items-center gap-2 border-2 border-gray-100 rounded-xl px-4 py-3 focus-within:border-orange transition-colors">
                  <input
                    type="number" step="0.01" min="0"
                    value={amount} onChange={e => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="flex-1 outline-none text-lg font-black bg-transparent"
                  />
                  <span className="font-black text-gray-300">€</span>
                </div>
                <p className="text-[10px] text-gray-400 mt-1.5">
                  Erwartet: ca. {Number(order.subtotal).toFixed(2)} €
                </p>
              </div>
            )}

            <div className="bg-blue-50 rounded-xl p-3 mb-4 flex gap-2">
              <AlertCircle size={14} className="text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-[11px] text-blue-800 leading-relaxed">
                {modal === 'receipt'
                  ? 'Nach dem Absenden startet die GPS-Verfolgung, damit der Kunde Ihre Anfahrt sieht.'
                  : 'Mit der Bestätigung wird Ihr Verdienst gutgeschrieben und die GPS-Verfolgung beendet.'}
              </p>
            </div>

            <button
              onClick={submitPhoto}
              disabled={busy || !file || (modal === 'receipt' && !amount)}
              className={`w-full font-black rounded-xl py-3.5 text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-40 ${
                modal === 'receipt'
                  ? 'bg-gray-900 text-white hover:bg-black'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {busy ? <Loader2 size={16} className="animate-spin" />
                : modal === 'receipt' ? <><Truck size={16} /> Losfahren</>
                : <><CheckCircle2 size={16} /> Lieferung abschließen</>}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
