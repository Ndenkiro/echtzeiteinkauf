// app/api/checkout/route.ts — commission as a Stripe line item
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function env(name: string): string {
  const e = process.env as Record<string, string | undefined>
  return e[name] ?? ''
}
const STRIPE_KEY = env(['STRIPE', 'SECRET', 'KEY'].join('_'))
const ANON_KEY   = env(['NEXT', 'PUBLIC', 'SUPABASE', 'ANON', 'KEY'].join('_'))

const stripe = new Stripe(STRIPE_KEY, { apiVersion: '2024-04-10' as any })
const SITE_URL = 'https://echtzeiteinkauf.com'
const SUPABASE_URL = 'https://wpxpgszzzfhhsaunolyq.supabase.co'
const SUPABASE_ANON_FALLBACK = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndweHBnc3p6emZoaHNhdW5vbHlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0Mzg5ODQsImV4cCI6MjA5NzAxNDk4NH0.8_DVpLNwItAlkn_gL9a4dn-lZ00I8iifX2Cb9N_W-4U'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      items, storeId, address, promoCode,
      commission = 0, tipAmount = 0,
      distanceKm, customerLat, customerLng,
    } = body

    if (!items?.length || !storeId || !address) {
      return NextResponse.json({ error: 'Fehlende Daten' }, { status: 400 })
    }
    if (!commission || commission <= 0) {
      return NextResponse.json({ error: 'Provision fehlt' }, { status: 400 })
    }

    const cookieStore = cookies()
    const supabase = createServerClient(SUPABASE_URL, ANON_KEY || SUPABASE_ANON_FALLBACK, {
      cookies: {
        get: (n: string) => cookieStore.get(n)?.value,
        set: (n: string, v: string, o: CookieOptions) => { try { cookieStore.set({ name: n, value: v, ...o }) } catch {} },
        remove: (n: string, o: CookieOptions) => { try { cookieStore.set({ name: n, value: '', ...o }) } catch {} },
      },
    })

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Bitte melden Sie sich an' }, { status: 401 })

    const { data: profile } = await supabase
      .from('users').select('id, email').eq('auth_id', user.id).single()

    // Server-side prices — never trust the client
    const productIds = items.map((i: any) => i.productId)
    const { data: products } = await supabase
      .from('products').select('id, name, price, image_url').in('id', productIds)
    if (!products?.length) {
      return NextResponse.json({ error: 'Produkte nicht gefunden' }, { status: 400 })
    }

    const { data: store } = await supabase
      .from('stores').select('id, name').eq('id', storeId).single()
    if (!store) return NextResponse.json({ error: 'Markt nicht gefunden' }, { status: 400 })

    let subtotal = 0
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = items.map((item: any) => {
      const p = products.find(x => x.id === item.productId)
      if (!p) throw new Error('Produkt nicht gefunden')
      subtotal += Number(p.price) * item.quantity
      return {
        price_data: {
          currency: 'eur',
          product_data: { name: p.name, ...(p.image_url ? { images: [p.image_url] } : {}) },
          unit_amount: Math.round(Number(p.price) * 100),
        },
        quantity: item.quantity,
      }
    })

    const serviceFee = Math.round(subtotal * 0.05 * 100) / 100

    lineItems.push({
      price_data: {
        currency: 'eur',
        product_data: { name: 'Servicegebühr (5 %)' },
        unit_amount: Math.round(serviceFee * 100),
      },
      quantity: 1,
    })
    lineItems.push({
      price_data: {
        currency: 'eur',
        product_data: { name: `Provision für Ihren Shopper — ${store.name}` },
        unit_amount: Math.round(Number(commission) * 100),
      },
      quantity: 1,
    })
    if (tipAmount > 0) {
      lineItems.push({
        price_data: {
          currency: 'eur',
          product_data: { name: 'Trinkgeld 💛' },
          unit_amount: Math.round(Number(tipAmount) * 100),
        },
        quantity: 1,
      })
    }

    // Promo validated server-side
    let discounts: Stripe.Checkout.SessionCreateParams.Discount[] | undefined
    let validPromoId: string | null = null
    if (promoCode) {
      const { data: promo } = await supabase
        .from('promo_codes').select('*')
        .eq('code', promoCode.toUpperCase()).eq('is_active', true).single()

      if (promo
        && (!promo.valid_until || new Date(promo.valid_until) > new Date())
        && (promo.max_uses === null || promo.used_count < promo.max_uses)
        && subtotal >= promo.min_order
      ) {
        const coupon = await stripe.coupons.create(
          promo.discount_type === 'percent'
            ? { percent_off: promo.discount_value, duration: 'once' }
            : { amount_off: Math.round(promo.discount_value * 100), currency: 'eur', duration: 'once' }
        )
        discounts = [{ coupon: coupon.id }]
        validPromoId = promo.id
      }
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: lineItems,
      ...(discounts ? { discounts } : {}),
      customer_email: profile?.email || user.email,
      success_url: `${SITE_URL}/bestellung/erfolg?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${SITE_URL}/bestellung/abbruch`,
      payment_method_types: ['card'],
      locale: 'de',
      metadata: {
        customer_id: profile?.id || '',
        store_id: storeId,
        subtotal: subtotal.toFixed(2),
        service_fee: serviceFee.toFixed(2),
        commission: Number(commission).toFixed(2),
        tip_amount: Number(tipAmount).toFixed(2),
        promo_id: validPromoId || '',
        distanceKm: distanceKm != null ? String(distanceKm) : '',
        customerLat: customerLat != null ? String(customerLat) : '',
        customerLng: customerLng != null ? String(customerLng) : '',
        address: JSON.stringify(address),
        items: JSON.stringify(items.map((i: any) => ({ p: i.productId, q: i.quantity }))),
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (err: any) {
    console.error('Checkout error:', err)
    return NextResponse.json({ error: err.message || 'Checkout fehlgeschlagen' }, { status: 500 })
  }
}
