// app/api/orders/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-04-10' })

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { storeId, items, deliveryAddress, tipPct = 5, paymentMethod = 'card', deliveryOption = 'express' } = body

    // Validate required fields
    if (!storeId || !items?.length || !deliveryAddress) {
      return NextResponse.json({ error: 'Fehlende Pflichtfelder' }, { status: 400 })
    }

    const supabase = supabaseAdmin()

    // Fetch store
    const { data: store } = await supabase
      .from('stores').select('*').eq('id', storeId).single()
    if (!store) return NextResponse.json({ error: 'Markt nicht gefunden' }, { status: 404 })

    // Fetch & validate products (re-check prices server-side)
    const productIds = items.map((i: any) => i.productId)
    const { data: products } = await supabase
      .from('products').select('*').in('id', productIds).eq('store_id', storeId)

    if (!products?.length) return NextResponse.json({ error: 'Produkte nicht gefunden' }, { status: 404 })

    // Calculate totals
    const orderItems = items.map((item: any) => {
      const product = products.find((p: any) => p.id === item.productId)
      if (!product) throw new Error(`Produkt ${item.productId} nicht gefunden`)
      return { product, quantity: item.quantity, unit_price: product.price, line_total: product.price * item.quantity }
    })

    const subtotal    = orderItems.reduce((a: number, i: any) => a + i.line_total, 0)
    const deliveryFee = deliveryOption === 'scheduled' ? 0 : store.delivery_fee
    const serviceFee  = Math.round(subtotal * 0.05 * 100) / 100
    const tipAmount   = Math.round(subtotal * (tipPct / 100) * 100) / 100
    const total       = Math.round((subtotal + deliveryFee + serviceFee + tipAmount) * 100) / 100

    // Check minimum order
    if (subtotal < store.min_order) {
      return NextResponse.json({ error: `Mindestbestellwert: ${store.min_order.toFixed(2)} €` }, { status: 400 })
    }

    // Create Stripe PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount:   Math.round(total * 100), // cents
      currency: 'eur',
      metadata: { storeId, storeName: store.name },
      automatic_payment_methods: { enabled: true },
    })

    // Create order in DB
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        store_id:         storeId,
        status:           'pending',
        delivery_address: deliveryAddress,
        delivery_option:  deliveryOption,
        subtotal,
        delivery_fee:     deliveryFee,
        service_fee:      serviceFee,
        tip_amount:       tipAmount,
        total,
        payment_method:   paymentMethod,
        stripe_payment_id: paymentIntent.id,
      })
      .select()
      .single()

    if (orderError) throw orderError

    // Insert order items
    await supabase.from('order_items').insert(
      orderItems.map((i: any) => ({
        order_id:   order.id,
        product_id: i.product.id,
        quantity:   i.quantity,
        unit_price: i.unit_price,
        line_total: i.line_total,
      }))
    )

    return NextResponse.json({
      orderId:      order.id,
      clientSecret: paymentIntent.client_secret,
      total,
    })
  } catch (err: any) {
    console.error('[/api/orders POST]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// GET /api/orders/:id — order status
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const orderId = searchParams.get('id')
  if (!orderId) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { data, error } = await supabaseAdmin()
    .from('orders')
    .select('*, order_items(*, products(name, emoji:image_url))')
    .eq('id', orderId)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json(data)
}
