'use client'
// app/shopper-portal/dokumente/page.tsx
import { useEffect, useState } from 'react'
import { supabaseBrowser } from '@/lib/supabase'
import { toast } from 'sonner'
import { Upload, FileText, CheckCircle2, Clock, XCircle, Car, Bike, PersonStanding, Send } from 'lucide-react'

type DocType = 'fuehrungszeugnis' | 'aufenthaltstitel' | 'personalausweis' | 'fuehrerschein'

const REQUIRED_DOCS: { type: DocType; label: string; desc: string; required: boolean }[] = [
  { type: 'fuehrungszeugnis', label: 'Führungszeugnis', desc: 'Polizeiliches Führungszeugnis (Belegart "O" / zur Vorlage bei einer Behörde)', required: true },
  { type: 'personalausweis',  label: 'Personalausweis',  desc: 'Vorder- und Rückseite, gut lesbar', required: true },
  { type: 'aufenthaltstitel', label: 'Aufenthaltstitel', desc: 'Falls Sie keine EU-Staatsbürgerschaft besitzen', required: false },
  { type: 'fuehrerschein',    label: 'Führerschein',     desc: 'Nur erforderlich bei Fahrzeugtyp Auto oder Roller', required: false },
]

export default function DokumentePage() {
  const supabase = supabaseBrowser()
  const [userId, setUserId] = useState<string | null>(null)
  const [appId, setAppId] = useState<string | null>(null)
  const [appStatus, setAppStatus] = useState('draft')
  const [vehicleType, setVehicleType] = useState<'bike'|'scooter'|'car'|'walk'>('bike')
  const [docs, setDocs] = useState<Record<string, any>>({})
  const [uploading, setUploading] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: profile } = await supabase.from('users').select('id').eq('auth_id', user.id).single()
    if (!profile) return
    setUserId(profile.id)

    let { data: app } = await supabase.from('shopper_applications').select('*').eq('user_id', profile.id).maybeSingle()
    if (!app) {
      const { data: created } = await supabase.from('shopper_applications').insert({ user_id: profile.id, status: 'draft' }).select().single()
      app = created
    }
    setAppId(app.id)
    setAppStatus(app.status)
    setVehicleType(app.vehicle_type || 'bike')

    const { data: documents } = await supabase.from('shopper_documents').select('*').eq('application_id', app.id)
    const map: Record<string, any> = {}
    documents?.forEach(d => { map[d.doc_type] = d })
    setDocs(map)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const updateVehicle = async (v: typeof vehicleType) => {
    setVehicleType(v)
    await supabase.from('shopper_applications').update({ vehicle_type: v }).eq('id', appId)
  }

  const handleUpload = async (docType: DocType, file: File) => {
    if (!appId || !userId) return
    setUploading(docType)
    try {
      const path = `${userId}/${docType}-${Date.now()}.${file.name.split('.').pop()}`
      const { error: uploadError } = await supabase.storage.from('shopper-docs').upload(path, file)
      if (uploadError) throw uploadError

      const { data, error } = await supabase.from('shopper_documents').upsert({
        application_id: appId,
        doc_type: docType,
        file_path: path,
        file_name: file.name,
        status: 'pending',
      }, { onConflict: 'application_id,doc_type' }).select().single()

      if (error) throw error
      setDocs(prev => ({ ...prev, [docType]: data }))
      toast.success(`${file.name} hochgeladen ✓`)
    } catch (err: any) {
      toast.error('Upload fehlgeschlagen: ' + err.message)
    } finally {
      setUploading(null)
    }
  }

  const submitApplication = async () => {
    const requiredOk = REQUIRED_DOCS.filter(d => d.required).every(d => docs[d.type])
    if (!requiredOk) { toast.error('Bitte alle Pflichtdokumente hochladen'); return }

    await supabase.from('shopper_applications').update({
      status: 'under_review',
      submitted_at: new Date().toISOString(),
    }).eq('id', appId)
    setAppStatus('under_review')
    toast.success('Bewerbung eingereicht! Wir prüfen Ihre Dokumente innerhalb von 2–3 Werktagen.')
  }

  if (loading) return <div className="text-sm text-gray-400">Lädt...</div>

  const allRequiredUploaded = REQUIRED_DOCS.filter(d => d.required).every(d => docs[d.type])

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-gray-900">Dokumente &amp; Verifizierung</h1>
        <p className="text-sm text-gray-500 mt-1">Laden Sie die erforderlichen Dokumente hoch, um als Shopper freigeschaltet zu werden</p>
      </div>

      {appStatus === 'under_review' && (
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 mb-6 flex items-center gap-3">
          <Clock size={20} className="text-blue-600 flex-shrink-0" />
          <div>
            <div className="font-bold text-sm text-blue-900">Ihre Bewerbung wird geprüft</div>
            <div className="text-xs text-blue-700">Wir melden uns innerhalb von 2–3 Werktagen bei Ihnen.</div>
          </div>
        </div>
      )}
      {appStatus === 'approved' && (
        <div className="bg-green-50 border border-green-100 rounded-2xl p-5 mb-6 flex items-center gap-3">
          <CheckCircle2 size={20} className="text-green-600 flex-shrink-0" />
          <div>
            <div className="font-bold text-sm text-green-900">Sie sind verifiziert!</div>
            <div className="text-xs text-green-700">Sie können jetzt Aufträge annehmen.</div>
          </div>
        </div>
      )}
      {appStatus === 'rejected' && (
        <div className="bg-red-light border border-red/20 rounded-2xl p-5 mb-6 flex items-center gap-3">
          <XCircle size={20} className="text-red flex-shrink-0" />
          <div>
            <div className="font-bold text-sm text-red">Bewerbung abgelehnt</div>
            <div className="text-xs text-red/80">Bitte kontaktieren Sie unseren Support für weitere Informationen.</div>
          </div>
        </div>
      )}

      {/* Vehicle type */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-5">
        <h2 className="font-black text-sm text-gray-900 mb-4">Fahrzeugtyp</h2>
        <div className="grid grid-cols-3 gap-3">
          {[
            { v: 'bike' as const,    icon: Bike,            label: 'Fahrrad' },
            { v: 'car' as const,     icon: Car,             label: 'Auto' },
            { v: 'walk' as const,    icon: PersonStanding,  label: 'Zu Fuß' },
          ].map(opt => {
            const Icon = opt.icon
            const active = vehicleType === opt.v
            return (
              <button
                key={opt.v}
                onClick={() => updateVehicle(opt.v)}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${active ? 'border-orange bg-orange/5' : 'border-gray-100 hover:border-gray-200'}`}
              >
                <Icon size={22} className={active ? 'text-orange-dark' : 'text-gray-400'} />
                <span className={`text-xs font-bold ${active ? 'text-orange-dark' : 'text-gray-500'}`}>{opt.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Documents */}
      <div className="flex flex-col gap-3 mb-6">
        {REQUIRED_DOCS.filter(d => d.type !== 'fuehrerschein' || vehicleType === 'car' || vehicleType === 'scooter').map(doc => {
          const uploaded = docs[doc.type]
          const isUploading = uploading === doc.type
          return (
            <div key={doc.type} className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="flex items-start gap-4">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${uploaded ? 'bg-green-50' : 'bg-gray-50'}`}>
                  {uploaded ? <CheckCircle2 size={20} className="text-green-600" /> : <FileText size={20} className="text-gray-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-gray-900">{doc.label}</span>
                    {doc.required && <span className="text-[10px] font-bold text-red bg-red-light px-1.5 py-0.5 rounded">Pflicht</span>}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5 mb-3">{doc.desc}</p>

                  {uploaded ? (
                    <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                      <span className="text-xs font-medium text-gray-600 truncate">{uploaded.file_name}</span>
                      <label className="text-xs font-bold text-red cursor-pointer hover:underline flex-shrink-0 ml-2">
                        Ersetzen
                        <input type="file" className="hidden" accept="image/*,.pdf" onChange={e => e.target.files?.[0] && handleUpload(doc.type, e.target.files[0])} />
                      </label>
                    </div>
                  ) : (
                    <label className={`flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-lg py-3 cursor-pointer hover:border-red hover:bg-red/[0.02] transition-all ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                      <Upload size={14} className="text-gray-400" />
                      <span className="text-xs font-bold text-gray-500">{isUploading ? 'Wird hochgeladen...' : 'Datei auswählen (PDF, JPG, PNG)'}</span>
                      <input type="file" className="hidden" accept="image/*,.pdf" onChange={e => e.target.files?.[0] && handleUpload(doc.type, e.target.files[0])} />
                    </label>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {appStatus === 'draft' || appStatus === 'documents_pending' ? (
        <button onClick={submitApplication} disabled={!allRequiredUploaded} className="btn-red w-full py-3.5">
          <Send size={16} /> Bewerbung einreichen
        </button>
      ) : null}
    </div>
  )
}
