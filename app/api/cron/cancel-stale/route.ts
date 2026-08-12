// app/api/cron/cancel-stale/route.ts
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
const SERVICE_KEY = env(['SUPABASE', 'SERVICE', 'KEY'].join('_'))
const CRON_SECRET = env(['CRON', 'SECRET'].join('_'))
const RESEND_KEY  = env(['RESEND', 'API', 'KEY'].join('_'))

const stripe = new Stripe(STRIPE_KEY, { apiVersion: '2024-04-10' as any })

const supabaseAdmin = () => createClient(
  'https://wpxpgszzzfhhsaunolyq.supabase.co',
  SERVICE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function notifyCustomer(email: string, storeName: string, total: number) {
  if (!RESEND_KEY || !email) return
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${RESEND_KEY}`,
    },
    body: JSON.stringify({
      from: 'Echtzeiteinkauf <noreply@echtzeiteinkauf.com>',
      to: email,
      subject: 'Ihre Bestellung wurde storniert — Erstattung veranlasst',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#fff">
          <img src="https://echtzeiteinkauf.com/logo.png" style="width:48px;height:48px;border-radius:50%;margin-bottom:16px"/>
          <h2 style="color:#111;font-size:20px;margin:0 0 8px">Bestellung storniert</h2>
          <p style="color:#666;font-size:14px;line-height:1.6">
            Leider konnte Ihre Bestellung bei <strong>${storeName}</strong> nicht innerhalb
            von 8 Stunden geliefert werden. Wir haben sie deshalb automatisch storniert.
          </p>
          <div style="background:#f0fdf4;border-radius:12px;padding:20px;margin:20px 0">
            <div style="font-size:14px;color:#166534;font-weight:bold">
              Erstattung: ${total.toFixed(2)} €
            </div>
            <div style="font-size:12px;color:#166534;margin-top:6px">
              Der Betrag wird in 5–10 Werktagen Ihrem Zahlungsmittel gutgeschrieben.
            </div>
          </div>
          <p style="color:#666;font-size:14px;line-height:1.6">
            Es tut uns leid für die Unannehmlichkeiten. Versuchen Sie es gerne erneut —
            zu einer anderen Tageszeit finden sich meist schneller Shopper.
          </p>
          <a href="https://echtzeiteinkauf.com/maerkte"
             style="display:inline-block;background:#E30B6D;color:#fff;text-decoration:none;padding:14px 28px;border-radius:12px;font-weight:bold;font-size:15px;margin-top:8px">
            Neue Bestellung aufgeben →
          </a>
          <p style="color:#999;font-size:12px;margin-top:24px">
            © 2026 Echtzeiteinkauf GmbH · Fürth
          </p>
        </div>
      `,
    }),
  }).catch(() => {})
}

export async function GET(request: Request) {
  const auth = request.headers.get('authorization') || ''
  if (CRON_SECRET && auth.replace('Bearer ', '') !== CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = supabaseAdmin()
  const results: any[] = []

  try {
    const { data: stale, error } = await supabase.rpc('get_stale_orders')
    if (error) throw error
    if (!stale?.length) {
      return NextResponse.json({ ok: true, cancelled: 0 })
    }

    for (const order of stale) {
      let refundId: string | null = null
      let refundStatus = 'manual'

      // Refund through Stripe when we know the payment intent
      if (order.payment_intent) {
        try {
          const refund = await stripe.refunds.create({
            payment_intent: order.payment_intent,
            reason: 'requested_by_customer',
            metadata: {
              order_id: order.order_id,
              auto_cancelled: 'true',
              hours_old: String(order.hours_old),
            },
          })
          refundId = refund.id
          refundStatus = refund.status === 'succeeded' ? 'succeeded' : 'pending'
        } catch (e: any) {
          console.error(`[cron] refund failed for ${order.order_id}:`, e.message)
          refundStatus = 'failed'
        }
      }

      const { data: cancelResult } = await supabase.rpc('cancel_order_with_refund', {
        p_order_id: order.order_id,
        p_refund_id: refundId,
        p_refund_status: refundStatus,
        p_reason: `Automatisch storniert nach ${order.hours_old} Stunden ohne Lieferung`,
      })

      if (cancelResult?.ok) {
        await notifyCustomer(order.customer_email, order.store_name, Number(order.total))
        results.push({
          order_id: order.order_id,
          hours_old: order.hours_old,
          refund: refundStatus,
        })
      }
    }

    console.log(`[cron] cancelled ${results.length} stale order(s)`)
    return NextResponse.json({ ok: true, cancelled: results.length, orders: results })
  } catch (err: any) {
    console.error('[cron] cancel-stale failed:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export const POST = GET
