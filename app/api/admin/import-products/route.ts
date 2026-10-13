// app/api/admin/import-products/route.ts
// Real products from Open Food Facts — only those complete enough to show.
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const OFF_SEARCH  = 'https://world.openfoodfacts.org/cgi/search.pl'
const OFF_PRODUCT = 'https://world.openfoodfacts.org/api/v2/product'
const OPEN_PRICES = 'https://prices.openfoodfacts.org/api/v1/prices'
const UA = 'Echtzeiteinkauf/1.0 (https://echtzeiteinkauf.com; kontakt@echtzeiteinkauf.com)'

function env(name: string): string {
  const e = process.env as Record<string, string | undefined>
  return e[name] ?? ''
}
const SERVICE_KEY = env(['SUPABASE', 'SERVICE', 'KEY'].join('_'))

// ── Shelf mapping ──────────────────────────────────────────────
type Rule = { label: string; tags: string[]; words?: string[] }

const RULES: Rule[] = [
  { label: 'Getränke',
    tags: ['beverages','waters','juices','sodas','coffees','teas','beers','wines','spirits'],
    words: ['wasser','saft','cola','limonade','bier','wein','kaffee','tee','schorle','drink','smoothie'] },
  { label: 'Tiefkühl',
    tags: ['frozen-foods','frozen','ice-cream','frozen-desserts'],
    words: ['tiefkühl','tk-','eiscreme','gefrier'] },
  { label: 'Brot & Gebäck',
    tags: ['breads','bread','bakery-products','viennoiserie','crispbreads','toasts','rolls','baguettes'],
    words: ['brot','brötchen','toast','baguette','croissant','semmel','knäcke','zwieback','brezel'] },
  { label: 'Milch & Eier',
    tags: ['dairies','dairy','milks','cheeses','yogurts','butters','creams','eggs','fermented-milk-products'],
    words: ['milch','käse','joghurt','quark','butter','sahne','eier','schmand','frischkäse','skyr'] },
  { label: 'Fleisch & Fisch',
    tags: ['meats','meat','poultry','sausages','hams','fishes','seafood','charcuterie','salamis'],
    words: ['fleisch','hähnchen','hackfleisch','wurst','schinken','salami','lachs','fisch','thunfisch','schnitzel'] },
  { label: 'Obst & Gemüse',
    tags: ['fruits','vegetables','fresh-vegetables','fresh-fruits','salads','legumes','herbs','potatoes'],
    words: ['apfel','äpfel','banane','tomate','gurke','salat','kartoffel','zwiebel','paprika','karotte','möhre'] },
  { label: 'Süßes & Snacks',
    tags: ['snacks','sweet-snacks','salty-snacks','chocolates','biscuits','candies','chips-and-fries','nuts','cakes'],
    words: ['schokolade','keks','chips','bonbon','gummibär','riegel','nuss','mandel','waffel','kuchen'] },
  { label: 'Grundnahrung',
    tags: ['cereals-and-potatoes','pastas','rices','flours','sugars','oils','vinegars','sauces',
           'canned-foods','condiments','spices','breakfast-cereals','honeys','jams'],
    words: ['nudel','pasta','reis','mehl','zucker','öl','essig','salz','gewürz','soße','sauce','müsli','honig'] },
  { label: 'Drogerie',
    tags: ['non-food-products','hygiene','beauty','cleaning','baby-foods'],
    words: ['shampoo','duschgel','zahnpasta','seife','waschmittel','reiniger','windel','deo'] },
]

function mapCategory(tags: string[] = [], name = ''): string {
  const clean = tags.map(t => t.replace(/^[a-z]{2}:/, '').toLowerCase())
  const lower = name.toLowerCase()
  for (const r of RULES) if (r.tags.some(t => clean.includes(t))) return r.label
  const joined = clean.join(' ')
  for (const r of RULES) if (r.tags.some(t => joined.includes(t))) return r.label
  for (const r of RULES) if (r.words?.some(w => lower.includes(w))) return r.label
  return 'Sonstiges'
}

// ── Build a readable German description ────────────────────────
function buildDescription(p: any): string | null {
  const parts: string[] = []

  // Generic name is OFF's own short description
  const generic = (p.generic_name_de || p.generic_name || '').trim()
  if (generic && generic.length > 3) parts.push(generic)

  // Dietary labels the customer cares about
  const labels = (p.labels_tags || [])
    .map((l: string) => l.replace(/^[a-z]{2}:/, '').toLowerCase())
  const badges: string[] = []
  if (labels.some((l: string) => l.includes('organic') || l.includes('bio'))) badges.push('Bio')
  if (labels.includes('vegan')) badges.push('Vegan')
  else if (labels.includes('vegetarian')) badges.push('Vegetarisch')
  if (labels.some((l: string) => l.includes('gluten-free'))) badges.push('Glutenfrei')
  if (labels.some((l: string) => l.includes('lactose-free'))) badges.push('Laktosefrei')
  if (badges.length) parts.push(badges.join(' · '))

  // Energy per 100 g gives a useful anchor
  const kcal = p.nutriments?.['energy-kcal_100g']
  if (kcal) parts.push(`${Math.round(Number(kcal))} kcal / 100 g`)

  const text = parts.join(' — ')
  return text.length > 5 ? text.slice(0, 300) : null
}

function cleanUnit(p: any): string | null {
  const q = (p.quantity || '').trim()
  if (q && q.length < 40) return q
  if (p.product_quantity) {
    return `${p.product_quantity} ${p.product_quantity_unit || 'g'}`
  }
  return null   // no unit → incomplete
}

function estimatePrice(p: any): number {
  const grams = Number(p.product_quantity) || 0
  const cats = (p.categories_tags || []).join(' ')
  let perKg = 4.5
  if (cats.includes('beverages')) perKg = 1.8
  else if (cats.includes('meat') || cats.includes('fish')) perKg = 12
  else if (cats.includes('cheese') || cats.includes('dairy')) perKg = 7
  else if (cats.includes('snacks') || cats.includes('chocolate')) perKg = 11
  const price = grams > 0 ? (grams / 1000) * perKg : 2.49
  return Math.max(0.49, Math.round(price * 100) / 100)
}

async function fetchOpenPrice(ean: string, chain?: string): Promise<number | null> {
  try {
    const res = await fetch(
      `${OPEN_PRICES}?product_code=${encodeURIComponent(ean)}&order_by=-date&size=5`,
      { headers: { 'User-Agent': UA }, next: { revalidate: 3600 } }
    )
    if (!res.ok) return null
    const data = await res.json()
    const items: any[] = data.items || []
    if (!items.length) return null
    if (chain) {
      const m = items.find(i =>
        (i.location?.osm_name || '').toLowerCase().includes(chain.toLowerCase()))
      if (m?.price) return Number(m.price)
    }
    return items[0]?.price ? Number(items[0].price) : null
  } catch { return null }
}

export async function POST(request: Request) {
  try {
    const {
      chain, page = 1, pageSize = 40,
      withPrices = true,
      requirePhoto = true,
      requireDescription = false,
      onlyRealPrices = false,
    } = await request.json()

    if (!chain) return NextResponse.json({ error: 'chain fehlt' }, { status: 400 })

    const params = new URLSearchParams({
      action: 'process',
      tagtype_0: 'stores',    tag_contains_0: 'contains', tag_0: chain,
      tagtype_1: 'countries', tag_contains_1: 'contains', tag_1: 'germany',
      sort_by: 'unique_scans_n',
      page_size: String(Math.min(pageSize * 2, 100)),  // over-fetch, we filter hard
      page: String(page),
      json: '1',
      fields: [
        'code','product_name','product_name_de','generic_name','generic_name_de',
        'brands','quantity','product_quantity','product_quantity_unit',
        'categories_tags','image_url','image_front_url','image_front_small_url',
        'nutriscore_grade','labels_tags','unique_scans_n','nutriments',
        'ingredients_text_de','ingredients_text',
      ].join(','),
    })

    const res = await fetch(`${OFF_SEARCH}?${params}`, {
      headers: { 'User-Agent': UA },
      next: { revalidate: 1800 },
    })
    if (!res.ok) {
      return NextResponse.json(
        { error: `Open Food Facts antwortet nicht (${res.status})` }, { status: 502 }
      )
    }

    const data = await res.json()
    const raw: any[] = data.products || []

    let rejected = { noName: 0, noPhoto: 0, noUnit: 0, noDesc: 0, noPrice: 0 }

    const candidates = raw.map(p => {
      const name = (p.product_name_de || p.product_name || '').trim()
      const image = p.image_front_url || p.image_url || null
      const unit = cleanUnit(p)
      const description = buildDescription(p)

      return { raw: p, name, image, unit, description }
    })

    const products: any[] = []

    for (const c of candidates) {
      if (products.length >= pageSize) break

      // ── Completeness gates ──
      if (!c.name || c.name.length < 2) { rejected.noName++; continue }
      if (requirePhoto && !c.image)     { rejected.noPhoto++; continue }
      if (!c.unit)                      { rejected.noUnit++; continue }
      if (requireDescription && !c.description) { rejected.noDesc++; continue }

      const p = c.raw
      let price: number | null = null
      let priceSource = 'estimated'

      if (withPrices) {
        price = await fetchOpenPrice(p.code, chain)
        if (price) priceSource = 'openprices'
      }
      if (!price) {
        if (onlyRealPrices) { rejected.noPrice++; continue }
        price = estimatePrice(p)
      }

      const labels = (p.labels_tags || [])
        .map((l: string) => l.replace(/^[a-z]{2}:/, '').toLowerCase())

      const n = p.nutriments || {}

      products.push({
        ean: p.code,
        off_id: p.code,
        name: c.name,
        brand: (p.brands || '').split(',')[0]?.trim() || null,
        category: mapCategory(p.categories_tags, c.name),
        unit: c.unit,
        price,
        price_source: priceSource,
        image_url: c.image,
        image_small_url: p.image_front_small_url || c.image,
        nutriscore: p.nutriscore_grade || null,
        description: c.description,
        ingredients: (p.ingredients_text_de || p.ingredients_text || '').trim().slice(0, 1000) || null,
        nutrition: {
          kcal_100g:    n['energy-kcal_100g'] ?? null,
          fat_100g:     n['fat_100g'] ?? null,
          carbs_100g:   n['carbohydrates_100g'] ?? null,
          sugars_100g:  n['sugars_100g'] ?? null,
          protein_100g: n['proteins_100g'] ?? null,
          salt_100g:    n['salt_100g'] ?? null,
        },
        scans: p.unique_scans_n || 0,
        attributes: {
          organic: labels.some((l: string) => l.includes('organic') || l.includes('bio')),
          vegan: labels.includes('vegan'),
          vegetarian: labels.includes('vegetarian'),
          weight_g: Number(p.product_quantity) || null,
        },
      })
    }

    return NextResponse.json({
      ok: true,
      chain,
      page,
      total: data.count || 0,
      scanned: raw.length,
      returned: products.length,
      rejected,
      products,
    })
  } catch (err: any) {
    console.error('[import-products]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// Barcode lookup for the merchant portal
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const ean = searchParams.get('ean')
  if (!ean) return NextResponse.json({ error: 'ean fehlt' }, { status: 400 })

  try {
    const res = await fetch(`${OFF_PRODUCT}/${ean}.json`, {
      headers: { 'User-Agent': UA },
      next: { revalidate: 86400 },
    })
    const data = await res.json()
    if (data.status !== 1) {
      return NextResponse.json({ ok: false, reason: 'not_found' }, { status: 404 })
    }
    const p = data.product
    const name = (p.product_name_de || p.product_name || '').trim()
    const n = p.nutriments || {}

    return NextResponse.json({
      ok: true,
      product: {
        ean,
        name,
        brand: (p.brands || '').split(',')[0]?.trim() || null,
        unit: cleanUnit(p) || '1 Stück',
        category: mapCategory(p.categories_tags, name),
        image_url: p.image_front_url || p.image_url || null,
        image_small_url: p.image_front_small_url || null,
        nutriscore: p.nutriscore_grade || null,
        description: buildDescription(p),
        ingredients: (p.ingredients_text_de || p.ingredients_text || '').trim().slice(0, 1000) || null,
        nutrition: {
          kcal_100g:    n['energy-kcal_100g'] ?? null,
          fat_100g:     n['fat_100g'] ?? null,
          carbs_100g:   n['carbohydrates_100g'] ?? null,
          protein_100g: n['proteins_100g'] ?? null,
        },
      },
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
