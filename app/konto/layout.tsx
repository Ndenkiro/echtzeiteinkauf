// app/konto/layout.tsx
import { redirect } from 'next/navigation'
import { supabaseServer } from '@/lib/supabase'
import { AccountSidebar } from '@/components/account/sidebar'

export default async function KontoLayout({ children }: { children: React.ReactNode }) {
  const supabase = supabaseServer()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/anmelden?next=/konto')

  const { data: profile } = await supabase
    .from('users')
    .select('id, full_name, email, role')
    .eq('auth_id', authUser.id)
    .single()

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <AccountSidebar name={profile?.full_name || 'Kunde'} email={profile?.email || authUser.email || ''} />
      <main className="flex-1 ml-0 md:ml-64 p-6 md:p-10">{children}</main>
    </div>
  )
}
