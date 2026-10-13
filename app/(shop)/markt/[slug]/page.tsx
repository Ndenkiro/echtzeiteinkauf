// app/(shop)/markt/[slug]/page.tsx — Store catalog page
import { notFound } from 'next/navigation'
import { supabaseServer } from '@/lib/supabase'
import { Navbar } from '@/components/layout/navbar'
import { ProductCatalog } from '@/components/shop/product-catalog'
import { CartDrawer } from '@/components/shop/cart-drawer'

type Props = { params: { slug: string } }

export async function generateMetadata({ params }: Props) {
  const supabase = supabaseServer()
  const { data: store } = await supabase
    .from('stores').select('name, city').eq('slug', params.slug).single()
  if (!store) return { title: 'Markt nicht gefunden' }
  return { title: `${store.name} — Echtzeiteinkauf ${store.city}` }
}

export default async function StorePage({ params }: Props) {
  const supabase = supabaseServer()

  const { data: store } = await supabase
    .from('stores')
    .select('*')
    .eq('slug', params.slug)
    .eq('is_active', true)
    .single()

  if (!store) notFound()

  // Only products a customer can actually judge and buy:
  // complete means name + price + photo-or-emoji + unit
  const { data: products } = await supabase
    .from('products')
    .select('*')
    .eq('store_id', store.id)
    .eq('in_stock', true)
    .eq('is_complete', true)
    .order('category')
    .order('sort_order')
    .order('name')

  const categories = Array.from(
    new Set((products ?? []).map(p => p.category).filter(Boolean) as string[])
  )

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gray-50">
        <ProductCatalog
          store={store}
          products={products ?? []}
          categories={categories}
        />
      </main>
      <CartDrawer />
    </>
  )
}
