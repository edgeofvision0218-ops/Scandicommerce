import { headers, cookies } from 'next/headers'
import { defaultLanguage, isLocaleId } from '@/sanity/lib/languages'

/** Get locale from request headers (e.g. x-locale set by middleware). Use when querying Sanity. */
export function getLocale(headersList: Headers): string {
  const locale = headersList.get('x-locale')
  if (locale && isLocaleId(locale)) return locale
  return defaultLanguage
}

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
 * Get the current language from URL search params, cookies, or default (server-side).
 * Used when path-based lang is not available (e.g. legacy ?lang= or non-[lang] routes).
 * Prefers x-locale header (set by middleware for domain-based locale).
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
