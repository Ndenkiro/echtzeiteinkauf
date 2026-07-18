// app/api/webhooks/issuing/route.ts
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-04-10' as any,
})

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
      process.env.STRIPE_ISSUING_WEBHOOK_SECRET!
    )
  } catch (err: any) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = supabaseAdmin()

  // Track completed card transactions
  if (event.type === 'issuing_transaction.created') {
    const txn = event.data.object as Stripe.Issuing.Transaction

    const { data: card } = await supabase
      .from('virtual_cards')
      .select('id, amount_spent')
      .eq('stripe_card_id', txn.card as string)
      .single()

    if (card) {
      const amount = Math.abs(txn.amount) / 100 // Issuing amounts are negative for purchases

      await supabase.from('card_transactions').insert({
        card_id: card.id,
        stripe_txn_id: txn.id,
        amount,
        merchant_name: txn.merchant_data?.name || null,
        merchant_city: txn.merchant_data?.city || null,
        status: 'approved',
      })

      await supabase.from('virtual_cards').update({
        amount_spent: Number(card.amount_spent) + amount,
      }).eq('id', card.id)
    }
  }

  // Real-time authorization control (optional: approve/decline in <2s)
  if (event.type === 'issuing_authorization.request') {
    const auth = event.data.object as Stripe.Issuing.Authorization
    // Default: Stripe approves based on spending_controls we set
    // Log for monitoring
    console.log(`Authorization request: ${auth.id} — ${auth.merchant_data?.name} — ${Math.abs(auth.amount)/100} €`)
  }

  return NextResponse.json({ received: true })
}
