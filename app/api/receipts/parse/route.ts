// app/api/receipts/parse/route.ts
// Reads a German supermarket receipt photo and returns structured lines.
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

function env(name: string): string {
  const e = process.env as Record<string, string | undefined>
  return e[name] ?? ''
}
const SERVICE_KEY   = env(['SUPABASE', 'SERVICE', 'KEY'].join('_'))
const ANTHROPIC_KEY = env(['ANTHROPIC', 'API', 'KEY'].join('_'))

const supabaseAdmin = () => createClient(
  'https://wpxpgszzzfhhsaunolyq.supabase.co',
  SERVICE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const PROMPT = `Du liest einen deutschen Supermarkt-Kassenbon.

Gib AUSSCHLIESSLICH ein JSON-Array zurück, ohne Markdown, ohne Erklärung.
Jedes Element hat genau diese Felder:
  raw_text     – der Artikelname wie auf dem Bon (Großschreibung beibehalten)
  quantity     – Menge als Zahl (bei Gewicht z.B. 0.834; Standard 1)
  unit_price   – Einzelpreis in Euro als Zahl, oder null
  total_price  – Zeilensumme in Euro als Zahl

Regeln:
- Nur Artikelzeilen. KEINE Summenzeile, KEIN Pfand-Rückgabebon, KEINE
  Zahlungsart, KEINE Steuerzeilen (A 19%, B 7%), KEINE Rabattzeilen.
- Pfand-Zeilen (PFAND, LEERGUT) als eigene Artikel mitnehmen.
- Deutsche Dezimalkommas in Punkte umwandeln: "1,79" → 1.79
- Bei Gewichtsartikeln (z.B. "0,834 kg x 2,49 EUR/kg") ist quantity das
  Gewicht und unit_price der Kilopreis.
- Wenn der Bon unleserlich ist, gib [] zurück.

Beispiel:
[{"raw_text":"BANANEN LOSE","quantity":1.24,"unit_price":1.79,"total_price":2.22},
 {"raw_text":"MILCH 3,5% 1L","quantity":2,"unit_price":1.19,"total_price":2.38}]`

async function fetchAsBase64(url: string) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Bild nicht ladbar (${res.status})`)
  const buf = Buffer.from(await res.arrayBuffer())
  const type = res.headers.get('content-type') || 'image/jpeg'
  const media = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(type)
    ? type
    : 'image/jpeg'
  return { data: buf.toString('base64'), media }
}

export async function POST(request: Request) {
  try {
    const { orderId, imageUrl } = await request.json()
    if (!orderId) {
      return NextResponse.json({ error: 'orderId fehlt' }, { status: 400 })
    }
    if (!ANTHROPIC_KEY) {
      return NextResponse.json(
        { error: 'ANTHROPIC_API_KEY ist nicht konfiguriert' },
        { status: 503 }
      )
    }

    const supabase = supabaseAdmin()

    // Take the receipt already stored on the order unless one is passed
    let url = imageUrl
    if (!url) {
      const { data: order } = await supabase
        .from('orders').select('receipt_url').eq('id', orderId).single()
      url = order?.receipt_url
    }
    if (!url) {
      return NextResponse.json({ error: 'Kein Kassenbon vorhanden' }, { status: 400 })
    }

    const { data: b64, media } = await fetchAsBase64(url)

    const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 4000,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: media, data: b64 } },
            { type: 'text', text: PROMPT },
          ],
        }],
      }),
    })

    if (!aiRes.ok) {
      const detail = await aiRes.text()
      console.error('[receipt-parse] AI error:', detail.slice(0, 400))
      return NextResponse.json({ error: 'Bon konnte nicht gelesen werden' }, { status: 502 })
    }

    const aiData = await aiRes.json()
    const text = (aiData.content || [])
      .filter((c: any) => c.type === 'text')
      .map((c: any) => c.text)
      .join('')
      .replace(/```json|```/g, '')
      .trim()

    let lines: any[]
    try {
      lines = JSON.parse(text)
      if (!Array.isArray(lines)) throw new Error('kein Array')
    } catch {
      console.error('[receipt-parse] unparsable:', text.slice(0, 300))
      return NextResponse.json({ error: 'Bon nicht lesbar' }, { status: 422 })
    }

    // Keep only sane rows
    const clean = lines
      .filter(l => l?.raw_text && Number(l.total_price) > 0 && Number(l.total_price) < 500)
      .map(l => ({
        raw_text: String(l.raw_text).slice(0, 120),
        quantity: Number(l.quantity) > 0 ? Number(l.quantity) : 1,
        unit_price: l.unit_price != null ? Number(l.unit_price) : null,
        total_price: Number(l.total_price),
      }))

    if (clean.length === 0) {
      return NextResponse.json({ ok: true, lines: [], saved: 0, matched: 0 })
    }

    const { data: saved, error } = await supabase.rpc('save_receipt_lines', {
      p_order_id: orderId,
      p_lines: clean,
    })
    if (error) throw error

    const total = clean.reduce((a, l) => a + l.total_price, 0)

    return NextResponse.json({
      ok: true,
      lines: clean.length,
      saved: saved?.saved ?? 0,
      matched: saved?.matched ?? 0,
      receipt_total: Math.round(total * 100) / 100,
    })
  } catch (err: any) {
    console.error('[receipt-parse]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
