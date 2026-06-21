// components/shop/app-download.tsx
export function AppDownload() {
  return (
    <section id="app" className="py-20 px-6 bg-[#0A0A0A] relative overflow-hidden">
      <div className="absolute -left-32 top-1/2 -translate-y-1/2 w-[420px] h-[420px] rounded-full bg-red/20 blur-3xl" />
      <div className="absolute -right-24 -bottom-24 w-[340px] h-[340px] rounded-full bg-orange/15 blur-3xl" />

      <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-12 items-center relative z-10">
        {/* Left: phone mockup */}
        <div className="flex justify-center md:justify-start">
          <div className="relative">
            <div className="w-[230px] h-[470px] bg-black rounded-[36px] border-[6px] border-gray-800 shadow-[0_30px_80px_rgba(0,0,0,0.5)] overflow-hidden relative">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-5 bg-black rounded-b-2xl z-10" />
              <div className="w-full h-full bg-gradient-to-b from-red to-[#6E0339] flex flex-col">
                <div className="px-4 pt-9 pb-3 flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center text-xs">🛒</div>
                  <span className="text-white font-black text-xs">ECHTZEITEINKAUF</span>
                </div>
                <div className="bg-white flex-1 rounded-t-2xl mt-1 p-3">
                  <div className="bg-gray-100 rounded-xl h-7 mb-3 flex items-center px-3 text-[10px] text-gray-400">Suche Produkte...</div>
                  <div className="bg-orange/20 rounded-xl h-16 mb-3" />
                  <div className="grid grid-cols-4 gap-2 mb-3">
                    {['🍅','🥛','🍞','🥩'].map((e,i) => (
                      <div key={i} className="bg-gray-50 rounded-lg h-12 flex items-center justify-center text-lg">{e}</div>
                    ))}
                  </div>
                  <div className="space-y-2">
                    {[1,2].map(i => (
                      <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-lg p-2">
                        <div className="w-8 h-8 bg-gray-200 rounded" />
                        <div className="flex-1 h-2 bg-gray-200 rounded" />
                        <div className="w-8 h-3 bg-red/30 rounded" />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-orange px-4 py-3 flex items-center justify-between">
                  <span className="text-black text-[11px] font-black">🛒 Warenkorb</span>
                  <span className="text-black text-[11px] font-black">12,46 €</span>
                </div>
              </div>
            </div>
            <div className="absolute -top-4 -right-4 w-14 h-14 rounded-full bg-orange flex items-center justify-center text-2xl rotate-12 shadow-lg">⚡</div>
          </div>
        </div>

        {/* Right: text + QR + store buttons */}
        <div>
          <div className="inline-flex items-center gap-2 bg-orange text-black text-xs font-black px-3.5 py-2 rounded-full mb-5 uppercase tracking-wide">
            Bald verfügbar
          </div>
          <h2 className="text-4xl font-black text-white tracking-tight leading-[1.05] mb-4">
            Laden Sie die App<br/>herunter
          </h2>
          <p className="text-white/70 text-base leading-relaxed mb-8 max-w-md">
            Bestellen Sie noch schneller mit der Echtzeiteinkauf App. Live-Tracking, Push-Benachrichtigungen und exklusive Angebote nur in der App.
          </p>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 mb-2">
            {/* QR code */}
            <div className="bg-white rounded-2xl p-3 flex-shrink-0">
              <svg width="92" height="92" viewBox="0 0 92 92" xmlns="http://www.w3.org/2000/svg">
                <rect width="92" height="92" fill="white"/>
                {(() => {
                  const cells: JSX.Element[] = []
                  const grid = 11
                  const cell = 92 / grid
                  const pattern = [
                    [1,1,1,1,1,0,1,0,1,1,1],
                    [1,0,0,0,1,0,0,1,0,0,1],
                    [1,0,1,0,1,0,1,1,1,0,1],
                    [1,0,1,0,1,1,0,0,1,0,1],
                    [1,0,0,0,1,0,1,0,0,0,1],
                    [1,1,1,1,1,0,0,1,1,1,1],
                    [0,0,1,0,0,1,1,0,1,0,0],
                    [1,1,0,1,1,0,0,1,0,1,1],
                    [1,0,1,0,1,1,1,0,1,0,1],
                    [1,0,0,1,0,0,1,1,0,0,1],
                    [1,1,1,1,1,1,0,1,1,1,1],
                  ]
                  pattern.forEach((row, y) => row.forEach((v, x) => {
                    if (v) cells.push(<rect key={`${x}-${y}`} x={x*cell} y={y*cell} width={cell} height={cell} fill="#0A0A0A" />)
                  }))
                  return cells
                })()}
              </svg>
            </div>

            {/* Store buttons */}
            <div className="flex flex-col gap-3">
              <a href="#" className="flex items-center gap-3 bg-white hover:bg-gray-100 transition-colors rounded-xl px-4 py-2.5 w-[180px]">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.55C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
                <div className="text-left">
                  <div className="text-[9px] text-gray-500 leading-none">Erhältlich im</div>
                  <div className="text-sm font-bold text-black leading-tight">App Store</div>
                </div>
              </a>
              <a href="#" className="flex items-center gap-3 bg-white hover:bg-gray-100 transition-colors rounded-xl px-4 py-2.5 w-[180px]">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M3 20.5V3.5c0-.59.34-1.11.84-1.36l13.69 9.86-13.69 9.86c-.5-.25-.84-.77-.84-1.36zm17.81-9.36L7.34 2.42 17.5 9.5l3.31-1.86c.93-.52.93-1.86 0-2.38L17.5 9.5 7.34 21.58l13.47-8.72c.93-.52.93-1.86 0-2.38z"/></svg>
                <div className="text-left">
                  <div className="text-[9px] text-gray-500 leading-none">Jetzt bei</div>
                  <div className="text-sm font-bold text-black leading-tight">Google Play</div>
                </div>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
