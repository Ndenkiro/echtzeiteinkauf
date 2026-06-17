// lib/cart-store.ts — global cart state with Zustand
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Product, CartItem } from './supabase'

type CartStore = {
  items:      CartItem[]
  storeId:    string | null
  storeName:  string | null
  address:    string
  tipPct:     number

  addItem:    (product: Product) => void
  removeItem: (productId: string) => void
  setQty:     (productId: string, qty: number) => void
  clearCart:  () => void
  setStore:   (id: string, name: string) => void
  setAddress: (addr: string) => void
  setTip:     (pct: number) => void

  // Derived
  totalItems:    () => number
  subtotal:      () => number
  deliveryFee:   () => number
  serviceFee:    () => number
  tipAmount:     () => number
  grandTotal:    (deliveryFee?: number) => number
}

export const useCart = create<CartStore>()(
  persist(
    (set, get) => ({
      items:     [],
      storeId:   null,
      storeName: null,
      address:   '',
      tipPct:    5,

      addItem: (product) => {
        const { items } = get()
        const existing = items.find(i => i.product.id === product.id)
        if (existing) {
          set({ items: items.map(i => i.product.id === product.id
            ? { ...i, quantity: i.quantity + 1 } : i) })
        } else {
          set({ items: [...items, { product, quantity: 1 }] })
        }
      },

      removeItem: (productId) =>
        set({ items: get().items.filter(i => i.product.id !== productId) }),

      setQty: (productId, qty) => {
        if (qty <= 0) { get().removeItem(productId); return }
        set({ items: get().items.map(i =>
          i.product.id === productId ? { ...i, quantity: qty } : i) })
      },

      clearCart:  () => set({ items: [], storeId: null, storeName: null }),
      setStore:   (id, name) => set({ storeId: id, storeName: name }),
      setAddress: (addr) => set({ address: addr }),
      setTip:     (pct) => set({ tipPct: pct }),

      totalItems:  () => get().items.reduce((a, i) => a + i.quantity, 0),
      subtotal:    () => get().items.reduce((a, i) => a + i.product.price * i.quantity, 0),
      deliveryFee: () => 1.99,
      serviceFee:  () => get().subtotal() * 0.05,
      tipAmount:   () => get().subtotal() * (get().tipPct / 100),
      grandTotal:  (fee) => {
        const s = get()
        const d = fee ?? s.deliveryFee()
        return s.subtotal() + d + s.serviceFee() + s.tipAmount()
      },
    }),
    { name: 'echtzeiteinkauf-cart' }
  )
)
