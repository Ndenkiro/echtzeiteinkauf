export function Footer() {
  const columns = [
    {
      title: 'Einkaufen',
      links: [
        { label: 'Märkte', href: '/#stores' },
        { label: 'Produkte', href: '/#stores' },
        { label: "So funktioniert's", href: '/#how' },
      ],
    },
    {
      title: 'Shopper',
      links: [
        { label: 'Shopper werden', href: '/#shopper' },
        { label: 'App herunterladen', href: '/#app' },
        { label: 'FAQ', href: '/#shopper' },
      ],
    },
    {
      title: 'Unternehmen',
      links: [
        { label: 'Über uns', href: '/ueber-uns' },
        { label: 'Datenschutz', href: '/datenschutz' },
        { label: 'Impressum', href: '/impressum' },
        { label: 'AGB', href: '/agb' },
      ],
    },
  ]

  return (
    <footer className="bg-black border-t border-white/10 py-12 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="grid md:grid-cols-4 gap-10 mb-10">
          <div>
            <div className="flex items-center gap-2 text-white font-black text-lg mb-3">
              <img src="/logo.png" alt="Echtzeiteinkauf" className="w-8 h-8 rounded-full" />
              Echtzeiteinkauf
            </div>
            <p className="text-white/50 text-sm leading-relaxed mb-4">
              Ihre Einkäufe in 2 Stunden geliefert.
            </p>
            <div className="flex flex-col gap-2 text-white/50 text-sm">
              <a href="mailto:kontakt@echtzeiteinkauf.de" className="hover:text-white transition-colors">✉️ kontakt@echtzeiteinkauf.de</a>
              <a href="tel:+4915227406823" className="hover:text-white transition-colors">📞 +49 152 27406823</a>
              <span>📍 Nürnberger Str. 134, 90762 Fürth</span>
            </div>
          </div>

          {columns.map(col => (
            <div key={col.title}>
              <div className="text-white/40 text-xs font-black uppercase tracking-widest mb-4">{col.title}</div>
              <div className="flex flex-col gap-2">
                {col.links.map(l => (
                  <a key={l.label} href={l.href} className="text-white/50 text-sm hover:text-white transition-colors">
                    {l.label}
                  </a>
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
