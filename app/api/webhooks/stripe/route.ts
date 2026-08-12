// app/api/webhooks/stripe/route.ts
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function env(name: string): string {
  const e = process.env as Record<string, string | undefined>
  return e[name] ?? ''
}
const STRIPE_KEY  = env(['STRIPE', 'SECRET', 'KEY'].join('_'))
const WEBHOOK_KEY = env(['STRIPE', 'WEBHOOK', 'SECRET'].join('_'))
const SERVICE_KEY = env(['SUPABASE', 'SERVICE', 'KEY'].join('_'))

const stripe = new Stripe(STRIPE_KEY, { apiVersion: '2024-04-10' as any })
const SITE_URL = 'https://echtzeiteinkauf.com'

const supabaseAdmin = () => createClient(
  'https://wpxpgszzzfhhsaunolyq.supabase.co',
  SERVICE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function POST(request: Request) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, WEBHOOK_KEY.trim())
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
    const commission = Number(meta.commission || 0)

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        customer_id:       meta.customer_id,
        store_id:          meta.store_id,
        status:            'pending',
        assignment_status: 'searching',
        delivery_address:  address,
        subtotal:          Number(meta.subtotal || 0),
        commission,
        delivery_fee:      commission,          // kept in sync for legacy views
        service_fee:       Number(meta.service_fee || 0),
        tip_amount:        Number(meta.tip_amount || 0),
        total:             (session.amount_total || 0) / 100,
        payment_method:    'card',
        stripe_session_id:     session.id,
        stripe_payment_intent: typeof session.payment_intent === 'string'
                                 ? session.payment_intent
                                 : session.payment_intent?.id ?? null,
        placed_at:         new Date().toISOString(),
        distance_km:       meta.distanceKm ? Number(meta.distanceKm) : null,
        customer_lat:      address.lat ?? (meta.customerLat ? Number(meta.customerLat) : null),
        customer_lng:      address.lng ?? (meta.customerLng ? Number(meta.customerLng) : null),
      })
      .select().single()

    if (orderError) throw orderError

    const items = JSON.parse(meta.items || '[]') as { p: string; q: number }[]
    if (items.length) {
      const { data: products } = await supabase
        .from('products').select('id, price, name').in('id', items.map(i => i.p))
      await supabase.from('order_items').insert(
        items.map(i => {
          const p = products?.find(x => x.id === i.p)
          return {
            order_id: order.id, product_id: i.p, quantity: i.q,
            price_at_order: p?.price || 0, product_name: p?.name || '',
          }
        })
      )
    }

    if (meta.promo_id) {
      await supabase.rpc('increment_promo_usage', { promo_id: meta.promo_id })
    }

    fetch(`${SITE_URL}/api/orders/assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: order.id }),
    }).catch(e => console.error('Assign call failed:', e))

    console.log(`Order ${order.id} created — commission ${commission} €`)
    return NextResponse.json({ received: true, orderId: order.id })
  } catch (err: any) {
    console.error('Order creation failed:', err.message)
    return NextResponse.json({ error: 'Order creation failed' }, { status: 500 })
  }
}
