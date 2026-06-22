'use client'
// app/registrieren/page.tsx
import { Suspense } from 'react'
import { RegistrierenForm } from './form'

export default function RegistrierenPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-400 text-sm">Lädt...</div>
      </div>
    }>
      <RegistrierenForm />
    </Suspense>
  )
}
