'use client'
// components/shop/product-catalog.tsx
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Plus, Minus, ShoppingCart } from 'lucide-react'
import { useCart } from '@/lib/cart-store'
import { toast } from 'sonner'
import type { Store, Product } from '@/lib/supabase'
import Image from 'next/image'

type Props = { store: Store; products: Product[]; categories: string[] }

export function ProductCatalog({ store, products, categories }: Props) {
  const [activeCat, setActiveCat] = useState('all')
  const [search, setSearch] = useState('')
  const { addItem, removeItem, setQty, items, storeId, setStore, totalItems, subtotal } = useCart()
  const router = useRouter()

  // Switch store warning bbbbb
  const handleAddToCart = (product: Product) => {
    if (storeId && storeId !== store.id) {
      if (!confirm(`Warenkorb enthält Artikel von einem anderen Markt. Warenkorb leeren und ${store.name} wählen?`)) return
      useCart.getState().clearCart()
    }
    setStore(store.id, store.name, store.delivery_fee, (store as any).lat, (store as any).lng)
    addItem(product)
    toast.success(`${product.name} hinzugefügt`, { duration: 1500 })
  }

  const getQty = (id: string) => items.find(i => i.product.id === id)?.quantity ?? 0

  const filtered = products.filter(p => {
    if (activeCat !== 'all' && p.category !== activeCat) return false
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()) &&
        !p.brand?.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  return (
    <div className="max-w-6xl mx-auto px-6 pb-32 pt-8">
      {/* Store header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Sortiment</p>
          <h1 className="text-2xl font-black text-gray-900">{store.name}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{store.city} · Liefergebühr: {store.delivery_fee.toFixed(2)} €</p>
        </div>
        <button onClick={() => router.push('/#stores')} className="btn-outline">
          Markt wechseln
        </button>
      </div>

      {/* Search + category filters */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2.5 flex-1 min-w-48 max-w-80 focus-within:border-red transition-colors">
          <Search size={16} className="text-gray-400" />
          <input
            type="text" placeholder="Produkt suchen..." value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 outline-none text-sm bg-transparent"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setActiveCat('all')}
            className={`px-4 py-2 rounded-full text-xs font-bold border transition-all ${activeCat === 'all' ? 'bg-red text-white border-red' : 'border-gray-200 text-gray-600 hover:border-red hover:text-red'}`}
          >Alle</button>
          {categories.map(cat => (
            <button key={cat}
              onClick={() => setActiveCat(cat)}
              className={`px-4 py-2 rounded-full text-xs font-bold border transition-all ${activeCat === cat ? 'bg-red text-white border-red' : 'border-gray-200 text-gray-600 hover:border-red hover:text-red'}`}
            >{cat}</button>
          ))}
        </div>
      </div>

      {/* Products grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <div className="text-4xl mb-3">🔍</div>
          <p className="font-semibold">Keine Produkte gefunden</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filtered.map(p => {
            const qty = getQty(p.id)
            return (
              <div key={p.id} className={`bg-white border rounded-2xl p-3 transition-all ${qty > 0 ? 'border-red bg-red/5' : 'border-gray-100 hover:border-gray-200'}`}>
                {/* Image */}
                <div className="w-full h-24 bg-gray-50 rounded-xl flex items-center justify-center mb-3 text-4xl overflow-hidden">
                  {p.image_url ? (
                    <Image src={p.image_url} alt={p.name} width={80} height={80} className="object-contain" />
                  ) : '🛍️'}
                </div>
                {/* Tags */}
                {p.is_organic && <span className="text-xs bg-green-50 text-green-700 font-bold px-2 py-0.5 rounded-full">🌿 Bio</span>}
                {p.price_original && <span className="text-xs bg-orange-light text-orange-dark font-bold px-2 py-0.5 rounded-full ml-1">🔥 Angebot</span>}
                <p className="text-xs font-semibold text-gray-900 mt-1.5 leading-tight line-clamp-2">{p.name}</p>
                {p.brand && <p className="text-xs text-gray-400 mt-0.5">{p.brand}</p>}
                <div className="flex items-center gap-1 mt-1.5">
                  <span className="text-sm font-black text-red">{p.price.toFixed(2)} €</span>
                  {p.price_original && <span className="text-xs text-gray-400 line-through">{p.price_original.toFixed(2)} €</span>}
                </div>
                {/* Qty controls */}
                <div className="mt-2">
                  {qty === 0 ? (
                    <button onClick={() => handleAddToCart(p)}
                      className="w-full bg-gray-50 hover:bg-red/10 hover:text-red border border-gray-200 hover:border-red rounded-lg py-1.5 text-xs font-bold transition-all flex items-center justify-center gap-1">
                      <Plus size={13} /> Hinzufügen
                    </button>
                  ) : (
                    <div className="flex items-center justify-between">
                      <button onClick={() => setQty(p.id, qty - 1)}
                        className="w-7 h-7 rounded-full border border-gray-200 hover:border-red hover:text-red flex items-center justify-center transition-all">
                        <Minus size={13} />
                      </button>
                      <span className="text-sm font-black">{qty}</span>
                      <button onClick={() => handleAddToCart(p)}
                        className="w-7 h-7 rounded-full border border-gray-200 hover:border-red hover:text-red flex items-center justify-center transition-all">
                        <Plus size={13} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Floating cart bar */}
      {totalItems() > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-black rounded-2xl px-5 py-3.5 flex items-center gap-4 shadow-2xl z-40 whitespace-nowrap">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-red flex items-center justify-center text-white text-sm font-black">{totalItems()}</div>
            <div>
              <div className="text-white text-sm font-semibold">{totalItems()} Artikel</div>
              <div className="text-white/60 text-xs">{subtotal().toFixed(2)} € Zwischensumme</div>
            </div>
          </div>
          <button
            onClick={() => document.dispatchEvent(new Event('open-cart'))}
            className="bg-red text-white rounded-xl px-5 py-2.5 text-sm font-bold hover:bg-red-dark transition-colors flex items-center gap-2"
          >
            <ShoppingCart size={15} /> Zur Kasse →
          </button>
        </div>
      )}
    </div>
  )
}
