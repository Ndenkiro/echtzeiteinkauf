// app/shopper/page.tsx — Shopper landing / recruitment page
import Link from 'next/link'
import Image from 'next/image'
import {
  Bike, Euro, Clock, Shield, ArrowRight,
  CheckCircle2, TrendingUp, MapPin, LogIn
} from 'lucide-react'

export const metadata = {
  title: 'Shopper werden — Echtzeiteinkauf',
  description: 'Verdienen Sie flexibel Geld als persönlicher Shopper.',
}

const BENEFITS = [
  { icon: Euro,   title: 'Verdienst vorab sichtbar', text: 'Jeder Auftrag zeigt die Provision und Ihren Nettoverdienst, bevor Sie zusagen.' },
  { icon: Clock,  title: 'Völlig flexibel',          text: 'Gehen Sie online, wann es Ihnen passt. Kein Schichtplan, keine Mindeststunden.' },
  { icon: MapPin, title: 'Aufträge in Ihrer Nähe',   text: 'Sie legen Ihren Radius fest — 5 bis 50 km. Nur passende Aufträge erreichen Sie.' },
  { icon: Shield, title: 'Keine Vorkasse',           text: 'Der Einkauf läuft über eine virtuelle Karte. Ihr eigenes Geld bleibt unberührt.' },
]

const STEPS = [
  { n: '1', title: 'Registrieren',         text: 'Konto anlegen und Adresse hinterlegen — dauert 2 Minuten.' },
  { n: '2', title: 'Dokumente einreichen', text: 'Führungszeugnis und Personalausweis hochladen.' },
  { n: '3', title: 'Freischaltung',        text: 'Wir prüfen Ihre Unterlagen in 2–3 Werktagen.' },
  { n: '4', title: 'Loslegen',             text: 'Online gehen, Aufträge annehmen, Geld verdienen.' },
]

export default function ShopperLandingPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <header className="sticky top-0 z-50 bg-[#0A0A0A]/95 backdrop-blur border-b border-white/10">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.png" alt="Echtzeiteinkauf" width={32} height={32} className="rounded-full" />
            <div className="hidden sm:block">
              <div className="font-black text-white text-sm leading-tight">Echtzeiteinkauf</div>
              <div className="text-[10px] text-orange font-bold">Shopper</div>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/anmelden?next=/shopper-portal"
              className="flex items-center gap-1.5 text-sm font-bold text-white/70 border border-white/20 rounded-xl px-4 py-2.5 hover:border-orange hover:text-orange transition-all">
              <LogIn size={15} /> Anmelden
            </Link>
            <Link href="/registrieren"
              className="bg-orange text-black font-black rounded-xl px-4 py-2.5 text-sm hover:bg-orange-dark hover:text-white transition-colors">
              Jetzt starten
            </Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="absolute -top-32 -right-32 w-[480px] h-[480px] rounded-full bg-orange/20 blur-3xl" />
        <div className="absolute -bottom-40 -left-24 w-[380px] h-[380px] rounded-full bg-red/10 blur-3xl" />

        <div className="max-w-5xl mx-auto px-6 py-16 md:py-24 relative">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-orange/15 text-orange text-xs font-black px-3.5 py-2 rounded-full mb-6 uppercase tracking-wide">
                <Bike size={13} /> Shopper werden
              </div>
              <h1 className="text-[2.4rem] md:text-[3.2rem] font-black text-white leading-[1.05] tracking-tight mb-5">
                Verdienen Sie Geld<br />
                <span className="relative inline-block px-1">
                  <span className="absolute inset-0 bg-orange -z-10 rounded-md" aria-hidden="true" />
                  <span className="relative text-black">beim Einkaufen</span>
                </span>
              </h1>
              <p className="text-white/60 text-base leading-relaxed mb-8 max-w-md">
                Kaufen Sie für andere ein und liefern Sie aus. Sie bestimmen Ihre Zeiten,
                Ihren Radius und welche Aufträge Sie annehmen.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 mb-10">
                <Link href="/registrieren"
                  className="bg-orange text-black font-black rounded-2xl px-7 py-4 text-base flex items-center justify-center gap-2 hover:bg-orange-dark hover:text-white transition-colors">
                  Kostenlos registrieren <ArrowRight size={18} />
                </Link>
                <Link href="/anmelden?next=/shopper-portal"
                  className="border-2 border-white/15 text-white font-black rounded-2xl px-7 py-4 text-base flex items-center justify-center gap-2 hover:border-orange hover:text-orange transition-all">
                  Ich bin bereits Shopper
                </Link>
              </div>
              <div className="flex gap-8">
                {[['Flexibel','Ihre Zeiten'],['0 €','Vorkasse'],['90 %','der Provision']].map(([n,l]) => (
                  <div key={l}>
                    <div className="text-xl font-black text-white leading-none">{n}</div>
                    <div className="text-[11px] text-white/40 mt-1.5 font-bold uppercase tracking-wide">{l}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white/[0.04] backdrop-blur border border-white/10 rounded-3xl p-7">
              <div className="flex items-center gap-2 mb-5">
                <TrendingUp size={17} className="text-orange" />
                <span className="font-black text-white text-sm">Beispiel-Auftrag</span>
              </div>
              <div className="flex flex-col gap-3 mb-5">
                <div className="flex justify-between text-sm">
                  <span className="text-white/50">Provision vom Kunden</span>
                  <span className="text-white font-bold">8,50 €</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/50">Trinkgeld</span>
                  <span className="text-white font-bold">2,00 €</span>
                </div>
                <div className="flex justify-between text-sm border-t border-white/10 pt-3">
                  <span className="text-white/50">Plattformgebühr (10 %)</span>
                  <span className="text-white/40">− 1,05 €</span>
                </div>
                <div className="flex justify-between border-t border-white/10 pt-3">
                  <span className="font-black text-white">Ihr Verdienst</span>
                  <span className="font-black text-orange text-xl">9,45 €</span>
                </div>
              </div>
              <div className="bg-orange/10 rounded-xl p-3.5 flex gap-2.5">
                <CheckCircle2 size={15} className="text-orange flex-shrink-0 mt-0.5" />
                <p className="text-xs text-orange/90 leading-relaxed">
                  Der Warenwert von 47,30 € wird über die virtuelle Einkaufskarte bezahlt —
                  nicht aus Ihrer Tasche.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 py-16">
        <h2 className="text-2xl md:text-3xl font-black text-white mb-2">Warum Echtzeiteinkauf?</h2>
        <p className="text-white/50 text-sm mb-10">Was Sie als Shopper bei uns erwartet.</p>
        <div className="grid sm:grid-cols-2 gap-5">
          {BENEFITS.map(b => {
            const Icon = b.icon
            return (
              <div key={b.title} className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 hover:border-orange/40 transition-colors">
                <div className="w-11 h-11 rounded-xl bg-orange/15 flex items-center justify-center mb-4">
                  <Icon size={20} className="text-orange" />
                </div>
                <h3 className="font-black text-white mb-2">{b.title}</h3>
                <p className="text-sm text-white/50 leading-relaxed">{b.text}</p>
              </div>
            )
          })}
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 py-16 border-t border-white/10">
        <h2 className="text-2xl md:text-3xl font-black text-white mb-2">In 4 Schritten loslegen</h2>
        <p className="text-white/50 text-sm mb-10">Von der Registrierung bis zum ersten Auftrag.</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {STEPS.map(s => (
            <div key={s.n}>
              <div className="w-10 h-10 rounded-xl bg-orange flex items-center justify-center font-black text-black mb-4">
                {s.n}
              </div>
              <h3 className="font-black text-white text-sm mb-1.5">{s.title}</h3>
              <p className="text-xs text-white/50 leading-relaxed">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 py-16 border-t border-white/10">
        <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-8">
          <h2 className="text-xl font-black text-white mb-5">Was Sie mitbringen</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              'Mindestalter 18 Jahre',
              'Polizeiliches Führungszeugnis',
              'Gültiger Personalausweis',
              'Fahrrad, Auto oder zu Fuß',
              'Smartphone mit Internet',
              'Zuverlässigkeit und Freundlichkeit',
            ].map(r => (
              <div key={r} className="flex items-center gap-2.5">
                <CheckCircle2 size={16} className="text-orange flex-shrink-0" />
                <span className="text-sm text-white/70">{r}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 py-16 border-t border-white/10">
        <div className="bg-gradient-to-br from-orange to-orange-dark rounded-3xl p-10 text-center">
          <Bike size={36} className="text-black mx-auto mb-4" />
          <h2 className="text-2xl md:text-3xl font-black text-black mb-3">Bereit loszulegen?</h2>
          <p className="text-black/70 text-sm mb-7 max-w-md mx-auto">
            Registrieren Sie sich kostenlos und starten Sie nach der Freischaltung
            mit Ihrem ersten Auftrag.
          </p>
          <Link href="/registrieren"
            className="inline-flex items-center gap-2 bg-black text-white font-black rounded-2xl px-8 py-4 hover:bg-[#1a1a1a] transition-colors">
            Jetzt Shopper werden <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      <footer className="border-t border-white/10 py-8">
        <div className="max-w-5xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Image src="/logo.png" alt="" width={24} height={24} className="rounded-full" />
            <span className="text-xs text-white/40">© 2026 Echtzeiteinkauf GmbH · Fürth</span>
          </div>
          <div className="flex items-center gap-5 text-xs text-white/40">
            <Link href="/" className="hover:text-white transition-colors">Zur Hauptseite</Link>
            <Link href="/agb" className="hover:text-white transition-colors">AGB</Link>
            <Link href="/datenschutz" className="hover:text-white transition-colors">Datenschutz</Link>
            <Link href="/impressum" className="hover:text-white transition-colors">Impressum</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
