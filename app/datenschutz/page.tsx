// app/datenschutz/page.tsx
import { LegalShell } from '@/components/layout/legal-shell'

export const metadata = { title: 'Datenschutz — Echtzeiteinkauf' }

export default function DatenschutzPage() {
  return (
    <LegalShell eyebrow="Rechtliches" title="Datenschutzerklärung">
      <h2>1. Datenschutz auf einen Blick</h2>
      <h3>Allgemeine Hinweise</h3>
      <p>
        Die folgenden Hinweise geben einen einfachen Überblick darüber, was mit Ihren
        personenbezogenen Daten passiert, wenn Sie unsere Website und unsere App
        besuchen bzw. nutzen. Personenbezogene Daten sind alle Daten, mit denen Sie
        persönlich identifiziert werden können.
      </p>

      <h2>2. Verantwortliche Stelle</h2>
      <p>
        Verantwortlich für die Datenverarbeitung auf dieser Website ist:<br/>
        <strong>Echtzeiteinkauf GmbH</strong><br/>
        Nürnberger Str. 134, 90762 Fürth<br/>
        E-Mail: <a href="mailto:kontakt@echtzeiteinkauf.de">kontakt@echtzeiteinkauf.de</a>
      </p>

      <h2>3. Datenerfassung auf unserer Website</h2>
      <h3>Welche Daten erfassen wir?</h3>
      <p>Wir erheben und verarbeiten folgende Kategorien personenbezogener Daten:</p>
      <ul>
        <li><strong>Kontodaten:</strong> Name, E-Mail-Adresse, Telefonnummer</li>
        <li><strong>Lieferdaten:</strong> Lieferadresse, Lieferhinweise</li>
        <li><strong>Bestelldaten:</strong> Bestellverlauf, ausgewählte Produkte, Bestellwert</li>
        <li><strong>Zahlungsdaten:</strong> verarbeitet über unseren Zahlungsdienstleister (Stripe), wir speichern keine vollständigen Kartendaten</li>
        <li><strong>Standortdaten:</strong> zur Anzeige verfügbarer Märkte und Berechnung der Lieferzeit</li>
        <li><strong>Nutzungsdaten:</strong> IP-Adresse, Browsertyp, Zugriffszeiten (technisch erforderlich)</li>
      </ul>

      <h3>Wofür nutzen wir Ihre Daten?</h3>
      <ul>
        <li>Abwicklung und Zustellung Ihrer Bestellungen</li>
        <li>Kommunikation zu Ihrer Bestellung (Statusupdates, Lieferbenachrichtigungen)</li>
        <li>Verbesserung unserer Dienstleistungen</li>
        <li>Erfüllung gesetzlicher Aufbewahrungspflichten</li>
      </ul>

      <h2>4. Rechtsgrundlage der Verarbeitung</h2>
      <p>
        Die Verarbeitung Ihrer Daten erfolgt auf Grundlage von Art. 6 Abs. 1 lit. b DSGVO
        (Vertragserfüllung), Art. 6 Abs. 1 lit. c DSGVO (rechtliche Verpflichtung) sowie,
        soweit erforderlich, Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse).
      </p>

      <h2>5. Weitergabe an Dritte</h2>
      <p>
        Ihre Daten werden an folgende Empfänger weitergegeben, soweit dies zur
        Vertragserfüllung erforderlich ist:
      </p>
      <ul>
        <li>Unsere persönlichen Shopper, zur Durchführung Ihrer Bestellung</li>
        <li>Zahlungsdienstleister (Stripe) zur Zahlungsabwicklung</li>
        <li>Hosting-Anbieter (Hetzner Online GmbH, Deutschland) zur technischen Bereitstellung</li>
        <li>Supabase Inc. zur Datenbankverwaltung (Server in der EU)</li>
      </ul>
      <p>
        Eine Weitergabe an Dritte zu Werbezwecken findet nicht statt.
      </p>

      <h2>6. Cookies</h2>
      <p>
        Unsere Website verwendet technisch notwendige Cookies, um grundlegende
        Funktionen wie den Warenkorb bereitzustellen. Diese Cookies sind für den Betrieb
        der Seite erforderlich und können nicht deaktiviert werden.
      </p>

      <h2>7. Speicherdauer</h2>
      <p>
        Wir speichern personenbezogene Daten nur so lange, wie dies für die Erfüllung
        der genannten Zwecke erforderlich ist, oder solange gesetzliche
        Aufbewahrungsfristen (z. B. handels- und steuerrechtliche Vorgaben) dies
        verlangen.
      </p>

      <h2>8. Ihre Rechte</h2>
      <p>Sie haben jederzeit das Recht auf:</p>
      <ul>
        <li>Auskunft über die zu Ihrer Person gespeicherten Daten (Art. 15 DSGVO)</li>
        <li>Berichtigung unrichtiger Daten (Art. 16 DSGVO)</li>
        <li>Löschung Ihrer Daten (Art. 17 DSGVO)</li>
        <li>Einschränkung der Verarbeitung (Art. 18 DSGVO)</li>
        <li>Datenübertragbarkeit (Art. 20 DSGVO)</li>
        <li>Widerspruch gegen die Verarbeitung (Art. 21 DSGVO)</li>
        <li>Beschwerde bei einer Aufsichtsbehörde</li>
      </ul>
      <p>
        Zur Ausübung dieser Rechte kontaktieren Sie uns unter{' '}
        <a href="mailto:kontakt@echtzeiteinkauf.de">kontakt@echtzeiteinkauf.de</a>.
      </p>

      <h2>9. Datensicherheit</h2>
      <p>
        Wir verwenden dem aktuellen Stand der Technik entsprechende
        Sicherheitsmaßnahmen, einschließlich SSL/TLS-Verschlüsselung, um Ihre Daten
        gegen zufällige oder vorsätzliche Manipulationen, teilweisen oder vollständigen
        Verlust, Zerstörung oder unbefugten Zugriff zu schützen.
      </p>

      <h2>10. Änderung dieser Datenschutzerklärung</h2>
      <p>
        Wir behalten uns vor, diese Datenschutzerklärung anzupassen, um sie an geänderte
        Rechtslagen oder bei Änderungen unseres Dienstes anzupassen. Die jeweils
        aktuelle Version finden Sie stets auf dieser Seite.
      </p>

      <p className="text-xs text-gray-400 mt-10">
        Stand: Januar 2026. Diese Datenschutzerklärung dient als Vorlage und sollte vor
        Veröffentlichung von einem Rechtsbeistand geprüft werden.
      </p>
    </LegalShell>
  )
}
