'use client'
// components/shop/product-catalog.tsx — real product photos
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Plus, Minus, ShoppingCart, Package, Leaf } from 'lucide-react'
import { useCart } from '@/lib/cart-store'
import { toast } from 'sonner'

type Props = { store: any; products: any[]; categories?: string[] }

export function ProductCatalog({ store, products, categories: catsFromServer }: Props) {
  const [activeCat, setActiveCat] = useState('all')
  const [search, setSearch] = useState('')
  const { addItem, removeItem, setQty, items, storeId, setStore, totalItems, subtotal } = useCart()
  const router = useRouter()

  const add = (product: any) => {
    if (storeId && storeId !== store.id) {
      if (!confirm(`Ihr Warenkorb enthält Artikel von einem anderen Markt. Warenkorb leeren?`)) return
      useCart.getState().clearCart()
    }
    setStore(store.id, store.name, store.delivery_fee, (store as any).lat, (store as any).lng)
    addItem(product)
    toast.success(`${product.name} hinzugefügt`, { duration: 1500 })
  }

  const categories = [
    'all',
    ...(catsFromServer?.length
      ? catsFromServer
      : Array.from(new Set(products.map(p => p.category).filter(Boolean)))),
  ]

  const filtered = products.filter(p => {
    if (activeCat !== 'all' && p.category !== activeCat) return false
    if (search) {
      const q = search.toLowerCase()
      return p.name?.toLowerCase().includes(q) || p.brand?.toLowerCase().includes(q)
    }
    return true
  })

  const qtyOf = (id: string) =>
    items.find((i: any) => i.product.id === id)?.quantity ?? 0

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Store header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <button onClick={() => router.push('/maerkte')}
            className="text-xs text-gray-400 font-bold mb-3 hover:text-gray-600">
            ← Alle Märkte
          </button>
          <h1 className="text-2xl font-black text-gray-900">{store.name}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {store.city} · Liefergebühr ab {Number(store.delivery_fee).toFixed(2)} € ·{' '}
            {products.length} Produkte
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6">
        {/* Search */}
        <div className="flex items-center gap-2 bg-white border-2 border-gray-100 rounded-2xl px-4 py-3 mb-4 focus-within:border-red transition-colors">
          <Search size={17} className="text-gray-400 flex-shrink-0" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Produkt suchen…"
            className="flex-1 outline-none text-sm bg-transparent"
          />
        </div>

        {/* Categories */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {categories.map(c => (
            <button
              key={c}
              onClick={() => setActiveCat(c)}
              className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all flex-shrink-0 ${
                activeCat === c
                  ? 'bg-red text-white'
                  : 'bg-white border border-gray-100 text-gray-500 hover:border-gray-300'
              }`}
            >
              {c === 'all' ? 'Alle' : c}
            </button>
          ))}
        </div>

        {/* Products */}
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-14 text-center">
            <Package size={36} className="text-gray-200 mx-auto mb-3" />
            <p className="font-bold text-gray-900">Keine Produkte gefunden</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered.map(p => {
              const qty = qtyOf(p.id)
              const img = p.image_small_url || p.image_url
              return (
                <div key={p.id}
                  className="bg-white rounded-2xl border border-gray-100 overflow-hidden flex flex-col hover:border-gray-200 hover:shadow-sm transition-all">
                  {/* Photo */}
                  <div className="relative aspect-square bg-white p-3 flex items-center justify-center">
                    {img ? (
                      // Plain <img>: Open Food Facts URLs need no Next.js optimisation
                      <img
                        src={img}
                        alt={p.name}
                        loading="lazy"
                        className="w-full h-full object-contain"
                        onError={e => {
                          const el = e.target as HTMLImageElement
                          el.style.display = 'none'
                          el.parentElement?.querySelector('.fallback')?.classList.remove('hidden')
                        }}
                      />
                    ) : null}
                    <div className={`fallback absolute inset-0 flex items-center justify-center text-4xl ${img ? 'hidden' : ''}`}>
                      🛒
                    </div>

                    {p.attributes?.organic && (
                      <span className="absolute top-2 left-2 flex items-center gap-1 bg-green-50 text-green-700 text-[9px] font-black px-2 py-1 rounded-full">
                        <Leaf size={9} /> BIO
                      </span>
                    )}
                    {p.nutriscore && (
                      <span className={`absolute top-2 right-2 w-5 h-5 rounded text-[10px] font-black text-white flex items-center justify-center ${
                        p.nutriscore === 'a' ? 'bg-green-600'
                        : p.nutriscore === 'b' ? 'bg-lime-500'
                        : p.nutriscore === 'c' ? 'bg-yellow-500'
                        : p.nutriscore === 'd' ? 'bg-orange-500'
                        : 'bg-red-600'
                      }`}>
                        {p.nutriscore.toUpperCase()}
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="px-3 pb-3 flex flex-col flex-1">
                    <div className="font-bold text-sm text-gray-900 leading-tight line-clamp-2 mb-0.5">
                      {p.name}
                    </div>
                    <div className="text-[11px] text-gray-400 mb-2 truncate">
                      {p.brand && `${p.brand} · `}{p.unit}
                    </div>

                    <div className="mt-auto flex items-center justify-between gap-2">
                      <span className="font-black text-gray-900">
                        {Number(p.price).toFixed(2)} €
                      </span>

                      {qty === 0 ? (
                        <button
                          onClick={() => add(p)}
                          className="w-8 h-8 rounded-xl bg-red text-white flex items-center justify-center hover:bg-red-dark transition-colors flex-shrink-0"
                        >
                          <Plus size={16} />
                        </button>
                      ) : (
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <button
                            onClick={() => qty > 1 ? setQty(p.id, qty - 1) : removeItem(p.id)}
                            className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center hover:border-red hover:text-red transition-all"
                          >
                            <Minus size={13} />
                          </button>
                          <span className="font-black text-sm w-5 text-center">{qty}</span>
                          <button
                            onClick={() => setQty(p.id, qty + 1)}
                            className="w-7 h-7 rounded-lg bg-red text-white flex items-center justify-center hover:bg-red-dark transition-colors"
                          >
                            <Plus size={13} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Floating cart */}
      {totalItems() > 0 && (
        <button
          onClick={() => document.dispatchEvent(new Event('open-cart'))}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-3 bg-red text-white rounded-2xl px-5 py-4 font-black shadow-[0_8px_24px_rgba(227,6,19,0.4)] hover:bg-red-dark transition-colors"
        >
          <ShoppingCart size={18} />
          <span>{totalItems()} Artikel</span>
          <span className="bg-white/20 px-2 py-0.5 rounded-lg text-sm">
            {subtotal().toFixed(2)} €
          </span>
        </button>
      )}
    </div>
  )
}
