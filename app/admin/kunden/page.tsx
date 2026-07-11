// app/admin/kunden/page.tsx
import { supabaseServer } from '@/lib/supabase'

export default async function AdminKundenPage() {
  const supabase = supabaseServer()
  const { data: kunden } = await supabase
    .from('users')
    .select('id, full_name, email, created_at, phone')
    .eq('role', 'customer')
    .order('created_at', { ascending: false })

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-black text-gray-900">Kunden</h1>
        <p className="text-sm text-gray-500 mt-1">{kunden?.length || 0} registrierte Kunden</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {!kunden?.length ? (
          <div className="p-14 text-center text-gray-400 text-sm">Keine Kunden vorhanden</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-5 py-3.5 font-black text-gray-500 text-xs uppercase tracking-wide">Name</th>
                <th className="text-left px-5 py-3.5 font-black text-gray-500 text-xs uppercase tracking-wide">E-Mail</th>
                <th className="text-left px-5 py-3.5 font-black text-gray-500 text-xs uppercase tracking-wide">Telefon</th>
                <th className="text-left px-5 py-3.5 font-black text-gray-500 text-xs uppercase tracking-wide">Registriert</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {kunden.map((k: any) => (
                <tr key={k.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-4 font-bold text-gray-900">{k.full_name || '—'}</td>
                  <td className="px-5 py-4 text-gray-600">{k.email}</td>
                  <td className="px-5 py-4 text-gray-400">{k.phone || '—'}</td>
                  <td className="px-5 py-4 text-gray-400 text-xs">
                    {new Date(k.created_at).toLocaleDateString('de-DE')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
