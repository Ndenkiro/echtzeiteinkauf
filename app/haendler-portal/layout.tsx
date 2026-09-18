// app/haendler-portal/layout.tsx
import { redirect } from 'next/navigation'
import { supabaseServer } from '@/lib/supabase'
import { MerchantSidebar } from '@/components/merchant/sidebar'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Händler-Portal — Echtzeiteinkauf' }

export default async function MerchantLayout({ children }: { children: React.ReactNode }) {
  const supabase = supabaseServer()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/anmelden?next=/haendler-portal')

  const { data: profile } = await supabase
    .from('users').select('id, full_name, email, role').eq('auth_id', authUser.id).single()
  if (!profile) redirect('/anmelden')

  const { data: app } = await supabase
    .from('merchant_applications')
    .select('status, business_name, store_id')
    .eq('user_id', profile.id)
    .maybeSingle()

  if (!app) redirect('/haendler')

  return (
    <div className="min-h-screen bg-[#111111] flex">
      <MerchantSidebar
        name={app.business_name}
        email={profile.email || authUser.email || ''}
        status={app.status}
        hasStore={!!app.store_id}
      />
      <main className="flex-1 ml-0 md:ml-64 p-6 md:p-10 pt-20 md:pt-10 pb-24 md:pb-10">
        <div className="max-w-4xl">{children}</div>
      </main>
    </div>
  )
}
