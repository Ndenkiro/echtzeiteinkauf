// lib/cart-store.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Product, CartItem } from './supabase-browser'

type CartState = {
  items: CartItem[]
  address: string | null
  storeId: string | null
  storeName: string | null
  deliveryFee: number
  addItem: (product: Product, storeId: string, storeName: string, deliveryFee: number) => void
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  clearCart: () => void
  setAddress: (address: string) => void
  totalItems: () => number
  totalPrice: () => number
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
        if (state.storeId && state.storeId !== storeId) {
          if (!confirm(`Ihr Warenkorb enthält Artikel von ${state.storeName}. Warenkorb leeren und bei ${storeName} einkaufen?`)) {
            return
          }
          set({ items: [], storeId, storeName, deliveryFee })
        }
        set(s => {
          const existing = s.items.find(i => i.product.id === product.id)
          if (existing) {
            return {
              items: s.items.map(i =>
                i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
              ),
              storeId, storeName, deliveryFee,
            }
          }
          return {
            items: [...s.items, { product, quantity: 1 }],
            storeId, storeName, deliveryFee,
          }
        })
      },

      removeItem: (productId) => set(s => {
        const items = s.items.filter(i => i.product.id !== productId)
        return items.length === 0
          ? { items, storeId: null, storeName: null }
          : { items }
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
    }),
    { name: 'echtzeiteinkauf-cart' }
  )
)
