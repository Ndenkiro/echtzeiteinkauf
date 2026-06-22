import { Suspense } from 'react'
import { AnmeldenForm } from './form'

export const dynamic = 'force-dynamic'

export default function AnmeldenPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="text-gray-400 text-sm">Lädt...</div></div>}>
      <AnmeldenForm />
    </Suspense>
  )
}
