// middleware.ts
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const SUPABASE_URL = 'https://wpxpgszzzfhhsaunolyq.supabase.co'
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndweHBnc3p6emZoaHNhdW5vbHlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0Mzg5ODQsImV4cCI6MjA5NzAxNDk4NH0.8_DVpLNwItAlkn_gL9a4dn-lZ00I8iifX2Cb9N_W-4U'

const COOKIE_DOMAIN = '.echtzeiteinkauf.com'
const ADMIN_HOSTS = ['admin.echtzeiteinkauf.com']

// Route that renders the admin login form (must NOT start with /admin)
const ADMIN_LOGIN_ROUTE = '/panel-login'

export async function middleware(request: NextRequest) {
  const host = request.headers.get('host') || ''
  const isAdminHost = ADMIN_HOSTS.some(h => host === h || host.startsWith(h + ':'))
  const { pathname, search } = request.nextUrl

  // ═══ ADMIN SUBDOMAIN ═══════════════════════════════════════
  if (isAdminHost) {
    // Never touch internals
    if (pathname.startsWith('/_next') || pathname.startsWith('/api') || pathname.startsWith('/auth')) {
      return NextResponse.next()
    }

    const isLoginPath = pathname === '/login' || pathname === ADMIN_LOGIN_ROUTE

    // Build the internal path we actually render
    const internalPath = isLoginPath
      ? ADMIN_LOGIN_ROUTE
      : (pathname === '/' ? '/admin' : `/admin${pathname}`)

    const url = request.nextUrl.clone()
    url.pathname = internalPath

    let response = internalPath !== pathname
      ? NextResponse.rewrite(url)
      : NextResponse.next()

    const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON, {
      cookies: {
        get: (name: string) => request.cookies.get(name)?.value,
        set: (name: string, value: string, options: CookieOptions) => {
          response.cookies.set({ name, value, ...options, domain: COOKIE_DOMAIN, sameSite: 'lax', secure: true })
        },
        remove: (name: string, options: CookieOptions) => {
          response.cookies.set({ name, value: '', ...options, domain: COOKIE_DOMAIN, maxAge: 0 })
        },
      },
    })

    const { data: { user } } = await supabase.auth.getUser()

    // Login page: always render it, redirect away only if already an admin
    if (isLoginPath) {
      if (user) {
        const { data: profile } = await supabase
          .from('users').select('role').eq('auth_id', user.id).maybeSingle()
        if (profile && ['admin', 'subadmin'].includes(profile.role)) {
          return NextResponse.redirect(new URL('/', request.url))
        }
      }
      return response
    }

    // Every other admin page requires an admin session
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    const { data: profile } = await supabase
      .from('users').select('role').eq('auth_id', user.id).maybeSingle()

    if (!profile || !['admin', 'subadmin'].includes(profile.role)) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    return response
  }

  // ═══ MAIN DOMAIN ═══════════════════════════════════════════
  // /admin on the main domain → send to the subdomain
  if (pathname.startsWith('/admin')) {
    const adminUrl = new URL(request.url)
    adminUrl.hostname = 'admin.echtzeiteinkauf.com'
    adminUrl.pathname = pathname.replace(/^\/admin/, '') || '/'
    return NextResponse.redirect(adminUrl)
  }

  // Hide the internal login route on the main domain
  if (pathname === ADMIN_LOGIN_ROUTE) {
    return NextResponse.redirect(new URL('https://admin.echtzeiteinkauf.com/login'))
  }

  let response = NextResponse.next({ request: { headers: request.headers } })

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON, {
    cookies: {
      get: (name: string) => request.cookies.get(name)?.value,
      set: (name: string, value: string, options: CookieOptions) => {
        response.cookies.set({ name, value, ...options, domain: COOKIE_DOMAIN, sameSite: 'lax', secure: true })
      },
      remove: (name: string, options: CookieOptions) => {
        response.cookies.set({ name, value: '', ...options, domain: COOKIE_DOMAIN, maxAge: 0 })
      },
    },
  })

  const { data: { user } } = await supabase.auth.getUser()

  const needsAuth = ['/konto', '/shopper-portal'].some(p => pathname.startsWith(p))
  if (needsAuth && !user) {
    const loginUrl = new URL('/anmelden', request.url)
    loginUrl.searchParams.set('next', pathname + search)
    return NextResponse.redirect(loginUrl)
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|logo.png|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico)$).*)',
  ],
}
