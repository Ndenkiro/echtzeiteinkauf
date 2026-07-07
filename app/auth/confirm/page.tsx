'use client'
// app/auth/confirm/page.tsx
import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { Suspense } from 'react'

function ConfirmInner() {
  const router = useRouter()
  const params = useSearchParams()
  const next = params.get('next') || '/konto'

  useEffect(() => {
    const supabase = createBrowserClient(
      'https://wpxpgszzzfhhsaunolyq.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndweHBnc3p6emZoaHNhdW5vbHlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0Mzg5ODQsImV4cCI6MjA5NzAxNDk4NH0.8_DVpLNwItAlkn_gL9a4dn-lZ00I8iifX2Cb9N_W-4U'
    )

    // Parse hash fragment manually
    const hash = window.location.hash.substring(1)
    const hashParams = new URLSearchParams(hash)
    const accessToken = hashParams.get('access_token')
    const refreshToken = hashParams.get('refresh_token')

    if (accessToken && refreshToken) {
      // Set session from hash tokens
      supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      }).then(({ error }) => {
        if (!error) {
          router.push(next)
          router.refresh()
        } else {
          router.push('/anmelden?error=session_failed')
        }
      })
    } else {
      // No hash tokens — listen for auth state change
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session) {
          subscription.unsubscribe()
          router.push(next)
          router.refresh()
        }
      })

      // Also check existing session
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          router.push(next)
          router.refresh()
        }
      })

      setTimeout(() => {
        subscription.unsubscribe()
        router.push('/anmelden?error=timeout')
      }, 8000)
    }
  }, [next, router])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-red border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-500 text-sm font-medium">Wird angemeldet...</p>
      </div>
    </div>
  )
}

export default function ConfirmPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-red border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <ConfirmInner />
    </Suspense>
  )
}
