// middleware.ts
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const SUPABASE_URL = 'https://wpxpgszzzfhhsaunolyq.supabase.co'
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndweHBnc3p6emZoaHNhdW5vbHlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0Mzg5ODQsImV4cCI6MjA5NzAxNDk4NH0.8_DVpLNwItAlkn_gL9a4dn-lZ00I8iifX2Cb9N_W-4U'

const COOKIE_DOMAIN = '.echtzeiteinkauf.com'
const ADMIN_HOSTS = ['admin.echtzeiteinkauf.com']
const PROTECTED_PREFIXES = ['/konto', '/shopper-portal', '/admin']

export async function middleware(request: NextRequest) {
  const host = request.headers.get('host') || ''
  const isAdminHost = ADMIN_HOSTS.some(h => host === h || host.startsWith(h + ':'))
  const { pathname, search } = request.nextUrl

  // ── 1. Admin subdomain rewrite ──────────────────────────────
  let rewrittenPath = pathname
  if (isAdminHost) {
    // /login on the admin host → the dedicated admin login page
    if (pathname === '/login' || pathname === '/anmelden') {
      rewrittenPath = '/admin-login'
    } else if (!pathname.startsWith('/admin')) {
      const passthrough = ['/admin-login', '/auth', '/api', '/_next']
      if (!passthrough.some(p => pathname.startsWith(p))) {
        rewrittenPath = pathname === '/' ? '/admin' : `/admin${pathname}`
      }
    }
  }

  const url = request.nextUrl.clone()
  url.pathname = rewrittenPath

  let response = rewrittenPath !== pathname
    ? NextResponse.rewrite(url)
    : NextResponse.next({ request: { headers: request.headers } })

  // ── 2. Supabase session ─────────────────────────────────────
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value
      },
      set(name: string, value: string, options: CookieOptions) {
        response.cookies.set({
          name, value, ...options,
          domain: COOKIE_DOMAIN,
          sameSite: 'lax',
          secure: true,
        })
      },
      remove(name: string, options: CookieOptions) {
        response.cookies.set({
          name, value: '', ...options,
          domain: COOKIE_DOMAIN,
          maxAge: 0,
        })
      },
    },
  })

  const { data: { user } } = await supabase.auth.getUser()

  // ── 3. Auth required? ───────────────────────────────────────
  const needsAuth = PROTECTED_PREFIXES.some(p => rewrittenPath.startsWith(p))

  if (needsAuth && !user) {
    if (isAdminHost) {
      // Admin host → dedicated admin login
      return NextResponse.redirect(new URL('/login', request.url))
    }
    const loginUrl = new URL('/anmelden', request.url)
    loginUrl.searchParams.set('next', pathname + search)
    return NextResponse.redirect(loginUrl)
  }

  // ── 4. Admin role check ─────────────────────────────────────
  if (rewrittenPath.startsWith('/admin') && !rewrittenPath.startsWith('/admin-login') && user) {
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('auth_id', user.id)
      .single()

    if (!profile || !['admin', 'subadmin'].includes(profile.role)) {
      if (isAdminHost) {
        return NextResponse.redirect(new URL('/login', request.url))
      }
      return NextResponse.redirect(new URL('https://echtzeiteinkauf.com/'))
    }
  }

  // ── 5. Already logged in as admin → skip login page ─────────
  if (isAdminHost && rewrittenPath === '/admin-login' && user) {
    const { data: profile } = await supabase
      .from('users').select('role').eq('auth_id', user.id).single()
    if (profile && ['admin', 'subadmin'].includes(profile.role)) {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  // ── 6. Main domain /admin → redirect to subdomain ───────────
  if (!isAdminHost && pathname.startsWith('/admin')) {
    const adminUrl = new URL(request.url)
    adminUrl.hostname = 'admin.echtzeiteinkauf.com'
    adminUrl.pathname = pathname.replace(/^\/admin/, '') || '/'
    return NextResponse.redirect(adminUrl)
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|logo.png|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico)$).*)',
  ],
}
