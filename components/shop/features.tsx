export function Features() {
  const features = [
    { icon:'⚡', bg:'#FDE8EA', title:'Lieferung in 2 Stunden',  desc:'Ihre Bestellung wird innerhalb von 2 Stunden geliefert.' },
    { icon:'🛡️', bg:'#E9F7EF', title:'Frische-Garantie',        desc:'Unsere Shopper wahlen nur die frischesten Produkte aus.' },
    { icon:'📍', bg:'#FFF4D6', title:'Live-Tracking',            desc:'Verfolgen Sie Ihre Bestellung in Echtzeit bis zur Haustur.' },
    { icon:'💳', bg:'#FDE8EA', title:'Sichere Zahlung',          desc:'Kreditkarte, PayPal, Apple Pay oder SEPA.' },
    { icon:'🔄', bg:'#E9F7EF', title:'Substitution-Garantie',   desc:'Nicht verfugbar? Wir wahlen die beste Alternative.' },
    { icon:'⭐', bg:'#FFF4D6', title:'Top-bewertete Shopper',   desc:'Nur verifizierte Shopper mit 4.9 Sternen im Schnitt.' },
  ]
  return (
    <section className="py-20 px-6 bg-gray-50">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <div className="text-xs font-black text-red uppercase tracking-widest mb-3">Warum Echtzeiteinkauf</div>
          <h2 className="text-4xl font-black tracking-tight">Frisch. Schnell. Zuverlassig.</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {features.map(f => (
            <div key={f.title} className="bg-white rounded-2xl p-7 border border-gray-100">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-4" style={{ background: f.bg }}>{f.icon}</div>
              <div className="font-black text-gray-900 mb-2">{f.title}</div>
              <div className="text-sm text-gray-500 leading-relaxed">{f.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
