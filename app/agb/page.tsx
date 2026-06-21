// app/agb/page.tsx
import { LegalShell } from '@/components/layout/legal-shell'

export const metadata = { title: 'AGB — Echtzeiteinkauf' }

export default function AgbPage() {
  return (
    <LegalShell eyebrow="Rechtliches" title="Allgemeine Geschäftsbedingungen">
      <h2>§ 1 Geltungsbereich</h2>
      <p>
        Diese Allgemeinen Geschäftsbedingungen (AGB) gelten für alle Bestellungen, die
        über die Website oder App von Echtzeiteinkauf GmbH (nachfolgend
        „Echtzeiteinkauf“) getätigt werden. Mit Abschluss einer Bestellung erkennt der
        Kunde diese AGB an.
      </p>

      <h2>§ 2 Vertragspartner und Vermittlung</h2>
      <p>
        Echtzeiteinkauf vermittelt zwischen Kund:innen, teilnehmenden Supermärkten und
        unabhängigen Shoppern (Einkaufspersonen). Der Kaufvertrag über die bestellten
        Waren kommt zwischen dem Kunden und dem jeweiligen Markt zustande. Die
        Lieferung erfolgt durch einen von Echtzeiteinkauf vermittelten Shopper.
      </p>

      <h2>§ 3 Bestellvorgang</h2>
      <p>
        Der Kunde wählt einen verfügbaren Markt aus, fügt Produkte dem Warenkorb hinzu
        und schließt die Bestellung über die Zahlungsfunktion ab. Mit Bestätigung der
        Bestellung gibt der Kunde ein verbindliches Angebot zum Kauf der ausgewählten
        Produkte ab. Der Vertrag kommt mit Bestätigung durch Echtzeiteinkauf zustande.
      </p>

      <h2>§ 4 Preise und Gebühren</h2>
      <p>Der Gesamtpreis einer Bestellung setzt sich zusammen aus:</p>
      <ul>
        <li>Produktpreisen gemäß Angebot des jeweiligen Marktes</li>
        <li>einer Liefergebühr (abhängig vom gewählten Markt und der Lieferoption)</li>
        <li>einer Servicegebühr in Höhe von 5 % des Warenwerts</li>
        <li>einem optionalen Trinkgeld für den Shopper</li>
      </ul>
      <p>
        Alle Preise verstehen sich inklusive der gesetzlichen Mehrwertsteuer.
      </p>

      <h2>§ 5 Zahlung</h2>
      <p>
        Die Zahlung erfolgt im Voraus über die in der App angebotenen Zahlungsmethoden
        (Kreditkarte, PayPal, Apple Pay, SEPA-Lastschrift). Die Zahlungsabwicklung
        erfolgt über unseren Zahlungsdienstleister Stripe.
      </p>

      <h2>§ 6 Lieferung</h2>
      <p>
        Echtzeiteinkauf bemüht sich, Bestellungen innerhalb der angegebenen Lieferzeit
        (in der Regel ca. 2 Stunden bei Express-Lieferung) zuzustellen. Die angegebenen
        Lieferzeiten sind Schätzungen und stellen keine garantierten Fixtermine dar.
        Verzögerungen aufgrund von Verkehr, Wetter oder Verfügbarkeit der Produkte im
        Markt bleiben vorbehalten.
      </p>

      <h2>§ 7 Produktverfügbarkeit und Substitution</h2>
      <p>
        Sollte ein bestellter Artikel im Markt nicht verfügbar sein, wählt der Shopper
        nach den vom Kunden festgelegten Präferenzen entweder einen vergleichbaren
        Ersatzartikel, lässt den Artikel aus, oder kontaktiert den Kunden vor dem Kauf —
        je nach gewählter Substitutionseinstellung.
      </p>

      <h2>§ 8 Widerrufsrecht</h2>
      <p>
        Da es sich bei den bestellten Waren um schnell verderbliche Lebensmittel
        handelt, ist das Widerrufsrecht gemäß § 312g Abs. 2 Nr. 2 BGB ausgeschlossen.
        Bei Mängeln an gelieferten Produkten gelten die gesetzlichen
        Gewährleistungsrechte.
      </p>

      <h2>§ 9 Reklamationen</h2>
      <p>
        Bei fehlerhaften, beschädigten oder fehlenden Artikeln kontaktieren Sie bitte
        unseren Kundenservice innerhalb von 24 Stunden nach Lieferung unter{' '}
        <a href="mailto:kontakt@echtzeiteinkauf.de">kontakt@echtzeiteinkauf.de</a>.
        Wir prüfen jede Reklamation individuell und bieten je nach Fall Erstattung oder
        Gutschrift an.
      </p>

      <h2>§ 10 Haftung</h2>
      <p>
        Echtzeiteinkauf haftet unbeschränkt für Vorsatz und grobe Fahrlässigkeit sowie
        bei Verletzung von Leben, Körper oder Gesundheit. Im Übrigen haftet
        Echtzeiteinkauf nur bei der Verletzung wesentlicher Vertragspflichten und
        begrenzt auf den vorhersehbaren, vertragstypischen Schaden.
      </p>

      <h2>§ 11 Shopper-Bedingungen</h2>
      <p>
        Personen, die sich als Shopper registrieren, handeln als selbstständige,
        unabhängige Auftragnehmer, nicht als Angestellte von Echtzeiteinkauf. Die
        Einzelheiten regelt eine gesonderte Shopper-Vereinbarung.
      </p>

      <h2>§ 12 Änderungen der AGB</h2>
      <p>
        Echtzeiteinkauf behält sich vor, diese AGB mit Wirkung für die Zukunft zu
        ändern. Über wesentliche Änderungen werden Kunden rechtzeitig informiert.
      </p>

      <h2>§ 13 Schlussbestimmungen</h2>
      <p>
        Es gilt deutsches Recht unter Ausschluss des UN-Kaufrechts. Gerichtsstand für
        alle Streitigkeiten ist, soweit gesetzlich zulässig, der Sitz von Echtzeiteinkauf
        in Fürth. Sollte eine Bestimmung dieser AGB unwirksam sein, bleibt die
        Wirksamkeit der übrigen Bestimmungen unberührt.
      </p>

      <p className="text-xs text-gray-400 mt-10">
        Stand: Januar 2026. Diese AGB dienen als Vorlage und sollten vor Veröffentlichung
        von einem Rechtsbeistand geprüft werden.
      </p>
    </LegalShell>
  )
}
