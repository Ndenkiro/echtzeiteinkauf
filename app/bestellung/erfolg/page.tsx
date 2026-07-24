// app/bestellung/erfolg/page.tsx
import Link from 'next/link'
import Image from 'next/image'
import { CheckCircle2, ArrowRight } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default function ErfolgPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
      <div className="max-w-md w-full">
        <div className="flex items-center justify-center gap-2 mb-8">
          <Image src="/logo.png" alt="Echtzeiteinkauf" width={40} height={40} className="rounded-full" />
          <span className="font-black text-xl text-gray-900">Echtzeiteinkauf</span>
        </div>
        <div className="bg-white rounded-3xl p-10 text-center shadow-sm border border-gray-100">
          <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={40} className="text-green-600" />
          </div>
          <h1 className="text-2xl font-black text-gray-900 mb-2">Bestellung erfolgreich! 🎉</h1>
          <p className="text-gray-500 text-sm leading-relaxed mb-8">
            Vielen Dank für Ihre Bestellung. Ein Shopper wird Ihnen in Kürze zugewiesen
            und Ihre Einkäufe werden innerhalb von 2 Stunden geliefert.
          </p>
          <div className="flex flex-col gap-3">
            <Link href="/konto" className="btn-red w-full py-3.5 text-sm flex items-center justify-center gap-2">
              Zu meinen Bestellungen <ArrowRight size={16} />
            </Link>
            <Link href="/" className="text-gray-400 text-sm font-bold hover:text-gray-600 transition-colors">
              Zurück zur Startseite
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
