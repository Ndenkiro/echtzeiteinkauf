// app/api/checkout/route.ts
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-04-10' as any,
})

const SITE_URL = 'https://echtzeiteinkauf.com'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { items, storeId, address, promoCode, tipAmount = 0 } = body

    if (!items?.length || !storeId || !address) {
      return NextResponse.json({ error: 'Fehlende Daten' }, { status: 400 })
    }

    // Auth check
    const cookieStore = cookies()
    const supabase = createServerClient(
      'https://wpxpgszzzfhhsaunolyq.supabase.co',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get: (name: string) => cookieStore.get(name)?.value,
          set: (name: string, value: string, options: CookieOptions) => {
            try { cookieStore.set({ name, value, ...options }) } catch {}
          },
          remove: (name: string, options: CookieOptions) => {
            try { cookieStore.set({ name, value: '', ...options }) } catch {}
          },
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Bitte melden Sie sich an' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('users').select('id, email').eq('auth_id', user.id).single()

    // Server-side: fetch real product prices (never trust client)
    const productIds = items.map((i: any) => i.productId)
    const { data: products } = await supabase
      .from('products')
      .select('id, name, price, image_url')
      .in('id', productIds)

    if (!products?.length) {
      return NextResponse.json({ error: 'Produkte nicht gefunden' }, { status: 400 })
    }

    // Get store + delivery fee
    const { data: store } = await supabase
      .from('stores').select('id, name, delivery_fee').eq('id', storeId).single()

    if (!store) {
      return NextResponse.json({ error: 'Markt nicht gefunden' }, { status: 400 })
    }

    // Build line items with server prices
    let subtotal = 0
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = items.map((item: any) => {
      const product = products.find(p => p.id === item.productId)
      if (!product) throw new Error(`Produkt ${item.productId} nicht gefunden`)
      subtotal += Number(product.price) * item.quantity
      return {
        price_data: {
          currency: 'eur',
          product_data: {
            name: product.name,
            ...(product.image_url ? { images: [product.image_url] } : {}),
          },
          unit_amount: Math.round(Number(product.price) * 100),
        },
        quantity: item.quantity,
      }
    })

    const serviceFee = Math.round(subtotal * 0.05 * 100) / 100
    const deliveryFee = Number(store.delivery_fee)

    // Service fee + delivery as line items
    lineItems.push({
      price_data: {
        currency: 'eur',
        product_data: { name: 'Servicegebühr (5%)' },
        unit_amount: Math.round(serviceFee * 100),
      },
      quantity: 1,
    })
    lineItems.push({
      price_data: {
        currency: 'eur',
        product_data: { name: `Liefergebühr — ${store.name}` },
        unit_amount: Math.round(deliveryFee * 100),
      },
      quantity: 1,
    })

    if (tipAmount > 0) {
      lineItems.push({
        price_data: {
          currency: 'eur',
          product_data: { name: 'Trinkgeld für Ihren Shopper 💛' },
          unit_amount: Math.round(tipAmount * 100),
        },
        quantity: 1,
      })
    }

    // Validate promo code server-side
    let discounts: Stripe.Checkout.SessionCreateParams.Discount[] | undefined
    let validPromoId: string | null = null
    if (promoCode) {
      const { data: promo } = await supabase
        .from('promo_codes')
        .select('*')
        .eq('code', promoCode.toUpperCase())
        .eq('is_active', true)
        .single()

      if (promo
        && (!promo.valid_until || new Date(promo.valid_until) > new Date())
        && (promo.max_uses === null || promo.used_count < promo.max_uses)
        && subtotal >= promo.min_order
      ) {
        // Create Stripe coupon on the fly
        const coupon = await stripe.coupons.create(
          promo.discount_type === 'percent'
            ? { percent_off: promo.discount_value, duration: 'once' }
            : { amount_off: Math.round(promo.discount_value * 100), currency: 'eur', duration: 'once' }
        )
        discounts = [{ coupon: coupon.id }]
        validPromoId = promo.id
      }
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: lineItems,
      ...(discounts ? { discounts } : {}),
      customer_email: profile?.email || user.email,
      success_url: `${SITE_URL}/bestellung/erfolg?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${SITE_URL}/bestellung/abbruch`,
      metadata: {
        customer_id: profile?.id || '',
        store_id: storeId,
        subtotal: subtotal.toFixed(2),
        delivery_fee: deliveryFee.toFixed(2),
        service_fee: serviceFee.toFixed(2),
        tip_amount: tipAmount.toFixed(2),
        promo_id: validPromoId || '',
        address: JSON.stringify(address),
        items: JSON.stringify(items.map((i: any) => ({ p: i.productId, q: i.quantity }))),
      },
      payment_method_types: ['card'],
      locale: 'de',
    })

    return NextResponse.json({ url: session.url })
  } catch (err: any) {
    console.error('Checkout error:', err)
    return NextResponse.json({ error: err.message || 'Checkout fehlgeschlagen' }, { status: 500 })
  }
}
