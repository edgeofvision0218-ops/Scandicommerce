'use client'

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
  Suspense,
} from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import {
  languages,
  defaultLanguage,
  getLangFromPath,
  getPathWithoutLang,
  isLocaleId,
  LOCALE_DOMAINS,
  DOMAIN_BASED_LOCALES,
} from '@/sanity/lib/languages'

interface Language {
  id: string
  title: string
  isDefault?: boolean
}

interface LanguageContextType {
  currentLanguage: string
  setLanguage: (lang: string) => void
  availableLanguages: Language[]
  getLanguageTitle: (id: string) => string
  /** Build href for internal links (path-only when domain-based, /lang/path when path-based) */
  localizedHref: (href: string) => string
  /** True when locale is determined by domain (scandicommerce.com / scandicommerce.no) */
  domainBased: boolean
  /** Full URL for a locale (for language switcher cross-domain links) */
  urlForLocale: (locale: string) => string
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

function getDomainBasedFromHost(): boolean {
  if (typeof window === 'undefined') return false
  const h = window.location.hostname
  return h.includes('scandicommerce.com') || h.includes('scandicommerce.no')
}

function getLocaleFromHost(): string {
  if (typeof window === 'undefined') return defaultLanguage
  return window.location.hostname.includes('scandicommerce.no') ? 'no' : 'en'
}

const defaultContextValue: LanguageContextType = {
  currentLanguage: defaultLanguage,
  setLanguage: () => {},
  availableLanguages: languages,
  getLanguageTitle: (id: string) => languages.find((l) => l.id === id)?.title ?? id,
  localizedHref: (href: string) => href,
  domainBased: false,
  urlForLocale: (locale: string) => (DOMAIN_BASED_LOCALES.includes(locale as 'en' | 'no') ? LOCALE_DOMAINS[locale] ?? LOCALE_DOMAINS.en : LOCALE_DOMAINS.en),
}

/**
 * Syncs locale (domain-based or path-based) into context. Renders nothing.
 * Must be inside Suspense because it uses useSearchParams().
 */
function LanguageUrlSync({ onValue }: { onValue: (v: LanguageContextType) => void }) {
  const router = useRouter()
  const pathname = usePathname() || '/'
  const searchParams = useSearchParams()
  const [currentLanguage, setCurrentLanguageState] = useState<string>(defaultLanguage)
  const [isInitialized, setIsInitialized] = useState(false)

  const domainBased = getDomainBasedFromHost()
  const langFromPath = getLangFromPath(pathname)
  const pathWithoutLang = getPathWithoutLang(pathname)
  const isPathBasedRoute = pathname !== '/' && isLocaleId(pathname.replace(/^\/+/, '').split('/')[0] || '')

  // Current path for same-page links (domain-based: path has no locale; path-based: path may have /en/...)
  const pathForSwitcher = domainBased ? pathname : (pathWithoutLang === '/' ? '' : pathWithoutLang)

  useEffect(() => {
    if (!isInitialized) {
      const lang = domainBased
        ? getLocaleFromHost()
        : (isPathBasedRoute ? langFromPath : (searchParams.get('lang') || (typeof window !== 'undefined' ? localStorage.getItem('language') : null) || defaultLanguage))
      setCurrentLanguageState(lang)
      if (typeof window !== 'undefined') {
        localStorage.setItem('language', lang)
      }
      setIsInitialized(true)
    }
  }, [searchParams, isInitialized, isPathBasedRoute, langFromPath, domainBased])

  useEffect(() => {
    if (domainBased) {
      const hostLang = getLocaleFromHost()
      if (hostLang !== currentLanguage) setCurrentLanguageState(hostLang)
      return
    }
    if (isPathBasedRoute && langFromPath !== currentLanguage) {
      setCurrentLanguageState(langFromPath)
      if (typeof window !== 'undefined') {
        localStorage.setItem('language', langFromPath)
      }
    } else if (!isPathBasedRoute) {
      const q = searchParams.get('lang')
      if (q && q !== currentLanguage) {
        setCurrentLanguageState(q)
        if (typeof window !== 'undefined') localStorage.setItem('language', q)
      }
    }
  }, [pathname, searchParams, currentLanguage, isPathBasedRoute, langFromPath, domainBased])

  const setLanguage = useCallback(
    (lang: string) => {
      setCurrentLanguageState(lang)
      if (typeof window !== 'undefined') {
        localStorage.setItem('language', lang)
        document.cookie = `language=${lang}; path=/; max-age=31536000`
      }
      if (domainBased && DOMAIN_BASED_LOCALES.includes(lang as 'en' | 'no')) {
        const baseUrl = LOCALE_DOMAINS[lang] || LOCALE_DOMAINS.en
        window.location.href = `${baseUrl}${pathForSwitcher || ''}`
        return
      }
      if (isPathBasedRoute) {
        const base = pathWithoutLang === '/' ? '' : pathWithoutLang
        router.push(`/${lang}${base}`)
      } else {
        const params = new URLSearchParams(searchParams.toString())
        params.set('lang', lang)
        router.push(`${pathname}?${params.toString()}`)
      }
    },
    [pathname, pathWithoutLang, isPathBasedRoute, router, searchParams, domainBased, pathForSwitcher]
  )

  const getLanguageTitle = useCallback(
    (id: string) => languages.find((lang) => lang.id === id)?.title || id,
    []
  )

  const urlForLocale = useCallback((locale: string): string => {
    const base = DOMAIN_BASED_LOCALES.includes(locale as 'en' | 'no') ? LOCALE_DOMAINS[locale] ?? LOCALE_DOMAINS.en : LOCALE_DOMAINS.en
    return `${base}${pathForSwitcher || ''}`
  }, [pathForSwitcher])

  const localizedHref = useCallback(
    (href: string): string => {
      if (!href || href.startsWith('#') || href.startsWith('http') || href.startsWith('mailto:') || href.startsWith('tel:')) {
        return href
      }
      if (domainBased) {
        return href
      }
      try {
        const [path, qs] = href.split('?')
        const clean = (path || '/').replace(/^\/+/, '') || ''
        const query = qs ? `?${qs}` : ''
        if (clean === '' || clean === '/') return `/${currentLanguage}${query}`
        return `/${currentLanguage}/${clean}${query}`
      } catch {
        return href
      }
    },
    [currentLanguage, domainBased]
  )

  useEffect(() => {
    onValue({
      currentLanguage,
      setLanguage,
      availableLanguages: languages,
      getLanguageTitle,
      localizedHref,
      domainBased,
      urlForLocale,
    })
  }, [currentLanguage, setLanguage, getLanguageTitle, localizedHref, domainBased, urlForLocale, onValue])

  return null
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [contextValue, setContextValue] = useState<LanguageContextType>(defaultContextValue)

  return (
    <LanguageContext.Provider value={contextValue}>
      <Suspense fallback={null}>
        <LanguageUrlSync onValue={setContextValue} />
      </Suspense>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}
