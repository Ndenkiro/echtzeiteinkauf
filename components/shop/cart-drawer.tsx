'use client'
// components/shop/cart-drawer.tsx
import { useEffect, useState } from 'react'
import { X, Minus, Plus, Trash2 } from 'lucide-react'
import { useCart } from '@/lib/cart-store'
import { toast } from 'sonner'

export function CartDrawer() {
  const [open, setOpen]         = useState(false)
  const [checkoutOpen, setCheckout] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [tipPct, setTipPct]     = useState(5)
  const [payMethod, setPayMethod] = useState('card')
  const [delOption, setDelOption] = useState('express')

  const { items, storeId, storeName, address, subtotal, deliveryFee, serviceFee, tipAmount, grandTotal, setQty, removeItem, clearCart, setTip } = useCart()
  const n = items.reduce((a, i) => a + i.quantity, 0)
  const sub = subtotal()
  const svc = serviceFee()
  const tip = tipAmount()
  const fee = delOption === 'scheduled' ? 0 : deliveryFee()
  const total = Math.round((sub + fee + svc + tip) * 100) / 100

  useEffect(() => {
    const h = () => setOpen(true)
    document.addEventListener('open-cart', h)
    return () => document.removeEventListener('open-cart', h)
  }, [])

  const onTipChange = (pct: number) => { setTipPct(pct); setTip(pct) }

  const placeOrder = async () => {
    if (!storeId || !items.length) return
    setLoading(true)
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId,
          items: items.map(i => ({ productId: i.product.id, quantity: i.quantity })),
          deliveryAddress: { street: address || 'Nürnberger Str. 134', city: 'Fürth', zip: '90762', lat: 49.47, lng: 10.98 },
          tipPct,
          paymentMethod: payMethod,
          deliveryOption: delOption,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      setCheckout(false)
      setOpen(false)
      clearCart()
      toast.success('🎉 Bestellung bestätigt! #' + data.orderId.slice(0, 8).toUpperCase())
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Overlay */}
      {open && <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setOpen(false)} />}

      {/* Drawer */}
      <div className={`fixed top-0 right-0 bottom-0 w-full max-w-md bg-white z-50 flex flex-col transition-transform duration-300 shadow-2xl ${open ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <h2 className="text-xl font-black">🛒 Warenkorb {storeName && <span className="text-sm font-normal text-gray-400">— {storeName}</span>}</h2>
          <button onClick={() => setOpen(false)} className="w-9 h-9 rounded-full border border-gray-100 flex items-center justify-center hover:bg-gray-50 transition-colors"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {items.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <div className="text-5xl mb-4">🛒</div>
              <p className="font-semibold text-gray-600">Ihr Warenkorb ist leer</p>
              <p className="text-sm mt-1">Fügen Sie Produkte aus dem Sortiment hinzu</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {items.map(({ product: p, quantity }) => (
                <div key={p.id} className="flex items-center gap-3 py-3 border-b border-gray-50">
                  <div className="w-14 h-14 bg-gray-50 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">🛍️</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{p.name}</p>
                    <p className="text-xs text-gray-400">{p.price.toFixed(2)} € / Stück</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setQty(p.id, quantity - 1)} className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center hover:border-red hover:text-red transition-all"><Minus size={13} /></button>
                    <span className="text-sm font-black w-5 text-center">{quantity}</span>
                    <button onClick={() => setQty(p.id, quantity + 1)} className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center hover:border-red hover:text-red transition-all"><Plus size={13} /></button>
                  </div>
                  <div className="text-right min-w-16">
                    <p className="text-sm font-black">{(p.price * quantity).toFixed(2)} €</p>
                    <button onClick={() => removeItem(p.id)} className="text-gray-300 hover:text-red transition-colors mt-0.5"><Trash2 size={13} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {items.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-100 flex-shrink-0 bg-white">
            {/* Tip slider */}
            <div className="bg-orange-light rounded-xl p-4 mb-4">
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-bold">🧡 Trinkgeld für Shopper</span>
                <span className="bg-orange text-black text-xs font-black px-2.5 py-1 rounded-full">{tipPct}%</span>
              </div>
              <input type="range" min="0" max="20" step="1" value={tipPct} onChange={e => onTipChange(+e.target.value)} className="w-full accent-orange mb-2" />
              <div className="grid grid-cols-4 gap-1.5">
                {[0,5,10,15].map(pct => (
                  <button key={pct} onClick={() => onTipChange(pct)}
                    className={`py-1.5 rounded-lg text-xs font-bold border transition-all ${tipPct === pct ? 'bg-orange border-orange text-black' : 'border-gray-200 text-gray-600 hover:border-orange bg-white'}`}>
                    {pct === 0 ? 'Kein' : `${pct}%`}
                  </button>
                ))}
              </div>
            </div>

            {/* Summary */}
            <div className="space-y-1.5 mb-4">
              {[['Zwischensumme', sub],['Liefergebühr', fee],['Servicegebühr (5%)', svc],['Trinkgeld', tip]].map(([l,v]) => (
                <div key={l as string} className="flex justify-between text-sm text-gray-500">
                  <span>{l as string}</span><span className="font-semibold text-gray-900">{(v as number).toFixed(2)} €</span>
                </div>
              ))}
              <div className="flex justify-between text-base font-black border-t border-gray-100 pt-2 mt-2">
                <span>Gesamt</span><span className="text-red">{total.toFixed(2)} €</span>
              </div>
            </div>

            <button onClick={() => setCheckout(true)} className="btn-red w-full py-4 text-base">
              Zur Kasse →
            </button>
          </div>
        )}
      </div>

      {/* Checkout modal */}
      {checkoutOpen && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white">
              <h2 className="text-xl font-black">Bestellung abschließen</h2>
              <button onClick={() => setCheckout(false)} className="w-9 h-9 rounded-full border border-gray-100 flex items-center justify-center"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-5">
              {/* Delivery option */}
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Lieferoption</p>
                <div className="grid grid-cols-2 gap-3">
                  {[{k:'express',n:'⚡ Express',t:'Heute ~90 Min.',p:`${fee.toFixed(2)} €`},{k:'scheduled',n:'📅 Geplant',t:'Morgen 10–12 Uhr',p:'Kostenlos'}].map(o => (
                    <button key={o.k} onClick={() => setDelOption(o.k)}
                      className={`border-2 rounded-xl p-3 text-left transition-all ${delOption===o.k?'border-red bg-red/5':'border-gray-100 hover:border-gray-200'}`}>
                      <div className="text-sm font-bold">{o.n}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{o.t}</div>
                      <div className="text-sm font-black text-red mt-1">{o.p}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Payment */}
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Zahlungsmethode</p>
                <div className="grid grid-cols-2 gap-2">
                  {[{k:'card',i:'💳',n:'Kreditkarte',s:'Visa / MC'},{k:'paypal',i:'🅿️',n:'PayPal',s:'Sofort'},{k:'apple',i:'📱',n:'Apple Pay',s:'Touch ID'},{k:'sepa',i:'🏦',n:'SEPA',s:'Lastschrift'}].map(m => (
                    <button key={m.k} onClick={() => setPayMethod(m.k)}
                      className={`flex items-center gap-2 p-3 border-2 rounded-xl transition-all ${payMethod===m.k?'border-red bg-red/5':'border-gray-100 hover:border-gray-200'}`}>
                      <span className="text-xl">{m.i}</span>
                      <div><div className="text-xs font-bold">{m.n}</div><div className="text-xs text-gray-400">{m.s}</div></div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Order summary */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-1.5">
                {items.map(({product:p,quantity:q}) => (
                  <div key={p.id} className="flex justify-between text-sm text-gray-600">
                    <span>{p.name} ×{q}</span><span className="font-semibold">{(p.price*q).toFixed(2)} €</span>
                  </div>
                ))}
                <div className="border-t border-gray-200 pt-2 mt-2 space-y-1">
                  {[['Liefergebühr',fee],['Servicegebühr',svc],['Trinkgeld',tip]].map(([l,v])=>(
                    <div key={l as string} className="flex justify-between text-sm text-gray-500">
                      <span>{l as string}</span><span>{(v as number).toFixed(2)} €</span>
                    </div>
                  ))}
                  <div className="flex justify-between font-black text-base pt-1 border-t border-gray-200 mt-1">
                    <span>Gesamt</span><span className="text-red">{total.toFixed(2)} €</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="px-6 pb-6">
              <button onClick={placeOrder} disabled={loading} className="btn-red w-full py-4 text-base">
                {loading ? 'Bestellung wird aufgegeben...' : `🔒 Jetzt bestellen & bezahlen — ${total.toFixed(2)} €`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
