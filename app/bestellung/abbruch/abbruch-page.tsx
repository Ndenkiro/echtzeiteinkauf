// app/bestellung/abbruch/page.tsx
import Link from 'next/link'
import Image from 'next/image'
import { XCircle, ArrowLeft } from 'lucide-react'

export default function AbbruchPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
      <div className="max-w-md w-full">
        <div className="flex items-center justify-center gap-2 mb-8">
          <Image src="/logo.png" alt="Echtzeiteinkauf" width={40} height={40} className="rounded-full" />
          <span className="font-black text-xl text-gray-900">Echtzeiteinkauf</span>
        </div>
        <div className="bg-white rounded-3xl p-10 text-center shadow-sm border border-gray-100">
          <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-6">
            <XCircle size={40} className="text-gray-400" />
          </div>
          <h1 className="text-2xl font-black text-gray-900 mb-2">Zahlung abgebrochen</h1>
          <p className="text-gray-500 text-sm leading-relaxed mb-8">
            Ihre Bestellung wurde nicht abgeschlossen. Ihr Warenkorb ist noch gespeichert —
            Sie können den Kauf jederzeit fortsetzen.
          </p>
          <Link href="/" className="btn-red w-full py-3.5 text-sm flex items-center justify-center gap-2">
            <ArrowLeft size={16} /> Zurück zum Warenkorb
          </Link>
        </div>
      </div>
    </div>
  )
}
