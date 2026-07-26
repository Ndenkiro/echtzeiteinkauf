'use client'
// components/shop/cart-drawer.tsx — scrollable checkout
import { useEffect, useState } from 'react'
import { X, Minus, Plus, Trash2, ShoppingCart } from 'lucide-react'
import { useCart } from '@/lib/cart-store'
import { CheckoutSection } from './checkout-button'

export function CartDrawer() {
  const [open, setOpen] = useState(false)
  const items = useCart(s => s.items)
  const updateQuantity = useCart(s => s.updateQuantity)
  const removeItem = useCart(s => s.removeItem)
  const storeId = useCart(s => s.storeId)
  const storeName = useCart(s => s.storeName)
  const storeLat = useCart(s => s.storeLat)
  const storeLng = useCart(s => s.storeLng)

  useEffect(() => {
    const handler = () => setOpen(true)
    document.addEventListener('open-cart', handler)
    return () => document.removeEventListener('open-cart', handler)
  }, [])

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/40 z-[60]" onClick={() => setOpen(false)} />}
      <div className={`fixed top-0 right-0 bottom-0 w-full max-w-md bg-white z-[70] shadow-2xl transition-transform duration-300 flex flex-col ${open ? 'translate-x-0' : 'translate-x-full'}`}>
        {/* Header - fixed */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 flex-shrink-0">
          <div>
            <h2 className="font-black text-lg text-gray-900">Warenkorb</h2>
            {storeName && <p className="text-xs text-gray-400">{storeName}</p>}
          </div>
          <button onClick={() => setOpen(false)} className="w-9 h-9 rounded-xl border border-gray-100 flex items-center justify-center hover:border-gray-300 transition-colors">
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        {/* Everything scrollable together */}
        <div className="flex-1 overflow-y-auto">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-6 py-20">
              <ShoppingCart size={40} className="text-gray-200 mb-4" />
              <p className="font-bold text-gray-900 mb-1">Ihr Warenkorb ist leer</p>
              <p className="text-sm text-gray-400">Fügen Sie Produkte hinzu, um zu bestellen</p>
            </div>
          ) : (
            <>
              {/* Items */}
              <div className="px-6 py-4 flex flex-col gap-4 border-b border-gray-100">
                {items.map(item => (
                  <div key={item.product.id} className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-xl bg-gray-50 flex items-center justify-center text-xl flex-shrink-0">🛒</div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm text-gray-900 truncate">{item.product.name}</div>
                      <div className="text-xs text-gray-400">{item.product.unit} · {Number(item.product.price).toFixed(2)} €</div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => item.quantity > 1 ? updateQuantity(item.product.id, item.quantity - 1) : removeItem(item.product.id)}
                        className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center hover:border-red hover:text-red transition-all"
                      >
                        {item.quantity > 1 ? <Minus size={13} /> : <Trash2 size={13} />}
                      </button>
                      <span className="font-black text-sm text-gray-900 w-5 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                        className="w-7 h-7 rounded-lg bg-red text-white flex items-center justify-center hover:bg-red-dark transition-colors"
                      >
                        <Plus size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Checkout section - now in the scroll flow */}
              {storeId && (
                <div className="px-6 py-5 bg-gray-50/50">
                  <CheckoutSection
                    storeId={storeId}
                    storeLat={storeLat ?? undefined}
                    storeLng={storeLng ?? undefined}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  )
}
