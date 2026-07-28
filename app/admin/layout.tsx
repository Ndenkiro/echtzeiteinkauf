// app/admin/layout.tsx
import { redirect } from 'next/navigation'
import { supabaseServer } from '@/lib/supabase'
import { AdminSidebar } from '@/components/admin/sidebar'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Admin Panel — Echtzeiteinkauf',
  robots: { index: false, follow: false },
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = supabaseServer()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/anmelden?next=/')

  const { data: profile } = await supabase
    .from('users')
    .select('id, full_name, email, role')
    .eq('auth_id', authUser.id)
    .single()

  if (!profile || !['admin', 'subadmin'].includes(profile.role)) {
    redirect('/')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <AdminSidebar
        name={profile.full_name || 'Admin'}
        email={profile.email || authUser.email || ''}
        role={profile.role}
      />
      <main className="flex-1 ml-0 md:ml-64 p-6 md:p-10 pb-24 md:pb-10">
        {children}
      </main>
    </div>
  )
}
