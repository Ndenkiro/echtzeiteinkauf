// app/admin/layout.tsx
import { redirect } from 'next/navigation'
import { supabaseServer } from '@/lib/supabase'
import { AdminSidebar } from '@/components/admin/sidebar'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = supabaseServer()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/anmelden?next=/admin')

  const { data: profile } = await supabase
    .from('users')
    .select('id, full_name, email, role')
    .eq('auth_id', authUser.id)
    .single()

  if (profile?.role !== 'admin') redirect('/')

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <AdminSidebar name={profile.full_name || 'Admin'} email={profile.email} />
      <main className="flex-1 ml-0 md:ml-64 p-6 md:p-10">{children}</main>
    </div>
  )
}
