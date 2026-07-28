// app/konto/layout.tsx
import { redirect } from 'next/navigation'
import { supabaseServer } from '@/lib/supabase'
import { KontoSidebar } from '@/components/account/sidebar'

export const dynamic = 'force-dynamic'

export default async function KontoLayout({ children }: { children: React.ReactNode }) {
  const supabase = supabaseServer()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/anmelden?next=/konto')

  const { data: profile } = await supabase
    .from('users')
    .select('id, full_name, email')
    .eq('auth_id', authUser.id)
    .single()

  if (!profile) redirect('/anmelden')

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <KontoSidebar
        name={profile.full_name || 'Mein Konto'}
        email={profile.email || authUser.email || ''}
      />
      <main className="flex-1 ml-0 md:ml-64 p-6 md:p-10 pb-24 md:pb-10">
        {children}
      </main>
    </div>
  )
}
