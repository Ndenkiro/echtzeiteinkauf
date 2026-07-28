// middleware.ts
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const SUPABASE_URL = 'https://wpxpgszzzfhhsaunolyq.supabase.co'
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndweHBnc3p6emZoaHNhdW5vbHlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0Mzg5ODQsImV4cCI6MjA5NzAxNDk4NH0.8_DVpLNwItAlkn_gL9a4dn-lZ00I8iifX2Cb9N_W-4U'

// Cookie shared across all subdomains so login works on admin.echtzeiteinkauf.com
const COOKIE_DOMAIN = '.echtzeiteinkauf.com'

const ADMIN_HOSTS = ['admin.echtzeiteinkauf.com']
const PROTECTED_PREFIXES = ['/konto', '/shopper-portal', '/admin']

export async function middleware(request: NextRequest) {
  const host = request.headers.get('host') || ''
  const isAdminHost = ADMIN_HOSTS.some(h => host === h || host.startsWith(h + ':'))
  const { pathname, search } = request.nextUrl

  // ── 1. Admin subdomain rewrite ──────────────────────────────
  // admin.echtzeiteinkauf.com/          → /admin
  // admin.echtzeiteinkauf.com/shoppers  → /admin/shoppers
  let rewrittenPath = pathname
  if (isAdminHost && !pathname.startsWith('/admin')) {
    // Leave auth pages and API routes alone
    const passthrough = ['/anmelden', '/registrieren', '/auth', '/api']
    if (!passthrough.some(p => pathname.startsWith(p))) {
      rewrittenPath = pathname === '/' ? '/admin' : `/admin${pathname}`
    }
  }

  const url = request.nextUrl.clone()
  url.pathname = rewrittenPath

  let response = rewrittenPath !== pathname
    ? NextResponse.rewrite(url)
    : NextResponse.next({ request: { headers: request.headers } })

  // ── 2. Supabase session refresh ─────────────────────────────
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

  // ── 3. Route protection ─────────────────────────────────────
  const needsAuth = PROTECTED_PREFIXES.some(p => rewrittenPath.startsWith(p))

  if (needsAuth && !user) {
    const loginUrl = new URL('/anmelden', request.url)
    // On the admin host, send them back to the admin root after login
    loginUrl.searchParams.set('next', isAdminHost ? '/' : pathname + search)
    return NextResponse.redirect(loginUrl)
  }

  // ── 4. Admin role check ─────────────────────────────────────
  if (rewrittenPath.startsWith('/admin') && user) {
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('auth_id', user.id)
      .single()

    const allowedRoles = ['admin', 'subadmin']
    if (!profile || !allowedRoles.includes(profile.role)) {
      // Not an admin — send to the main site
      return NextResponse.redirect(new URL('https://echtzeiteinkauf.com/'))
    }
  }

  // ── 5. Block main-domain /admin access (force subdomain) ────
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
    /*
     * Match all paths except:
     * - _next/static, _next/image (build assets)
     * - favicon, logo, images
     */
    '/((?!_next/static|_next/image|favicon.ico|logo.png|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico)$).*)',
  ],
}
