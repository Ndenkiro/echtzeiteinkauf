// app/page.tsx — Landing page (Server Component)
import { supabaseServer } from '@/lib/supabase'
import { Navbar } from '@/components/layout/navbar'
import { Hero } from '@/components/shop/hero'
import { StoreGrid } from '@/components/shop/store-grid'
import { HowItWorks } from '@/components/shop/how-it-works'
import { Features } from '@/components/shop/features'
import { ShopperCTA } from '@/components/shop/shopper-cta'
import { Footer } from '@/components/layout/footer'

export const revalidate = 300 // ISR: refresh every 5 min

export default async function HomePage() {
  const supabase = supabaseServer()

  // Fetch active stores (server-side, cached)
  const { data: stores } = await supabase
    .from('stores')
    .select('id, slug, name, chain, store_type, city, delivery_fee, logo_url, is_active, opening_hours')
    .eq('is_active', true)
    .order('name')

  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <StoreGrid stores={stores ?? []} />
        <HowItWorks />
        <Features />
        <ShopperCTA />
      </main>
      <Footer />
    </>
  )
}
