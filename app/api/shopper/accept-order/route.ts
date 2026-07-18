// app/api/shopper/accept-order/route.ts
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-04-10' as any,
})

const SPENDING_MARGIN = 1.15 // 15% above subtotal for price variations

const supabaseAdmin = () => createClient(
  'https://wpxpgszzzfhhsaunolyq.supabase.co',
  process.env.SUPABASE_SERVICE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function POST(request: Request) {
  try {
    const { orderId } = await request.json()
    if (!orderId) return NextResponse.json({ error: 'orderId fehlt' }, { status: 400 })

    // Auth: verify shopper
    const cookieStore = cookies()
    const supabase = createServerClient(
      'https://wpxpgszzzfhhsaunolyq.supabase.co',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get: (n: string) => cookieStore.get(n)?.value,
          set: (n: string, v: string, o: CookieOptions) => { try { cookieStore.set({ name: n, value: v, ...o }) } catch {} },
          remove: (n: string, o: CookieOptions) => { try { cookieStore.set({ name: n, value: '', ...o }) } catch {} },
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 })

    const admin = supabaseAdmin()

    const { data: profile } = await admin
      .from('users').select('id, full_name, email, phone').eq('auth_id', user.id).single()

    const { data: shopper } = await admin
      .from('shoppers').select('id, stripe_cardholder_id, user_id').eq('user_id', profile!.id).single()

    if (!shopper) return NextResponse.json({ error: 'Kein Shopper-Profil' }, { status: 403 })

    // Verify shopper is approved
    const { data: application } = await admin
      .from('shopper_applications').select('status').eq('user_id', profile!.id).single()
    if (application?.status !== 'approved') {
      return NextResponse.json({ error: 'Noch nicht freigeschaltet' }, { status: 403 })
    }

    // Get order (must be confirmed and unassigned)
    const { data: order } = await admin
      .from('orders')
      .select('id, status, shopper_id, subtotal, stores(name)')
      .eq('id', orderId)
      .single()

    if (!order) return NextResponse.json({ error: 'Bestellung nicht gefunden' }, { status: 404 })
    if (order.status !== 'confirmed') return NextResponse.json({ error: 'Bestellung nicht verfügbar' }, { status: 409 })
    if (order.shopper_id && order.shopper_id !== profile!.id) {
      return NextResponse.json({ error: 'Bereits einem anderen Shopper zugewiesen' }, { status: 409 })
    }

    // ── Stripe Issuing: create/reuse cardholder ──
    let cardholderId = shopper.stripe_cardholder_id
    if (!cardholderId) {
      const cardholder = await stripe.issuing.cardholders.create({
        type: 'individual',
        name: profile!.full_name || 'Shopper',
        email: profile!.email,
        ...(profile!.phone ? { phone_number: profile!.phone } : {}),
        billing: {
          address: {
            line1: 'Nürnberger Str. 134',
            city: 'Fürth',
            postal_code: '90762',
            country: 'DE',
          },
        },
      })
      cardholderId = cardholder.id
      await admin.from('shoppers').update({ stripe_cardholder_id: cardholderId }).eq('id', shopper.id)
    }

    // ── Create virtual card with spending limit ──
    const spendingLimit = Math.ceil(Number(order.subtotal) * SPENDING_MARGIN * 100) // in cents

    const card = await stripe.issuing.cards.create({
      cardholder: cardholderId,
      currency: 'eur',
      type: 'virtual',
      status: 'active',
      spending_controls: {
        spending_limits: [{ amount: spendingLimit, interval: 'per_authorization' }],
        allowed_categories: [
          'grocery_stores_supermarkets',
          'miscellaneous_food_stores',
          'discount_stores',
          'department_stores',
        ],
      },
      metadata: { order_id: orderId, shopper_id: shopper.id },
    })

    // ── Save card + assign order ──
    await admin.from('virtual_cards').insert({
      order_id: orderId,
      shopper_id: shopper.id,
      stripe_card_id: card.id,
      stripe_cardholder: cardholderId,
      spending_limit: spendingLimit / 100,
      last4: card.last4,
      status: 'active',
    })

    await admin.from('orders').update({
      shopper_id: profile!.id,
      status: 'shopping',
    }).eq('id', orderId)

    return NextResponse.json({
      success: true,
      cardLast4: card.last4,
      spendingLimit: spendingLimit / 100,
    })
  } catch (err: any) {
    console.error('Accept order error:', err)
    // Specific message if Issuing not activated yet
    if (err.message?.includes('issuing') || err.code === 'resource_missing') {
      return NextResponse.json({
        error: 'Stripe Issuing ist noch nicht aktiviert. Bitte Aktivierung im Stripe Dashboard abschließen.',
      }, { status: 503 })
    }
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
