'use client'
// app/admin/shoppers/page.tsx
import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { toast } from 'sonner'
import { CheckCircle2, XCircle, Eye, FileText, Clock, User } from 'lucide-react'

const STATUS_CFG: Record<string, { label: string; color: string }> = {
  draft:             { label: 'Entwurf',       color: 'bg-gray-100 text-gray-500' },
  documents_pending: { label: 'Dok. fehlen',   color: 'bg-yellow-50 text-yellow-700' },
  under_review:      { label: 'In Prüfung',    color: 'bg-blue-50 text-blue-700' },
  approved:          { label: 'Freigegeben ✓', color: 'bg-green-50 text-green-700' },
  rejected:          { label: 'Abgelehnt',     color: 'bg-red/10 text-red' },
}

export default function AdminShoppersPage() {
  const [apps, setApps] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<any>(null)
  const [docs, setDocs] = useState<any[]>([])
  const [actionLoading, setActionLoading] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  const supabase = createBrowserClient(
    'https://wpxpgszzzfhhsaunolyq.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndweHBnc3p6emZoaHNhdW5vbHlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0Mzg5ODQsImV4cCI6MjA5NzAxNDk4NH0.8_DVpLNwItAlkn_gL9a4dn-lZ00I8iifX2Cb9N_W-4U'
  )

  const load = async () => {
    const { data } = await supabase
      .from('shopper_applications')
      .select('*, users(full_name, email, created_at)')
      .order('created_at', { ascending: false })
    setApps(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const openDetail = async (app: any) => {
    setSelected(app)
    const { data } = await supabase
      .from('shopper_documents')
      .select('*')
      .eq('application_id', app.id)
    setDocs(data || [])
  }

  const approve = async () => {
    if (!selected) return
    setActionLoading(true)
    const { error } = await supabase.rpc('approve_shopper', { application_id: selected.id })
    setActionLoading(false)
    if (error) { toast.error('Fehler: ' + error.message); return }
    toast.success('Shopper freigeschaltet! ✓')
    setSelected(null)
    load()
  }

  const reject = async () => {
    if (!selected) return
    setActionLoading(true)
    const { error } = await supabase.rpc('reject_shopper', {
      application_id: selected.id,
      reason: rejectReason || null,
    })
    setActionLoading(false)
    if (error) { toast.error('Fehler: ' + error.message); return }
    toast.success('Bewerbung abgelehnt')
    setSelected(null)
    setRejectReason('')
    load()
  }

  const getDocUrl = async (path: string) => {
    const { data } = await supabase.storage.from('shopper-docs').createSignedUrl(path, 60)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  const DOC_LABELS: Record<string, string> = {
    fuehrungszeugnis: 'Führungszeugnis',
    personalausweis:  'Personalausweis',
    aufenthaltstitel: 'Aufenthaltstitel',
    fuehrerschein:    'Führerschein',
  }

  if (loading) return <div className="text-sm text-gray-400">Lädt...</div>

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-black text-gray-900">Shopper-Bewerbungen</h1>
        <p className="text-sm text-gray-500 mt-1">{apps.length} Bewerbungen insgesamt</p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {Object.entries(STATUS_CFG).map(([k, v]) => {
          const count = apps.filter(a => a.status === k).length
          if (count === 0) return null
          return (
            <span key={k} className={`text-xs font-bold px-3 py-1.5 rounded-full ${v.color}`}>
              {v.label} ({count})
            </span>
          )
        })}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {apps.length === 0 ? (
          <div className="p-14 text-center text-gray-400 text-sm">Keine Bewerbungen vorhanden</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-5 py-3.5 font-black text-gray-500 text-xs uppercase tracking-wide">Name</th>
                <th className="text-left px-5 py-3.5 font-black text-gray-500 text-xs uppercase tracking-wide">Fahrzeug</th>
                <th className="text-left px-5 py-3.5 font-black text-gray-500 text-xs uppercase tracking-wide">Eingereicht</th>
                <th className="text-left px-5 py-3.5 font-black text-gray-500 text-xs uppercase tracking-wide">Status</th>
                <th className="px-5 py-3.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {apps.map((app: any) => {
                const cfg = STATUS_CFG[app.status] || STATUS_CFG.draft
                return (
                  <tr key={app.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="font-bold text-gray-900">{app.user?.full_name || '—'}</div>
                      <div className="text-xs text-gray-400">{app.user?.email}</div>
                    </td>
                    <td className="px-5 py-4 text-gray-600 capitalize">{app.vehicle_type || '—'}</td>
                    <td className="px-5 py-4 text-gray-400 text-xs">
                      {app.submitted_at
                        ? new Date(app.submitted_at).toLocaleDateString('de-DE')
                        : '—'}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${cfg.color}`}>{cfg.label}</span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => openDetail(app)}
                        className="flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-red transition-colors ml-auto"
                      >
                        <Eye size={14} /> Details
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Detail modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-3xl p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-red/10 flex items-center justify-center">
                <User size={22} className="text-red" />
              </div>
              <div>
                <div className="font-black text-gray-900">{selected.users?.full_name}</div>
                <div className="text-sm text-gray-400">{selected.users?.email}</div>
              </div>
              <span className={`ml-auto text-xs font-bold px-2.5 py-1 rounded-full ${STATUS_CFG[selected.status]?.color}`}>
                {STATUS_CFG[selected.status]?.label}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="text-xs font-bold text-gray-400 uppercase mb-1">Fahrzeug</div>
                <div className="font-bold text-gray-900 capitalize">{selected.vehicle_type || '—'}</div>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="text-xs font-bold text-gray-400 uppercase mb-1">Eingereicht</div>
                <div className="font-bold text-gray-900">
                  {selected.submitted_at ? new Date(selected.submitted_at).toLocaleDateString('de-DE') : '—'}
                </div>
              </div>
            </div>

            {/* Documents */}
            <h3 className="font-black text-gray-900 mb-3">Dokumente</h3>
            <div className="flex flex-col gap-2 mb-6">
              {docs.length === 0 ? (
                <p className="text-sm text-gray-400">Keine Dokumente hochgeladen</p>
              ) : docs.map(doc => (
                <button
                  key={doc.id}
                  onClick={() => getDocUrl(doc.file_path)}
                  className="flex items-center gap-3 p-3 border border-gray-100 rounded-xl hover:border-red hover:bg-red/[0.02] transition-all text-left"
                >
                  <FileText size={18} className="text-gray-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm text-gray-900">{DOC_LABELS[doc.doc_type] || doc.doc_type}</div>
                    <div className="text-xs text-gray-400 truncate">{doc.file_name}</div>
                  </div>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                    doc.status === 'verified' ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'
                  }`}>{doc.status === 'verified' ? 'Verifiziert' : 'Ausstehend'}</span>
                </button>
              ))}
            </div>

            {/* Rejection reason */}
            {selected.status === 'under_review' && (
              <div className="mb-5">
                <label className="text-xs font-black text-gray-400 uppercase mb-2 block">Ablehnungsgrund (optional)</label>
                <textarea
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  placeholder="z.B. Dokument unleserlich, Führungszeugnis fehlt..."
                  rows={2}
                  className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 text-sm outline-none focus:border-red transition-colors resize-none"
                />
              </div>
            )}

            {/* Actions */}
            {selected.status === 'under_review' && (
              <div className="flex gap-3">
                <button
                  onClick={reject}
                  disabled={actionLoading}
                  className="flex-1 flex items-center justify-center gap-2 border-2 border-gray-200 text-gray-600 font-black rounded-xl py-3 text-sm hover:border-red hover:text-red transition-all disabled:opacity-50"
                >
                  <XCircle size={16} /> Ablehnen
                </button>
                <button
                  onClick={approve}
                  disabled={actionLoading}
                  className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white font-black rounded-xl py-3 text-sm hover:bg-green-700 transition-all disabled:opacity-50"
                >
                  <CheckCircle2 size={16} /> Freischalten
                </button>
              </div>
            )}

            {selected.status === 'approved' && (
              <div className="bg-green-50 rounded-xl p-4 text-center text-green-700 font-bold text-sm">
                ✓ Shopper ist freigeschaltet
              </div>
            )}

            {selected.status === 'rejected' && (
              <div className="bg-red/10 rounded-xl p-4">
                <div className="text-red font-bold text-sm mb-1">Abgelehnt</div>
                <div className="text-red/70 text-xs">{selected.rejection_reason || 'Kein Grund angegeben'}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
