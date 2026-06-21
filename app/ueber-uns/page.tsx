// app/ueber-uns/page.tsx
import { LegalShell } from '@/components/layout/legal-shell'

export const metadata = { title: 'Über uns — Echtzeiteinkauf' }

export default function UeberUnsPage() {
  return (
    <LegalShell eyebrow="Unser Team" title="Über uns">
      <p>
        Echtzeiteinkauf wurde mit einer einfachen Idee gegründet: Lebensmitteleinkäufe
        sollen so schnell und unkompliziert sein wie eine Nachricht an einen Freund.
        Wir verbinden Kund:innen in Nürnberg, Fürth und Umgebung mit ihren
        Lieblingssupermärkten — LIDL, ALDI, REWE, Edeka und vielen mehr — und liefern
        innerhalb von nur 2 Stunden direkt an die Haustür.
      </p>

      <h2>Unsere Mission</h2>
      <p>
        Wir glauben, dass frische Lebensmittel für jeden zugänglich sein sollten —
        ohne stundenlanges Anstehen, ohne Parkplatzsuche, ohne verlorene Zeit. Unsere
        persönlichen Shopper wählen jedes Produkt sorgfältig aus, als würden sie für
        sich selbst einkaufen.
      </p>

      <h2>Wie alles begann</h2>
      <p>
        Echtzeiteinkauf entstand aus der Beobachtung, dass viele Menschen in Bayern
        keinen einfachen Zugang zu schnellen, zuverlässigen Lieferdiensten für
        Supermarktprodukte hatten. Wir haben eine Plattform aufgebaut, die nicht nur
        große Ketten, sondern auch lokale Geschäfte und Spezialitätenläden einbindet —
        damit jede Nachbarschaft die Vielfalt bekommt, die sie verdient.
      </p>

      <h2>Unsere Werte</h2>
      <ul>
        <li><strong>Frische zuerst</strong> — jedes Produkt wird sorgfältig ausgewählt</li>
        <li><strong>Fairness</strong> — transparente Preise, faire Bezahlung für unsere Shopper</li>
        <li><strong>Lokal verwurzelt</strong> — wir unterstützen Geschäfte in unserer Region</li>
        <li><strong>Geschwindigkeit mit Sorgfalt</strong> — schnell, aber nie auf Kosten der Qualität</li>
      </ul>

      <h2>Das Team</h2>
      <p>
        Wir sind ein kleines, engagiertes Team aus Nürnberg mit einer großen Vision für
        die Zukunft des Lebensmitteleinkaufs in Deutschland. Hinter jeder Bestellung
        stehen Menschen, die täglich daran arbeiten, Ihren Einkauf einfacher zu machen.
      </p>

      <h2>Kontakt</h2>
      <p>
        Haben Sie Fragen oder Anregungen? Wir freuen uns auf Ihre Nachricht unter{' '}
        <a href="mailto:kontakt@echtzeiteinkauf.de">kontakt@echtzeiteinkauf.de</a>.
      </p>
    </LegalShell>
  )
}
