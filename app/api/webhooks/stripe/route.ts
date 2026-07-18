// app/api/webhooks/stripe/route.ts
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-04-10' as any,
})

// Service role client — bypasses RLS (webhook has no user session)
const supabaseAdmin = () => createClient(
  'https://wpxpgszzzfhhsaunolyq.supabase.co',
  process.env.SUPABASE_SERVICE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function POST(request: Request) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const meta = session.metadata!

    const supabase = supabaseAdmin()

    try {
      // Create order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          customer_id: meta.customer_id,
          store_id: meta.store_id,
          status: 'confirmed',
          delivery_address: JSON.parse(meta.address),
          subtotal: Number(meta.subtotal),
          delivery_fee: Number(meta.delivery_fee),
          service_fee: Number(meta.service_fee),
          tip_amount: Number(meta.tip_amount),
          total: (session.amount_total || 0) / 100,
          payment_method: 'card',
          placed_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (orderError) throw orderError

      // Create order items
      const items = JSON.parse(meta.items) as { p: string; q: number }[]
      const { data: products } = await supabase
        .from('products')
        .select('id, price, name')
        .in('id', items.map(i => i.p))

      const orderItems = items.map(i => {
        const product = products?.find(p => p.id === i.p)
        return {
          order_id: order.id,
          product_id: i.p,
          quantity: i.q,
          price_at_order: product?.price || 0,
          product_name: product?.name || '',
        }
      })

      await supabase.from('order_items').insert(orderItems)

      // Increment promo code usage
      if (meta.promo_id) {
        await supabase.rpc('increment_promo_usage', { promo_id: meta.promo_id })
      }

      console.log(`Order ${order.id} created from Stripe session ${session.id}`)
    } catch (err: any) {
      console.error('Order creation failed:', err.message)
      return NextResponse.json({ error: 'Order creation failed' }, { status: 500 })
    }
  }

  return NextResponse.json({ received: true })
}
