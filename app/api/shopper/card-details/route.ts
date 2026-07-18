// app/api/shopper/card-details/route.ts
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-04-10' as any,
})

const supabaseAdmin = () => createClient(
  'https://wpxpgszzzfhhsaunolyq.supabase.co',
  process.env.SUPABASE_SERVICE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function POST(request: Request) {
  try {
    const { orderId } = await request.json()

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
    const { data: profile } = await admin.from('users').select('id').eq('auth_id', user.id).single()
    const { data: shopper } = await admin.from('shoppers').select('id').eq('user_id', profile!.id).single()

    // Verify this shopper owns the card for this order
    const { data: card } = await admin
      .from('virtual_cards')
      .select('stripe_card_id, status, spending_limit, amount_spent')
      .eq('order_id', orderId)
      .eq('shopper_id', shopper!.id)
      .single()

    if (!card) return NextResponse.json({ error: 'Keine Karte gefunden' }, { status: 404 })
    if (card.status !== 'active') return NextResponse.json({ error: 'Karte deaktiviert' }, { status: 410 })

    // Retrieve full card details from Stripe (number + cvc)
    const stripeCard = await stripe.issuing.cards.retrieve(card.stripe_card_id, {
      expand: ['number', 'cvc'],
    })

    return NextResponse.json({
      number: stripeCard.number,
      cvc: stripeCard.cvc,
      exp_month: stripeCard.exp_month,
      exp_year: stripeCard.exp_year,
      last4: stripeCard.last4,
      spending_limit: card.spending_limit,
      amount_spent: card.amount_spent,
    })
  } catch (err: any) {
    console.error('Card details error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
