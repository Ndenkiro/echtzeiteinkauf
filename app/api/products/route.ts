// app/api/products/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const storeId  = searchParams.get('store_id')
  const category = searchParams.get('category')
  const q        = searchParams.get('q')
  const page     = parseInt(searchParams.get('page') ?? '1')
  const limit    = Math.min(parseInt(searchParams.get('limit') ?? '48'), 100)

  if (!storeId) return NextResponse.json({ error: 'store_id required' }, { status: 400 })

  const supabase = supabaseAdmin()
  let query = supabase
    .from('products')
    .select('*', { count: 'exact' })
    .eq('store_id', storeId)
    .eq('in_stock', true)
    .order('category').order('name')
    .range((page - 1) * limit, page * limit - 1)

  if (category && category !== 'all') query = query.eq('category', category)
  if (q && q.length >= 2)             query = query.ilike('name', `%${q}%`)

  const { data, error, count } = await query

  if (error) {
    console.error('[/api/products]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(
    { products: data, total: count, page, limit },
    { headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300' } }
  )
}
