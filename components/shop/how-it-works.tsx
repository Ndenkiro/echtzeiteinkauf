export function HowItWorks() {
  return (
    <section id="how" className="py-20 px-6 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <div className="text-xs font-black text-red uppercase tracking-widest mb-3">So einfach geht es</div>
          <h2 className="text-4xl font-black tracking-tight">In 3 Schritten zu<br/>Ihren Einkaufen</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { n:'1', icon:'🏪', title:'Markt & Produkte wahlen', desc:'Wahlen Sie aus 8+ Supermarktketten in Ihrer Nahe und fugen Sie Produkte dem Warenkorb hinzu.' },
            { n:'2', icon:'🛍️', title:'Shopper kauft ein',       desc:'Ein personlicher Shopper wird zugewiesen und kauft alles sorgfaltig fur Sie ein.' },
            { n:'3', icon:'🚐', title:'Lieferung erhalten',      desc:'Ihre frischen Einkaufe werden innerhalb von 2 Stunden direkt an Ihre Haustur geliefert.' },
          ].map(s => (
            <div key={s.n} className="bg-white rounded-2xl p-7 border border-gray-100 hover:-translate-y-1 hover:border-red transition-all">
              <div className="w-11 h-11 rounded-full bg-red text-white font-black text-lg flex items-center justify-center mb-4">{s.n}</div>
              <div className="text-3xl mb-3">{s.icon}</div>
              <div className="font-black text-gray-900 mb-2">{s.title}</div>
              <div className="text-sm text-gray-500 leading-relaxed">{s.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
