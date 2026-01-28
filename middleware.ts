import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { LOCALE_IDS, defaultLanguage } from '@/sanity/lib/languages'

function firstSegment(pathname: string): string {
  return pathname.replace(/^\/+|\/+$/g, '').split('/')[0] || ''
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const response = NextResponse.next()
  response.headers.set('x-pathname', pathname)
  response.headers.set('x-url', request.url)

  const seg = firstSegment(pathname)
  const hasLocale = LOCALE_IDS.includes(seg)

  if (pathname === '/' || pathname === '') {
    const preferLang = request.cookies.get('language')?.value
    const lang = preferLang && LOCALE_IDS.includes(preferLang) ? preferLang : defaultLanguage
    return NextResponse.redirect(new URL(`/${lang}`, request.url))
  }

  // Redirect paths without locale prefix to /en/... (e.g. /about -> /en/about)
  if (!hasLocale && seg) {
    const preferLang = request.cookies.get('language')?.value
    const lang = preferLang && LOCALE_IDS.includes(preferLang) ? preferLang : defaultLanguage
    return NextResponse.redirect(new URL(`/${lang}${pathname}`, request.url))
  }

  return response
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|studio|images|.*\\..*).*)'],
}
