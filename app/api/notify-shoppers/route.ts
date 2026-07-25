// app/api/notify-shoppers/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = () => createClient(
  'https://wpxpgszzzfhhsaunolyq.supabase.co',
  process.env.SUPABASE_SERVICE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function POST(request: Request) {
  try {
    const { orderId, customerLat, customerLng, storeName, total } = await request.json()
    const supabase = supabaseAdmin()

    // Get best 5 shoppers near the order
    const { data: shoppers } = await supabase.rpc('get_shoppers_for_notification', {
      order_lat: customerLat,
      order_lng: customerLng,
      radius_km: 15,
    })

    if (!shoppers?.length) {
      console.log('No shoppers available nearby')
      return NextResponse.json({ notified: 0 })
    }

    // Send emails via Resend SMTP (using fetch to Resend API)
    const emailPromises = shoppers.map(async (shopper: any) => {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: 'Echtzeiteinkauf <noreply@echtzeiteinkauf.com>',
          to: shopper.email,
          subject: `🛒 Neuer Auftrag verfügbar — ${storeName}`,
          html: `
            <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#ffffff">
              <img src="https://echtzeiteinkauf.com/logo.png" style="width:48px;height:48px;border-radius:50%;margin-bottom:16px"/>
              <h2 style="color:#111;font-size:20px;margin:0 0 8px">Hallo ${shopper.full_name}!</h2>
              <p style="color:#666;font-size:14px;line-height:1.6">
                Ein neuer Einkaufsauftrag ist in Ihrer Nähe verfügbar.
              </p>
              <div style="background:#f9f9f9;border-radius:12px;padding:20px;margin:20px 0">
                <div style="font-size:13px;color:#666;margin-bottom:8px">📍 ${storeName}</div>
                <div style="font-size:13px;color:#666;margin-bottom:8px">📦 Bestellwert: ${total} €</div>
                <div style="font-size:13px;color:#666">📏 Entfernung: ${shopper.distance_km} km</div>
              </div>
              <a href="https://echtzeiteinkauf.com/shopper-portal" 
                 style="display:inline-block;background:#E30B6D;color:#fff;text-decoration:none;padding:14px 28px;border-radius:12px;font-weight:bold;font-size:15px">
                Jetzt bewerben →
              </a>
              <p style="color:#999;font-size:12px;margin-top:24px">
                Der Shopper mit der besten Bewertung wird automatisch ausgewählt.<br/>
                © 2026 Echtzeiteinkauf GmbH
              </p>
            </div>
          `,
        }),
      })
      return res.ok
    })

    const results = await Promise.all(emailPromises)
    const sent = results.filter(Boolean).length

    // Store notified shoppers
    await supabase.from('shopper_order_applications').insert(
      shoppers.map((s: any) => ({ order_id: orderId, shopper_id: s.user_id }))
    )

    // Auto-select after 10 minutes if no applications
    // (handled by a webhook or cron — for now immediate if only 1 shopper)
    if (shoppers.length === 1) {
      await supabase.rpc('select_best_shopper', { p_order_id: orderId })
    }

    return NextResponse.json({ notified: sent, shoppers: shoppers.length })
  } catch (err: any) {
    console.error('Notify shoppers error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
