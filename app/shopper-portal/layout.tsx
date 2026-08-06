// app/shopper-portal/layout.tsx — dark themed shopper workspace
import { redirect } from 'next/navigation'
import { supabaseServer } from '@/lib/supabase'
import { ShopperSidebar } from '@/components/shopper-portal/sidebar'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Shopper-Portal — Echtzeiteinkauf',
}

export default async function ShopperLayout({ children }: { children: React.ReactNode }) {
  const supabase = supabaseServer()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/anmelden?next=/shopper-portal')

  const { data: profile } = await supabase
    .from('users')
    .select('id, full_name, email, role')
    .eq('auth_id', authUser.id)
    .single()

  if (!profile) redirect('/anmelden')

  // A customer landing here goes back to their own space
  if (profile.role === 'customer') redirect('/konto')

  const { data: application } = await supabase
    .from('shopper_applications')
    .select('status')
    .eq('user_id', profile.id)
    .maybeSingle()

  const { data: shopper } = await supabase
    .from('shoppers')
    .select('id, rating, total_deliveries')
    .eq('user_id', profile.id)
    .maybeSingle()

  let isOnline = false
  if (shopper) {
    const { data: loc } = await supabase
      .from('shopper_locations')
      .select('is_online')
      .eq('shopper_id', shopper.id)
      .maybeSingle()
    isOnline = !!loc?.is_online
  }

  return (
    <div className="min-h-screen bg-[#111111] flex">
      <ShopperSidebar
        name={profile.full_name || 'Shopper'}
        email={profile.email || authUser.email || ''}
        appStatus={application?.status || 'draft'}
        rating={shopper?.rating ?? null}
        deliveries={shopper?.total_deliveries ?? 0}
        isOnline={isOnline}
      />
      <main className="flex-1 ml-0 md:ml-64 p-6 md:p-10 pt-20 md:pt-10 pb-24 md:pb-10">
        <div className="max-w-4xl">{children}</div>
      </main>
    </div>
  )
}
