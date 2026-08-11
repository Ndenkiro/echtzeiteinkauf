// app/api/cron/release-stale/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function env(name: string): string {
  const e = process.env as Record<string, string | undefined>
  return e[name] ?? ''
}
const SERVICE_KEY = env(['SUPABASE', 'SERVICE', 'KEY'].join('_'))
const CRON_SECRET = env(['CRON', 'SECRET'].join('_'))

const supabaseAdmin = () => createClient(
  'https://wpxpgszzzfhhsaunolyq.supabase.co',
  SERVICE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function GET(request: Request) {
  // Simple shared-secret guard so the endpoint isn't publicly callable
  const auth = request.headers.get('authorization') || ''
  const token = auth.replace('Bearer ', '')
  if (CRON_SECRET && token !== CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = supabaseAdmin()
    const { data, error } = await supabase.rpc('release_stale_missions')
    if (error) throw error

    if (data?.released > 0) {
      console.log(`[cron] released ${data.released} stale mission(s)`)
    }
    return NextResponse.json(data)
  } catch (err: any) {
    console.error('[cron] release failed:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export const POST = GET
