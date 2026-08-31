// app/api/admin/import-products/route.ts
// Fetches real products sold at a given chain from Open Food Facts,
// enriched with crowdsourced prices from Open Prices.
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const OFF_SEARCH = 'https://world.openfoodfacts.org/cgi/search.pl'
const OFF_PRODUCT = 'https://world.openfoodfacts.org/api/v2/product'
const OPEN_PRICES = 'https://prices.openfoodfacts.org/api/v1/prices'

// Open Food Facts asks every client to identify itself
const UA = 'Echtzeiteinkauf/1.0 (https://echtzeiteinkauf.com; kontakt@echtzeiteinkauf.de)'

// OFF tags and product names → our German shelf names.
// Order matters: the most specific rule wins.
type Rule = { label: string; tags: string[]; words?: string[] }

const RULES: Rule[] = [
  {
    label: 'Getränke',
    tags: ['beverages', 'waters', 'juices', 'sodas', 'coffees', 'teas', 'beers', 'wines', 'spirits'],
    words: ['wasser', 'saft', 'cola', 'limonade', 'bier', 'wein', 'kaffee', 'tee', 'schorle', 'drink', 'smoothie'],
  },
  {
    label: 'Tiefkühl',
    tags: ['frozen-foods', 'frozen', 'ice-cream', 'frozen-desserts'],
    words: ['tiefkühl', 'tk-', 'eiscreme', 'gefrier'],
  },
  {
    label: 'Brot & Gebäck',
    tags: ['breads', 'bread', 'bakery-products', 'viennoiserie', 'crispbreads', 'toasts', 'rolls', 'baguettes'],
    words: ['brot', 'brötchen', 'toast', 'baguette', 'croissant', 'semmel', 'knäcke', 'zwieback', 'brezel'],
  },
  {
    label: 'Milch & Eier',
    tags: ['dairies', 'dairy', 'milks', 'cheeses', 'yogurts', 'butters', 'creams', 'eggs', 'fermented-milk-products'],
    words: ['milch', 'käse', 'joghurt', 'quark', 'butter', 'sahne', 'eier', 'schmand', 'frischkäse', 'skyr'],
  },
  {
    label: 'Fleisch & Fisch',
    tags: ['meats', 'meat', 'poultry', 'sausages', 'hams', 'fishes', 'seafood', 'charcuterie', 'salamis'],
    words: ['fleisch', 'hähnchen', 'hackfleisch', 'wurst', 'schinken', 'salami', 'lachs', 'fisch', 'thunfisch', 'schnitzel', 'gulasch'],
  },
  {
    label: 'Obst & Gemüse',
    tags: ['fruits', 'vegetables', 'fresh-vegetables', 'fresh-fruits', 'salads', 'legumes', 'herbs', 'potatoes'],
    words: ['apfel', 'äpfel', 'banane', 'tomate', 'gurke', 'salat', 'kartoffel', 'zwiebel', 'paprika', 'karotte',
            'möhre', 'zitrone', 'orange', 'birne', 'traube', 'beere', 'avocado', 'brokkoli', 'spinat'],
  },
  {
    label: 'Süßes & Snacks',
    tags: ['snacks', 'sweet-snacks', 'salty-snacks', 'chocolates', 'biscuits', 'candies', 'chips-and-fries',
           'confectioneries', 'nuts', 'cakes'],
    words: ['schokolade', 'keks', 'chips', 'bonbon', 'gummibär', 'riegel', 'nuss', 'mandel', 'waffel', 'kuchen', 'praline'],
  },
  {
    label: 'Grundnahrung',
    tags: ['cereals-and-potatoes', 'pastas', 'rices', 'flours', 'sugars', 'oils', 'vinegars', 'sauces',
           'canned-foods', 'condiments', 'spices', 'breakfast-cereals', 'honeys', 'jams'],
    words: ['nudel', 'pasta', 'spaghetti', 'reis', 'mehl', 'zucker', 'öl', 'essig', 'salz', 'pfeffer',
            'gewürz', 'soße', 'sauce', 'ketchup', 'senf', 'müsli', 'haferflocken', 'honig', 'marmelade',
            'konserve', 'dose', 'linsen', 'bohnen'],
  },
  {
    label: 'Drogerie',
    tags: ['non-food-products', 'hygiene', 'beauty', 'cleaning', 'baby-foods'],
    words: ['shampoo', 'duschgel', 'zahnpasta', 'seife', 'waschmittel', 'reiniger', 'windel', 'deo'],
  },
]

function mapCategory(tags: string[] = [], name = ''): string {
  // Strip the language prefix: "en:breads" → "breads"
  const clean = tags.map(t => t.replace(/^[a-z]{2}:/, '').toLowerCase())
  const lowerName = name.toLowerCase()

  // 1. Exact tag match — most reliable
  for (const rule of RULES) {
    if (rule.tags.some(t => clean.includes(t))) return rule.label
  }

  // 2. Partial tag match
  const joined = clean.join(' ')
  for (const rule of RULES) {
    if (rule.tags.some(t => joined.includes(t))) return rule.label
  }

  // 3. Fall back to the product name
  for (const rule of RULES) {
    if (rule.words?.some(w => lowerName.includes(w))) return rule.label
  }

  return 'Sonstiges'
}

function cleanUnit(p: any): string {
  const q = (p.quantity || '').trim()
  if (q) return q
  if (p.product_quantity) return `${p.product_quantity} ${p.product_quantity_unit || 'g'}`
  return '1 Stück'
}

/** Rough fallback price when nothing better is known */
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

/** Latest crowdsourced price for an EAN, optionally per chain */
async function fetchOpenPrice(ean: string, chain?: string): Promise<number | null> {
  try {
    const url = `${OPEN_PRICES}?product_code=${encodeURIComponent(ean)}&order_by=-date&size=5`
    const res = await fetch(url, { headers: { 'User-Agent': UA }, next: { revalidate: 3600 } })
    if (!res.ok) return null
    const data = await res.json()
    const items: any[] = data.items || []
    if (!items.length) return null

    // Prefer a price seen at the same chain
    if (chain) {
      const match = items.find(i =>
        (i.location?.osm_name || '').toLowerCase().includes(chain.toLowerCase())
      )
      if (match?.price) return Number(match.price)
    }
    return items[0]?.price ? Number(items[0].price) : null
  } catch {
    return null
  }
}

export async function POST(request: Request) {
  try {
    const { chain, page = 1, pageSize = 40, withPrices = true } = await request.json()
    if (!chain) {
      return NextResponse.json({ error: 'chain fehlt' }, { status: 400 })
    }

    // Products tagged as sold at this chain, in Germany
    const params = new URLSearchParams({
      action: 'process',
      tagtype_0: 'stores',      tag_contains_0: 'contains', tag_0: chain,
      tagtype_1: 'countries',   tag_contains_1: 'contains', tag_1: 'germany',
      sort_by: 'unique_scans_n',           // most scanned first = most common
      page_size: String(Math.min(pageSize, 100)),
      page: String(page),
      json: '1',
      fields: [
        'code', 'product_name', 'product_name_de', 'brands', 'quantity',
        'product_quantity', 'product_quantity_unit', 'categories_tags',
        'image_url', 'image_front_url', 'image_front_small_url',
        'nutriscore_grade', 'labels_tags', 'unique_scans_n',
      ].join(','),
    })

    const res = await fetch(`${OFF_SEARCH}?${params}`, {
      headers: { 'User-Agent': UA },
      next: { revalidate: 1800 },
    })

    if (!res.ok) {
      return NextResponse.json(
        { error: `Open Food Facts antwortet nicht (${res.status})` },
        { status: 502 }
      )
    }

    const data = await res.json()
    const raw: any[] = data.products || []

    const products = await Promise.all(
      raw
        .filter(p => (p.product_name_de || p.product_name) && p.code)
        .map(async p => {
          const name = (p.product_name_de || p.product_name || '').trim()
          const labels = (p.labels_tags || []).join(' ')
          const image = p.image_front_url || p.image_url || null

          let price: number | null = null
          let priceSource = 'estimated'

          if (withPrices) {
            price = await fetchOpenPrice(p.code, chain)
            if (price) priceSource = 'openprices'
          }
          if (!price) price = estimatePrice(p)

          return {
            ean: p.code,
            off_id: p.code,
            name,
            brand: (p.brands || '').split(',')[0]?.trim() || null,
            category: mapCategory(p.categories_tags, name),
            unit: cleanUnit(p),
            price,
            price_source: priceSource,
            image_url: image,
            image_small_url: p.image_front_small_url || image,
            nutriscore: p.nutriscore_grade || null,
            scans: p.unique_scans_n || 0,
            attributes: {
              organic: labels.includes('organic') || labels.includes('bio'),
              vegan: labels.includes('vegan'),
              vegetarian: labels.includes('vegetarian'),
              weight_g: Number(p.product_quantity) || null,
            },
          }
        })
    )

    return NextResponse.json({
      ok: true,
      chain,
      page,
      total: data.count || products.length,
      returned: products.length,
      products,
    })
  } catch (err: any) {
    console.error('[import-products]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// Quick lookup by barcode — used by the merchant portal later
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
    return NextResponse.json({
      ok: true,
      product: {
        ean,
        name: p.product_name_de || p.product_name,
        brand: (p.brands || '').split(',')[0]?.trim() || null,
        unit: cleanUnit(p),
        category: mapCategory(p.categories_tags, p.product_name_de || p.product_name || ''),
        image_url: p.image_front_url || p.image_url || null,
        image_small_url: p.image_front_small_url || null,
        nutriscore: p.nutriscore_grade || null,
      },
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
