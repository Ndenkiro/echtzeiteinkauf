import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Product, CartItem } from './supabase-browser'

type CartState = {
  items: CartItem[]
  address: string | null
  storeId: string | null
  storeName: string | null
  deliveryFee: number
  addItem: (product: Product, storeId?: string, storeName?: string, deliveryFee?: number) => void
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  clearCart: () => void
  setAddress: (address: string) => void
  totalItems: () => number
  totalPrice: () => number
  setQty: (productId: string, quantity: number) => void
  setStore: (storeId: string, storeName?: string, deliveryFee?: number) => void
  subtotal: () => number
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      address: null,
      storeId: null,
      storeName: null,
      deliveryFee: 1.99,
      addItem: (product, storeId, storeName, deliveryFee) => {
        const state = get()
        if (storeId && state.storeId && state.storeId !== storeId && state.items.length > 0) {
          if (!confirm(`Warenkorb leeren und bei ${storeName} einkaufen?`)) return
          set({ items: [], storeId, storeName: storeName || null, deliveryFee: deliveryFee ?? 1.99 })
        }
        set(s => {
          const existing = s.items.find(i => i.product.id === product.id)
          return {
            items: existing
              ? s.items.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i)
              : [...s.items, { product, quantity: 1 }],
            ...(storeId ? { storeId, storeName: storeName || s.storeName, deliveryFee: deliveryFee ?? s.deliveryFee } : {}),
          }
        })
      },
      removeItem: (productId) => set(s => {
        const items = s.items.filter(i => i.product.id !== productId)
        return items.length === 0 ? { items, storeId: null, storeName: null } : { items }
      }),
      updateQuantity: (productId, quantity) => set(s => ({
        items: quantity <= 0
          ? s.items.filter(i => i.product.id !== productId)
          : s.items.map(i => i.product.id === productId ? { ...i, quantity } : i),
      })),
      clearCart: () => set({ items: [], storeId: null, storeName: null }),
      setAddress: (address) => set({ address }),
      totalItems: () => get().items.reduce((a, i) => a + i.quantity, 0),
      totalPrice: () => get().items.reduce((a, i) => a + Number(i.product.price) * i.quantity, 0),
      setQty: (productId, quantity) => get().updateQuantity(productId, quantity),
      setStore: (storeId, storeName, deliveryFee) => set({
        storeId,
        ...(storeName ? { storeName } : {}),
        ...(deliveryFee !== undefined ? { deliveryFee } : {}),
      }),
      subtotal: () => get().totalPrice(),
    }),
    { name: 'echtzeiteinkauf-cart' }
  )
)