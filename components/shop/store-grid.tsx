'use client'
import { useRouter } from 'next/navigation'
import type { Store } from '@/lib/supabase'

const STORE_COLORS: Record<string, { bg: string; text: string }> = {
  Lidl:       { bg: '#FFF4D6', text: '#7A5000' },
  Aldi:       { bg: '#E9F7EF', text: '#1A7340' },
  Rewe:       { bg: '#FDE8EA', text: '#B3000D' },
  Edeka:      { bg: '#E9F7EF', text: '#1A7340' },
  Penny:      { bg: '#FFF4D6', text: '#7A5000' },
  Kaufland:   { bg: '#FDE8EA', text: '#B3000D' },
  MediaMarkt: { bg: '#FDE8EA', text: '#B3000D' },
  Netto:      { bg: '#E9F7EF', text: '#1A7340' },
}

const MOCK_STORES: Store[] = [
  { id:'1', slug:'lidl-nuernberg',       name:'Lidl',       chain:'Lidl',       store_type:'chain', city:'Nuernberg', zip_code:'90402', delivery_fee:1.99, min_order:0, logo_url:null, is_active:true, is_scraped:true, distance_km:0.4, opening_hours:null },
  { id:'2', slug:'aldi-sued-nuernberg',  name:'Aldi Sud',   chain:'Aldi',       store_type:'chain', city:'Nuernberg', zip_code:'90402', delivery_fee:1.99, min_order:0, logo_url:null, is_active:true, is_scraped:true, distance_km:0.7, opening_hours:null },
  { id:'3', slug:'rewe-nuernberg',       name:'Rewe',        chain:'Rewe',       store_type:'chain', city:'Nuernberg', zip_code:'90402', delivery_fee:2.49, min_order:0, logo_url:null, is_active:true, is_scraped:true, distance_km:1.1, opening_hours:null },
  { id:'4', slug:'edeka-nuernberg',      name:'Edeka',       chain:'Edeka',      store_type:'chain', city:'Nuernberg', zip_code:'90402', delivery_fee:2.49, min_order:0, logo_url:null, is_active:true, is_scraped:true, distance_km:1.3, opening_hours:null },
  { id:'5', slug:'penny-nuernberg',      name:'Penny',       chain:'Penny',      store_type:'chain', city:'Nuernberg', zip_code:'90402', delivery_fee:1.99, min_order:0, logo_url:null, is_active:true, is_scraped:true, distance_km:1.8, opening_hours:null },
  { id:'6', slug:'kaufland-nuernberg',   name:'Kaufland',    chain:'Kaufland',   store_type:'chain', city:'Nuernberg', zip_code:'90402', delivery_fee:2.99, min_order:0, logo_url:null, is_active:true, is_scraped:true, distance_km:2.1, opening_hours:null },
  { id:'7', slug:'mediamarkt-nuernberg', name:'MediaMarkt',  chain:'MediaMarkt', store_type:'chain', city:'Nuernberg', zip_code:'90402', delivery_fee:2.99, min_order:0, logo_url:null, is_active:true, is_scraped:true, distance_km:2.5, opening_hours:null },
  { id:'8', slug:'netto-nuernberg',      name:'Netto',       chain:'Netto',      store_type:'chain', city:'Nuernberg', zip_code:'90402', delivery_fee:1.99, min_order:0, logo_url:null, is_active:true, is_scraped:true, distance_km:2.8, opening_hours:null },
]

type Props = { stores?: Store[] }

export function StoreGrid({ stores }: Props) {
  const router = useRouter()
  const list = stores && stores.length > 0 ? stores : MOCK_STORES

  return (
    <section id="stores" className="py-20 px-6 bg-white">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <div className="text-xs font-black text-red uppercase tracking-widest mb-3">Verfugbare Markte</div>
          <h2 className="text-4xl font-black tracking-tight">8+ Supermarktketten<br/>in ganz Deutschland</h2>
          <p className="text-gray-500 mt-3 text-lg">Wahlen Sie Ihren Markt und starten Sie mit dem Einkauf</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {list.map((store) => {
            const chain = store.chain || store.name
            const colors = STORE_COLORS[chain] || { bg: '#F5F5F5', text: '#333' }
            const abbr = store.name.slice(0, 3).toUpperCase()
            return (
              <div
                key={store.id}
                onClick={() => router.push(`/markt/${store.slug}`)}
                className="border-2 border-gray-100 rounded-2xl p-5 cursor-pointer hover:border-red hover:-translate-y-1 hover:shadow-lg transition-all text-center"
              >
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center font-black text-sm mx-auto mb-3"
                  style={{ background: colors.bg, color: colors.text }}
                >{abbr}</div>
                <div className="font-black text-sm text-gray-900 mb-1">{store.name}</div>
                <div className="text-xs text-gray-400 mb-2">{store.distance_km ? `${store.distance_km} km` : store.city}</div>
                <div className="flex justify-center gap-1 flex-wrap">
                  <span className="text-xs font-bold bg-green-50 text-green-700 px-2 py-0.5 rounded-full">Offen</span>
                  <span className="text-xs font-bold bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded-full">ab {store.delivery_fee.toFixed(2)} EUR</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
