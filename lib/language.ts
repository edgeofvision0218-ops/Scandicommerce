import { headers, cookies } from 'next/headers'
import { defaultLanguage, isLocaleId } from '@/sanity/lib/languages'

/**
 * Get the current language from path params ([lang]), cookies, or default (server-side).
 * Use in pages under app/[lang]/... via params.lang.
 * Locale is normalized to lowercase so /EN/... and /en/... both resolve to "en".
 */
export function getLanguageFromParams(params: { lang?: string }): string {
  const raw = params?.lang
  const lang = typeof raw === 'string' ? raw.toLowerCase() : ''
  if (lang && isLocaleId(lang)) {
    return lang
  }
  return defaultLanguage
}

/**
 * Whether the current request uses domain-based locale (scandicommerce.com / scandicommerce.no).
 * When true, internal links should not include /en or /no in the path.
 */
export async function getDomainBased(): Promise<boolean> {
  try {
    const headersList = await headers()
    return headersList.get('x-domain-based') === '1'
  } catch {
    return false
  }
}

/**
 * Get the current language from x-locale (set by middleware), path, cookies, or default (server-side).
 * Domain-based: middleware sets x-locale from host. Path-based: from path or cookie.
 */
export async function getServerLanguage(): Promise<string> {
  try {
    const headersList = await headers()
    const localeFromHeader = headersList.get('x-locale')
    if (localeFromHeader && isLocaleId(localeFromHeader)) {
      return localeFromHeader
    }
    const pathname = headersList.get('x-pathname') || headersList.get('x-url') || ''
    const pathSegment = pathname.replace(/^\/+|\/+$/g, '').split('/')[0] || ''
    if (pathSegment && isLocaleId(pathSegment)) {
      return pathSegment
    }
    try {
      const referer = headersList.get('referer') || ''
      if (referer) {
        const url = new URL(referer)
        const seg = url.pathname.replace(/^\/+/, '').split('/')[0] || ''
        if (seg && isLocaleId(seg)) return seg
        const lang = url.searchParams.get('lang')
        if (lang) return lang
      }
    } catch {
      // ignore
    }
    const cookieStore = await cookies()
    const langFromCookie = cookieStore.get('language')?.value
    if (langFromCookie && isLocaleId(langFromCookie)) {
      return langFromCookie
    }
  } catch {
    // Fallback to default
  }
  return defaultLanguage
}

/**
 * Server-side: locale + whether links should be path-only (domain-based).
 * Use when building hrefs so domain-based uses /path and path-based uses /lang/path.
 */
export async function getLocaleConfig(): Promise<{ locale: string; domainBased: boolean }> {
  const [locale, domainBased] = await Promise.all([getServerLanguage(), getDomainBased()])
  return { locale, domainBased }
}

/**
 * Get language from search params (for use in page components).
 * Prefer getLanguageFromParams(params) for path-based app/[lang]/... pages.
 */
export function getLanguageFromSearchParams(searchParams: { [key: string]: string | string[] | undefined }): string {
  const lang = searchParams?.lang
  if (typeof lang === 'string' && isLocaleId(lang)) {
    return lang
  }
  return defaultLanguage
}
