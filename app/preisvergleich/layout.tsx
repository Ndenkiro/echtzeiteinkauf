// app/preisvergleich/layout.tsx
import { Navbar } from '@/components/layout/navbar'

export const metadata = {
  title: 'Preisvergleich — Echtzeiteinkauf',
  description:
    'Stellen Sie Ihren Einkaufskorb zusammen und vergleichen Sie ihn bei Lidl, ' +
    'Aldi, Edeka und REWE. Geprüfte Preise, Lieferung in 2 Stunden.',
}

export default function PreisvergleichLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <Navbar />
      {children}
    </>
  )
}
