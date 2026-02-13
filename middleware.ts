import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { LOCALE_IDS, defaultLanguage } from '@/sanity/lib/languages'

function firstSegment(pathname: string): string {
  return pathname.replace(/^\/+|\/+$/g, '').split('/')[0] || ''
}

/** Production domains: locale is determined by host, not path */
const DOMAIN_NO = 'scandicommerce.no'
const DOMAIN_COM = 'scandicommerce.com'

function isDomainBasedHost(host: string): boolean {
  return host.includes(DOMAIN_NO) || host.includes(DOMAIN_COM)
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const host = request.headers.get('host') || ''
  const seg = firstSegment(pathname)
  const segLower = seg.toLowerCase()
  const hasLocaleInPath = LOCALE_IDS.includes(segLower)

  // --- Domain-based (scandicommerce.com / scandicommerce.no): no /en, /no in URL ---
  if (isDomainBasedHost(host)) {
    const locale = host.includes(DOMAIN_NO) ? 'no' : 'en'
    const headers = new Headers(request.headers)
    headers.set('x-locale', locale)
    headers.set('x-domain-based', '1')

    // Uppercase locale in path → redirect to same path without locale (clean URL)
    if (hasLocaleInPath && seg !== segLower) {
      const rest = pathname.slice(seg.length) || ''
      return NextResponse.redirect(new URL(`/${segLower}${rest}`, request.url))
    }

    // Path already has /en or /no → redirect to clean URL (same domain, no locale segment)
    if (hasLocaleInPath && (segLower === 'en' || segLower === 'no')) {
      const rest = pathname.slice(seg.length) || ''
      const cleanPath = rest || '/'
      const url = new URL(cleanPath, request.url)
      return NextResponse.redirect(url)
    }

    // No locale in path: rewrite to /{locale}{path} so app/[lang]/... routes receive params.lang
    const rewritePath = `/${locale}${pathname === '/' ? '' : pathname}`
    const rewriteUrl = new URL(rewritePath, request.url)
    return NextResponse.rewrite(rewriteUrl, { request: { headers } })
  }

  // --- Path-based (e.g. localhost, vercel.app before redirect): keep /en, /no in path ---
  if (hasLocaleInPath && seg !== segLower) {
    const rest = pathname.slice(seg.length) || ''
    return NextResponse.redirect(new URL(`/${segLower}${rest}`, request.url))
  }

  const response = NextResponse.next()
  response.headers.set('x-pathname', pathname)
  response.headers.set('x-url', request.url)

  const pathLocale = hasLocaleInPath ? segLower : null
  const preferLang = request.cookies.get('language')?.value?.toLowerCase()
  const locale = pathLocale ?? (preferLang && LOCALE_IDS.includes(preferLang) ? preferLang : defaultLanguage)
  response.headers.set('x-locale', locale)
  response.headers.set('x-domain-based', '0')

  if (pathname === '/' || pathname === '') {
    return NextResponse.redirect(new URL(`/${locale}`, request.url))
  }

  if (!hasLocaleInPath && seg) {
    return NextResponse.redirect(new URL(`/${locale}${pathname}`, request.url))
  }

  return response
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|studio|images|.*\\..*).*)'],
}
