import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import {
  LOCALE_IDS,
  defaultLanguage,
  getLocaleFromHost,
  getBaseUrlForLocale,
  getPathWithoutLang,
} from '@/sanity/lib/languages'

function firstSegment(pathname: string): string {
  return pathname.replace(/^\/+|\/+$/g, '').split('/')[0] || ''
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const host = request.nextUrl.hostname || request.headers.get('host') || ''
  const localeFromHost = getLocaleFromHost(host)

  // --- Domain-based locale (e.g. scandicommerce.com → en, scandicommerce.no → no) ---
  if (localeFromHost) {
    const seg = firstSegment(pathname)
    const segLower = seg.toLowerCase()
    const hasLocale = LOCALE_IDS.includes(segLower)

    // Same domain but URL has locale segment → redirect to clean URL (e.g. /en/about → /about)
    if (hasLocale && segLower === localeFromHost) {
      const pathWithoutLang = getPathWithoutLang(pathname)
      const targetPath = pathWithoutLang === '/' ? '' : pathWithoutLang
      const url = new URL(request.url)
      url.pathname = targetPath || '/'
      return NextResponse.redirect(url)
    }

    // Same domain but path has a different locale (e.g. scandicommerce.com/no/about) → redirect to that locale's domain
    if (hasLocale && segLower !== localeFromHost) {
      const base = getBaseUrlForLocale(segLower)
      if (base) {
        const pathWithoutLang = getPathWithoutLang(pathname)
        const targetPath = pathWithoutLang === '/' ? '' : pathWithoutLang
        return NextResponse.redirect(new URL(targetPath || '/', base))
      }
    }

    // No locale in path or path is / → rewrite to /{locale}/... so [lang] route is served
    const internalPath = pathname === '/' || pathname === '' ? `/${localeFromHost}` : `/${localeFromHost}${pathname}`
    const rewriteUrl = new URL(request.url)
    rewriteUrl.pathname = internalPath
    const res = NextResponse.rewrite(rewriteUrl)
    res.headers.set('x-pathname', internalPath)
    res.headers.set('x-url', request.url)
    res.headers.set('x-locale-from-host', localeFromHost)
    return res
  }

  // --- Path-based locale (e.g. scandicommerce.vercel.app/en/..., default behavior) ---
  const seg = firstSegment(pathname)
  const segLower = seg.toLowerCase()
  const hasLocale = LOCALE_IDS.includes(segLower)

  // Redirect uppercase locale to lowercase (e.g. /EN/about -> /en/about)
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

  // Redirect paths without locale prefix to /en/... (e.g. /about -> /en/about)
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
