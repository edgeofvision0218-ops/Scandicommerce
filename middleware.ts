import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { LOCALE_IDS, defaultLanguage, getLocaleFromHost } from '@/sanity/lib/languages'

function firstSegment(pathname: string): string {
  return pathname.replace(/^\/+|\/+$/g, '').split('/')[0] || ''
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const host = request.headers.get('host') ?? ''
  const domainLocale = getLocaleFromHost(host)

  // --- Domain-based locale (scandicommerce.com → en, scandicommerce.no → no) ---
  if (domainLocale) {
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-locale', domainLocale)

    // Remove locale from URL: redirect /en/about → /about, /no/ → /
    const seg = firstSegment(pathname)
    const segLower = seg.toLowerCase()
    const hasLocaleSegment = LOCALE_IDS.includes(segLower)
    if (hasLocaleSegment) {
      const pathWithoutLocale = pathname.slice(seg.length) || '/'
      const canonicalUrl = new URL(pathWithoutLocale === '/' ? '/' : pathWithoutLocale, request.url)
      const res = NextResponse.redirect(canonicalUrl)
      res.headers.set('x-locale', domainLocale)
      res.cookies.set('language', domainLocale, { path: '/', maxAge: 31536000 })
      return res
    }

    // Rewrite so app/[lang]/... receives the locale: /about → /en/about, / → /en
    const rewritePath = `/${domainLocale}${pathname === '/' ? '' : pathname}`
    const rewriteUrl = new URL(rewritePath, request.url)
    const response = NextResponse.rewrite(rewriteUrl)
    response.headers.set('x-locale', domainLocale)
    response.headers.set('x-pathname', pathname)
    response.headers.set('x-url', request.url)
    response.cookies.set('language', domainLocale, { path: '/', maxAge: 31536000 })
    return response
  }

  // --- Path-based locale (vercel.app, localhost: /en/..., /no/...) ---
  const seg = firstSegment(pathname)
  const segLower = seg.toLowerCase()
  const hasLocale = LOCALE_IDS.includes(segLower)

  if (hasLocale && seg !== segLower) {
    const rest = pathname.slice(seg.length) || ''
    return NextResponse.redirect(new URL(`/${segLower}${rest}`, request.url))
  }

  const response = NextResponse.next()
  response.headers.set('x-pathname', pathname)
  response.headers.set('x-url', request.url)

  if (pathname === '/' || pathname === '') {
    const preferLang = request.cookies.get('language')?.value?.toLowerCase()
    const lang = preferLang && LOCALE_IDS.includes(preferLang) ? preferLang : defaultLanguage
    return NextResponse.redirect(new URL(`/${lang}`, request.url))
  }

  if (!hasLocale && seg) {
    const preferLang = request.cookies.get('language')?.value?.toLowerCase()
    const lang = preferLang && LOCALE_IDS.includes(preferLang) ? preferLang : defaultLanguage
    return NextResponse.redirect(new URL(`/${lang}${pathname}`, request.url))
  }

  return response
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|studio|images|.*\\..*).*)'],
}
