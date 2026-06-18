export function ShopperCTA() {
  return (
    <section id="shopper" className="py-20 px-6 bg-black">
      <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-12 items-center">
        <div>
          <h2 className="text-4xl font-black text-white leading-tight mb-4">
            Geld verdienen beim{' '}
            <span style={{ color: '#F7A800' }}>Einkaufen</span>
          </h2>
          <p className="text-white/70 text-base leading-relaxed mb-6">
            Werden Sie Teil unseres Shopper-Teams und verdienen Sie flexibel Geld.
          </p>
          <div className="flex flex-col gap-3 mb-8">
            {[
              'Bis zu 500 EUR pro Monat verdienen',
              'Flexible Arbeitszeiten, kein Mindestpensum',
              'Sofortige Auszahlung nach jeder Lieferung',
              '100% des Trinkgelds gehort Ihnen',
            ].map(p => (
              <div key={p} className="flex items-center gap-3 text-white/80 text-sm">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#F7A800' }} />
                {p}
              </div>
            ))}
          </div>
          <button className="font-black rounded-xl px-6 py-4 text-base transition-colors text-black" style={{ background: '#F7A800' }}>
            Jetzt Shopper werden &rarr;
          </button>
        </div>
        <div className="flex flex-col gap-4">
          {[
            ['500 EUR', 'Durchschnittlicher Verdienst pro Monat'],
            ['4.8 Sterne', 'Durchschnittliche Shopper-Bewertung'],
            ['1.000+', 'Aktive Shopper in Deutschland'],
          ].map(([n, l]) => (
            <div key={l} className="rounded-2xl p-5 border" style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }}>
              <div className="text-3xl font-black" style={{ color: '#F7A800' }}>{n}</div>
              <div className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.6)' }}>{l}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
