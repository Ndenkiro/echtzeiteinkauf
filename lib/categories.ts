// lib/categories.ts — single source of truth for store categories
export type CategoryId = 'food' | 'drugstore' | 'textile' | 'electronics' | 'other'

export type Category = {
  id: CategoryId
  label: string
  icon: string
  /** Google Places types used when searching the map */
  googleTypes: string[]
  /** Delivery fee inputs — must mirror store_categories in SQL */
  baseFee: number
  perKm: number
  perItem: number
  /** Spending cap for the shopper's virtual card */
  maxOrder: number
  /** Accent colour for badges and highlights */
  color: string
  /** What the merchant sees when adding products */
  attributeFields: {
    key: string
    label: string
    type: 'text' | 'number' | 'select' | 'multiselect' | 'boolean'
    options?: string[]
    unit?: string
  }[]
}

export const CATEGORIES: Category[] = [
  {
    id: 'food',
    label: 'Lebensmittel',
    icon: '🛒',
    googleTypes: ['supermarket', 'grocery_or_supermarket'],
    baseFee: 3.99, perKm: 0.40, perItem: 0.15, maxOrder: 300,
    color: '#22C55E',
    attributeFields: [
      { key: 'weight_g',  label: 'Gewicht',  type: 'number', unit: 'g' },
      { key: 'organic',   label: 'Bio',      type: 'boolean' },
      { key: 'vegan',     label: 'Vegan',    type: 'boolean' },
      { key: 'origin',    label: 'Herkunft', type: 'text' },
    ],
  },
  {
    id: 'drugstore',
    label: 'Drogerie',
    icon: '🧴',
    googleTypes: ['drugstore', 'pharmacy'],
    baseFee: 3.99, perKm: 0.40, perItem: 0.15, maxOrder: 200,
    color: '#06B6D4',
    attributeFields: [
      { key: 'volume_ml', label: 'Inhalt', type: 'number', unit: 'ml' },
      { key: 'brand',     label: 'Marke',  type: 'text' },
    ],
  },
  {
    id: 'textile',
    label: 'Mode',
    icon: '👕',
    googleTypes: ['clothing_store', 'shoe_store'],
    baseFee: 4.99, perKm: 0.45, perItem: 0.25, maxOrder: 500,
    color: '#A855F7',
    attributeFields: [
      { key: 'sizes',    label: 'Größen',   type: 'multiselect',
        options: ['XS','S','M','L','XL','XXL','34','36','38','40','42','44','46'] },
      { key: 'color',    label: 'Farbe',    type: 'text' },
      { key: 'gender',   label: 'Für',      type: 'select',
        options: ['Damen','Herren','Unisex','Kinder'] },
      { key: 'material', label: 'Material', type: 'text' },
    ],
  },
  {
    id: 'electronics',
    label: 'Elektronik',
    icon: '💻',
    googleTypes: ['electronics_store', 'home_goods_store'],
    baseFee: 6.99, perKm: 0.55, perItem: 0.50, maxOrder: 1500,
    color: '#3B82F6',
    attributeFields: [
      { key: 'brand',           label: 'Marke',      type: 'text' },
      { key: 'model',           label: 'Modell',     type: 'text' },
      { key: 'warranty_months', label: 'Garantie',   type: 'number', unit: 'Monate' },
      { key: 'condition',       label: 'Zustand',    type: 'select',
        options: ['Neu','Ausstellungsstück','Generalüberholt'] },
    ],
  },
  {
    id: 'other',
    label: 'Sonstiges',
    icon: '🏪',
    googleTypes: ['store', 'department_store'],
    baseFee: 4.99, perKm: 0.45, perItem: 0.20, maxOrder: 400,
    color: '#64748B',
    attributeFields: [
      { key: 'brand', label: 'Marke', type: 'text' },
    ],
  },
]

export const CATEGORY_MAP: Record<string, Category> =
  Object.fromEntries(CATEGORIES.map(c => [c.id, c]))

export function getCategory(id?: string | null): Category {
  return CATEGORY_MAP[id || 'food'] ?? CATEGORY_MAP.food
}

/** Suggested commission — must mirror suggest_commission() in SQL */
export function suggestCommission(
  categoryId: string,
  distanceKm: number,
  itemCount: number
) {
  const c = getCategory(categoryId)
  const hour = new Date().getHours()
  const isPeak = (hour >= 7 && hour <= 8) || (hour >= 16 && hour <= 18)
  const base = c.baseFee + distanceKm * c.perKm + itemCount * c.perItem
  const peak = isPeak ? base * 0.30 : 0
  const suggested = Math.round((base + peak) * 100) / 100
  return {
    suggested,
    minimum: Math.round(suggested * 0.6 * 100) / 100,
    base: Math.round(base * 100) / 100,
    peak: Math.round(peak * 100) / 100,
    isPeak,
  }
}

/** Known German chains → category, used to classify Places results */
const CHAIN_CATEGORY: Record<string, CategoryId> = {
  lidl: 'food', aldi: 'food', rewe: 'food', edeka: 'food', penny: 'food',
  kaufland: 'food', netto: 'food', norma: 'food', tegut: 'food', globus: 'food',
  denns: 'food', alnatura: 'food',

  dm: 'drugstore', rossmann: 'drugstore', müller: 'drugstore', budni: 'drugstore',

  'h&m': 'textile', 'c&a': 'textile', zara: 'textile', primark: 'textile',
  'peek': 'textile', 'takko': 'textile', kik: 'textile', 'new yorker': 'textile',
  deichmann: 'textile', 'zalando': 'textile', esprit: 'textile', 's.oliver': 'textile',

  mediamarkt: 'electronics', 'media markt': 'electronics', saturn: 'electronics',
  expert: 'electronics', conrad: 'electronics', cyberport: 'electronics',
}

export function detectCategory(storeName: string): CategoryId {
  const n = storeName.toLowerCase()
  for (const [chain, cat] of Object.entries(CHAIN_CATEGORY)) {
    if (n.includes(chain)) return cat
  }
  return 'other'
}
