// app/impressum/page.tsx
import { LegalShell } from '@/components/layout/legal-shell'

export const metadata = { title: 'Impressum — Echtzeiteinkauf' }

export default function ImpressumPage() {
  return (
    <LegalShell eyebrow="Rechtliches" title="Impressum">
      <h2>Angaben gemäß § 5 TMG</h2>
      <p>
        <strong>Echtzeiteinkauf GmbH</strong><br/>
        Nürnberger Str. 134<br/>
        90762 Fürth<br/>
        Deutschland
      </p>

      <h3>Vertreten durch</h3>
      <p>
        Romaric D. Ndengang<br/>
        Christian Gabriel<br/>
        (Geschäftsführer)
      </p>

      <h3>Kontakt</h3>
      <p>
        Telefon: +49 152 27406823<br/>
        E-Mail: <a href="mailto:kontakt@echtzeiteinkauf.de">kontakt@echtzeiteinkauf.de</a>
      </p>

      <h3>Registereintrag</h3>
      <p>
        Eintragung im Handelsregister.<br/>
        Registergericht: Amtsgericht Fürth<br/>
        Registernummer: [HRB XXXXX]
      </p>

      <h3>Umsatzsteuer-ID</h3>
      <p>
        Umsatzsteuer-Identifikationsnummer gemäß § 27 a Umsatzsteuergesetz:<br/>
        [DE XXXXXXXXX]
      </p>

      <h2>Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</h2>
      <p>
        Romaric D. Ndengang<br/>
        Nürnberger Str. 134<br/>
        90762 Fürth
      </p>

      <h2>EU-Streitschlichtung</h2>
      <p>
        Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS)
        bereit:{' '}
        <a href="https://ec.europa.eu/consumers/odr/" target="_blank" rel="noopener noreferrer">
          https://ec.europa.eu/consumers/odr/
        </a>.
        Unsere E-Mail-Adresse finden Sie oben im Impressum.
      </p>

      <h2>Verbraucherstreitbeilegung / Universalschlichtungsstelle</h2>
      <p>
        Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer
        Verbraucherschlichtungsstelle teilzunehmen.
      </p>

      <h2>Haftung für Inhalte</h2>
      <p>
        Als Diensteanbieter sind wir gemäß § 7 Abs. 1 TMG für eigene Inhalte auf diesen
        Seiten nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 TMG sind
        wir als Diensteanbieter jedoch nicht verpflichtet, übermittelte oder gespeicherte
        fremde Informationen zu überwachen oder nach Umständen zu forschen, die auf eine
        rechtswidrige Tätigkeit hinweisen.
      </p>

      <h2>Haftung für Links</h2>
      <p>
        Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte wir
        keinen Einfluss haben. Deshalb können wir für diese fremden Inhalte auch keine
        Gewähr übernehmen. Für die Inhalte der verlinkten Seiten ist stets der jeweilige
        Anbieter oder Betreiber der Seiten verantwortlich.
      </p>

      <h2>Urheberrecht</h2>
      <p>
        Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten
        unterliegen dem deutschen Urheberrecht. Beiträge Dritter sind als solche
        gekennzeichnet. Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art der
        Verwertung außerhalb der Grenzen des Urheberrechtes bedürfen der schriftlichen
        Zustimmung des jeweiligen Autors bzw. Erstellers.
      </p>

      <p className="text-xs text-gray-400 mt-10">
        Hinweis: Die mit [ ] markierten Angaben sind Platzhalter und müssen vor
        Veröffentlichung mit den tatsächlichen Unternehmensdaten ersetzt werden.
      </p>
    </LegalShell>
  )
}
