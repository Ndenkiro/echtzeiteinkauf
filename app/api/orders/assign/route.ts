// app/api/orders/assign/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = () => createClient(
  'https://wpxpgszzzfhhsaunolyq.supabase.co',
  process.env.SUPABASE_SERVICE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const SITE_URL = 'https://echtzeiteinkauf.com'

export async function POST(request: Request) {
  try {
    const { orderId } = await request.json()
    if (!orderId) {
      return NextResponse.json({ error: 'orderId fehlt' }, { status: 400 })
    }

    const supabase = supabaseAdmin()

    // Assign the best available shopper
    const { data: result, error } = await supabase.rpc('assign_shopper_to_order', {
      p_order_id: orderId,
    })

    if (error) {
      console.error('Assignment RPC failed:', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Notify every candidate by email (the selected one + alternatives)
    if (result?.ok) {
      const { data: order } = await supabase
        .from('orders')
        .select('total, subtotal, delivery_fee, tip_amount, distance_km, stores(name)')
        .eq('id', orderId)
        .single()

      const { data: candidates } = await supabase
        .from('shopper_order_applications')
        .select('shopper_id, status, users:shopper_id(full_name, email)')
        .eq('order_id', orderId)

      const storeName = (order?.stores as any)?.name || 'Supermarkt'
      const netEarning = order
        ? Math.round(
            ((Number(order.delivery_fee) * 0.8 + Number(order.tip_amount || 0)) * 0.9) * 100
          ) / 100
        : 0

      if (process.env.RESEND_API_KEY && candidates?.length) {
        await Promise.allSettled(
          candidates.map((c: any) => {
            const user = Array.isArray(c.users) ? c.users[0] : c.users
            if (!user?.email) return Promise.resolve()

            const isSelected = c.status === 'selected'
            const subject = isSelected
              ? `Neuer Auftrag für Sie — ${storeName}`
              : `Auftrag verfügbar — ${storeName}`

            const body = isSelected
              ? `Sie wurden für einen neuen Einkaufsauftrag ausgewählt.`
              : `Ein Auftrag in Ihrer Nähe ist verfügbar. Bewerben Sie sich, falls der ausgewählte Shopper absagt.`

            return fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
              },
              body: JSON.stringify({
                from: 'Echtzeiteinkauf <noreply@echtzeiteinkauf.com>',
                to: user.email,
                subject,
                html: `
                  <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#fff">
                    <img src="${SITE_URL}/logo.png" style="width:48px;height:48px;border-radius:50%;margin-bottom:16px"/>
                    <h2 style="color:#111;font-size:20px;margin:0 0 8px">
                      Hallo ${user.full_name || 'Shopper'}!
                    </h2>
                    <p style="color:#666;font-size:14px;line-height:1.6">${body}</p>
                    <div style="background:#f9f9f9;border-radius:12px;padding:20px;margin:20px 0">
                      <div style="font-size:13px;color:#666;margin-bottom:6px">🏪 ${storeName}</div>
                      <div style="font-size:13px;color:#666;margin-bottom:6px">📦 Warenwert: ${Number(order?.subtotal || 0).toFixed(2)} €</div>
                      ${order?.distance_km ? `<div style="font-size:13px;color:#666;margin-bottom:6px">📏 ${order.distance_km} km</div>` : ''}
                      <div style="font-size:15px;color:#22C55E;font-weight:bold;margin-top:10px">
                        💰 Ihr Nettoverdienst: ${netEarning.toFixed(2)} €
                      </div>
                    </div>
                    <a href="${SITE_URL}/shopper-portal/auftraege"
                       style="display:inline-block;background:#E30B6D;color:#fff;text-decoration:none;padding:14px 28px;border-radius:12px;font-weight:bold;font-size:15px">
                      ${isSelected ? 'Auftrag ansehen' : 'Jetzt bewerben'} →
                    </a>
                    <p style="color:#999;font-size:12px;margin-top:24px">
                      © 2026 Echtzeiteinkauf GmbH · Fürth
                    </p>
                  </div>
                `,
              }),
            })
          })
        )
      }
    }

    return NextResponse.json(result)
  } catch (err: any) {
    console.error('Assign error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
