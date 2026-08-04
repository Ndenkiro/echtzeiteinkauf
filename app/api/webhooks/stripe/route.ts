// app/api/webhooks/stripe/route.ts
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-04-10' as any,
})

const SITE_URL = 'https://echtzeiteinkauf.com'

const supabaseAdmin = () => createClient(
  'https://wpxpgszzzfhhsaunolyq.supabase.co',
  process.env.SUPABASE_SERVICE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function POST(request: Request) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')!

  const secret = process.env.STRIPE_WEBHOOK_SECRET || ''

  console.log('[stripe-webhook] body bytes:', body.length)
  console.log('[stripe-webhook] signature header present:', !!signature)
  console.log('[stripe-webhook] secret prefix:', secret.slice(0, 12), 'length:', secret.length)

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, secret.trim())
  } catch (err: any) {
    console.error('[stripe-webhook] verification failed:', err.message)
    return NextResponse.json({ error: 'Invalid signature', detail: err.message }, { status: 400 })
  }

  if (event.type !== 'checkout.session.completed') {
    return NextResponse.json({ received: true })
  }

  const session = event.data.object as Stripe.Checkout.Session
  const meta = session.metadata || {}
  const supabase = supabaseAdmin()

  try {
    const address = JSON.parse(meta.address || '{}')

    // ── Create the order ──
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        customer_id:       meta.customer_id,
        store_id:          meta.store_id,
        status:            'pending',
        assignment_status: 'searching',
        delivery_address:  address,
        subtotal:          Number(meta.subtotal || 0),
        delivery_fee:      Number(meta.delivery_fee || 1.99),
        service_fee:       Number(meta.service_fee || 0),
        tip_amount:        Number(meta.tip_amount || 0),
        total:             (session.amount_total || 0) / 100,
        payment_method:    'card',
        placed_at:         new Date().toISOString(),
        distance_km:       meta.distanceKm ? Number(meta.distanceKm) : null,
        is_peak_hour:      meta.isPeakHour === 'true',
        customer_lat:      address.lat ?? (meta.customerLat ? Number(meta.customerLat) : null),
        customer_lng:      address.lng ?? (meta.customerLng ? Number(meta.customerLng) : null),
      })
      .select()
      .single()

    if (orderError) throw orderError

    // ── Order items ──
    const items = JSON.parse(meta.items || '[]') as { p: string; q: number }[]
    if (items.length) {
      const { data: products } = await supabase
        .from('products').select('id, price, name').in('id', items.map(i => i.p))

      await supabase.from('order_items').insert(
        items.map(i => {
          const product = products?.find(p => p.id === i.p)
          return {
            order_id:       order.id,
            product_id:     i.p,
            quantity:       i.q,
            price_at_order: product?.price || 0,
            product_name:   product?.name || '',
          }
        })
      )
    }

    // ── Promo usage ──
    if (meta.promo_id) {
      await supabase.rpc('increment_promo_usage', { promo_id: meta.promo_id })
    }

    // ── Assign a shopper (fire and forget, don't block the webhook) ──
    fetch(`${SITE_URL}/api/orders/assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: order.id }),
    }).catch(e => console.error('Assign call failed:', e))

    console.log(`Order ${order.id} created — assignment triggered`)
    return NextResponse.json({ received: true, orderId: order.id })
  } catch (err: any) {
    console.error('Order creation failed:', err.message)
    return NextResponse.json({ error: 'Order creation failed' }, { status: 500 })
  }
}
