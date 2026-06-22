// app/shopper-portal/verdienst/page.tsx
import { supabaseServer } from '@/lib/supabase'
import { Wallet, TrendingUp, Calendar } from 'lucide-react'

export default async function VerdienstPage() {
  const supabase = supabaseServer()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('users').select('id').eq('auth_id', authUser!.id).single()
  const { data: shopper } = await supabase.from('shoppers').select('id').eq('user_id', profile?.id).maybeSingle()

  const { data: earnings } = shopper
    ? await supabase.from('shopper_earnings').select('*').eq('shopper_id', shopper.id).order('created_at', { ascending: false }).limit(30)
    : { data: [] }

  const total = (earnings || []).reduce((a, e) => a + Number(e.amount), 0)
  const thisMonth = (earnings || []).filter(e => new Date(e.created_at).getMonth() === new Date().getMonth())
    .reduce((a, e) => a + Number(e.amount), 0)
  const pending = (earnings || []).filter(e => e.status === 'pending').reduce((a, e) => a + Number(e.amount), 0)

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-black text-gray-900">Verdienst</h1>
        <p className="text-sm text-gray-500 mt-1">Übersicht über Ihre Einnahmen bei Echtzeiteinkauf</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <Wallet size={18} className="text-orange-dark mb-2" />
          <div className="text-xs font-bold text-gray-400 uppercase mb-1">Gesamt</div>
          <div className="font-black text-xl text-gray-900">{total.toFixed(2)} €</div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <TrendingUp size={18} className="text-green-600 mb-2" />
          <div className="text-xs font-bold text-gray-400 uppercase mb-1">Diesen Monat</div>
          <div className="font-black text-xl text-gray-900">{thisMonth.toFixed(2)} €</div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <Calendar size={18} className="text-blue-500 mb-2" />
          <div className="text-xs font-bold text-gray-400 uppercase mb-1">Ausstehend</div>
          <div className="font-black text-xl text-gray-900">{pending.toFixed(2)} €</div>
        </div>
      </div>

      <h2 className="font-black text-sm text-gray-900 mb-3">Transaktionen</h2>
      {!earnings || earnings.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-14 text-center">
          <Wallet size={32} className="text-gray-300 mx-auto mb-3" />
          <p className="font-bold text-gray-900 mb-1">Noch keine Einnahmen</p>
          <p className="text-sm text-gray-400">Ihre Verdienste erscheinen hier nach abgeschlossenen Lieferungen.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
          {earnings.map((e: any) => (
            <div key={e.id} className="flex items-center justify-between p-4">
              <div>
                <div className="font-bold text-sm text-gray-900 capitalize">{e.type.replace('_', ' ')}</div>
                <div className="text-xs text-gray-400">{new Date(e.created_at).toLocaleDateString('de-DE')}</div>
              </div>
              <div className="text-right">
                <div className="font-black text-sm text-gray-900">+{Number(e.amount).toFixed(2)} €</div>
                <div className={`text-xs font-bold ${e.status === 'paid' ? 'text-green-600' : 'text-orange-dark'}`}>
                  {e.status === 'paid' ? 'Ausgezahlt' : 'Ausstehend'}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
