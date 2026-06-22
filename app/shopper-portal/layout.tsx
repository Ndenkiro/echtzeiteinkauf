// app/shopper-portal/layout.tsx
import { redirect } from 'next/navigation'
import { supabaseServer } from '@/lib/supabase'
import { ShopperSidebar } from '@/components/shopper-portal/sidebar'

export default async function ShopperPortalLayout({ children }: { children: React.ReactNode }) {
  const supabase = supabaseServer()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/anmelden?next=/shopper-portal')

  const { data: profile } = await supabase
    .from('users')
    .select('id, full_name, email')
    .eq('auth_id', authUser.id)
    .single()

  const { data: application } = await supabase
    .from('shopper_applications')
    .select('status')
    .eq('user_id', profile?.id)
    .maybeSingle()

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <ShopperSidebar
        name={profile?.full_name || 'Shopper'}
        email={profile?.email || authUser.email || ''}
        appStatus={application?.status || 'draft'}
      />
      <main className="flex-1 ml-0 md:ml-64 p-6 md:p-10">{children}</main>
    </div>
  )
}
