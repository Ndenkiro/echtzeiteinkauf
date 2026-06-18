export function Footer() {
  return (
    <footer className="bg-black border-t border-white/10 py-12 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="grid md:grid-cols-4 gap-10 mb-10">
          <div>
            <div className="text-white font-black text-lg mb-3">🛒 Echtzeiteinkauf</div>
            <p className="text-white/50 text-sm leading-relaxed mb-4">
              Ihre Einkaufe in 2 Stunden geliefert.
            </p>
            <div className="flex flex-col gap-2 text-white/50 text-sm">
              <span>✉️ kontakt@echtzeiteinkauf.de</span>
              <span>📞 +49 152 27406823</span>
              <span>📍 Nuremberg, Germany</span>
            </div>
          </div>
          {[
            { title: 'Einkaufen',    links: ['Markte', 'Produkte', 'Preise'] },
            { title: 'Shopper',      links: ['Shopper werden', 'Verdienst', 'FAQ'] },
            { title: 'Unternehmen', links: ['Uber uns', 'Datenschutz', 'Impressum', 'AGB'] },
          ].map(col => (
            <div key={col.title}>
              <div className="text-white/40 text-xs font-black uppercase tracking-widest mb-4">{col.title}</div>
              <div className="flex flex-col gap-2">
                {col.links.map(l => (
                  <a key={l} href="#" className="text-white/50 text-sm hover:text-white transition-colors">{l}</a>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-white/10 pt-6 flex flex-wrap items-center justify-between gap-4">
          <div className="text-white/30 text-xs">© 2026 Echtzeiteinkauf. Alle Rechte vorbehalten.</div>
          <div className="flex gap-2">
            {['🔒 SSL', '🇩🇪 Made in Germany', 'DSGVO konform'].map(b => (
              <span key={b} className="bg-white/5 text-white/40 text-xs px-3 py-1 rounded-lg">{b}</span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
