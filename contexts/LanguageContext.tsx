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
  isDomainBasedHost,
  getLocaleFromHost,
  LOCALE_DOMAINS,
} from '@/sanity/lib/languages'

function getLanguageFromCookie(): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(/\blanguage=(\w+)/)
  return match && isLocaleId(match[1]) ? match[1] : null
}

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
  /** Build href for internal links so ?lang= is preserved when navigating */
  localizedHref: (href: string) => string
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

const defaultContextValue: LanguageContextType = {
  currentLanguage: defaultLanguage,
  setLanguage: () => {},
  availableLanguages: languages,
  getLanguageTitle: (id: string) => languages.find((l) => l.id === id)?.title ?? id,
  localizedHref: (href: string) => href,
}

/**
 * Syncs path-based locale (/en/..., /no/...) into context. Renders nothing.
 * Must be inside Suspense because it uses useSearchParams().
 */
function LanguageUrlSync({ onValue }: { onValue: (v: LanguageContextType) => void }) {
  const router = useRouter()
  const pathname = usePathname() || '/'
  const searchParams = useSearchParams()
  const [currentLanguage, setCurrentLanguageState] = useState<string>(defaultLanguage)
  const [isInitialized, setIsInitialized] = useState(false)

  // Path-based: /en/about, /no/shopify/... — derive lang from first segment
  const langFromPath = getLangFromPath(pathname)
  const pathWithoutLang = getPathWithoutLang(pathname)
  const isPathBasedRoute = pathname !== '/' && isLocaleId(pathname.replace(/^\/+/, '').split('/')[0] || '')
  const domainBased = typeof window !== 'undefined' && isDomainBasedHost(window.location.host)
  const langFromDomain = typeof window !== 'undefined' ? getLocaleFromHost(window.location.host) : null
  const langFromCookie = getLanguageFromCookie()

  useEffect(() => {
    if (!isInitialized) {
      let lang: string
      if (isPathBasedRoute) {
        lang = langFromPath
      } else if (domainBased && (langFromDomain || langFromCookie)) {
        lang = langFromDomain || langFromCookie || defaultLanguage
      } else {
        lang = searchParams.get('lang') || (typeof window !== 'undefined' ? localStorage.getItem('language') : null) || defaultLanguage
      }
      setCurrentLanguageState(lang)
      if (typeof window !== 'undefined') {
        localStorage.setItem('language', lang)
      }
      setIsInitialized(true)
    }
  }, [searchParams, isInitialized, isPathBasedRoute, langFromPath, domainBased, langFromDomain, langFromCookie])

  useEffect(() => {
    if (isPathBasedRoute && langFromPath !== currentLanguage) {
      setCurrentLanguageState(langFromPath)
      if (typeof window !== 'undefined') {
        localStorage.setItem('language', langFromPath)
      }
    } else if (domainBased && (langFromDomain || langFromCookie) && (langFromDomain || langFromCookie) !== currentLanguage) {
      const lang = langFromDomain || langFromCookie
      if (lang) {
        setCurrentLanguageState(lang)
        if (typeof window !== 'undefined') localStorage.setItem('language', lang)
      }
    } else if (!isPathBasedRoute && !domainBased) {
      const q = searchParams.get('lang')
      if (q && q !== currentLanguage) {
        setCurrentLanguageState(q)
        if (typeof window !== 'undefined') localStorage.setItem('language', q)
      }
    }
  }, [pathname, searchParams, currentLanguage, isPathBasedRoute, langFromPath, domainBased, langFromDomain, langFromCookie])

  const setLanguage = useCallback(
    (lang: string) => {
      setCurrentLanguageState(lang)
      if (typeof window !== 'undefined') {
        localStorage.setItem('language', lang)
        document.cookie = `language=${lang}; path=/; max-age=31536000`
      }
      if (domainBased && LOCALE_DOMAINS[lang]) {
        const path = pathname === '/' ? '' : pathname
        window.location.href = LOCALE_DOMAINS[lang] + path
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
    [pathname, pathWithoutLang, isPathBasedRoute, domainBased, router, searchParams]
  )

  const getLanguageTitle = useCallback(
    (id: string) => languages.find((lang) => lang.id === id)?.title || id,
    []
  )

  const localizedHref = useCallback(
    (href: string): string => {
      if (!href || href.startsWith('#') || href.startsWith('http') || href.startsWith('mailto:') || href.startsWith('tel:')) {
        return href
      }
      try {
        const [path, qs] = href.split('?')
        const clean = (path || '/').replace(/^\/+/, '') || ''
        const query = qs ? `?${qs}` : ''
        if (domainBased) {
          return clean === '' || clean === '/' ? (query ? `/?${query.slice(1)}` : '/') : `/${clean}${query}`
        }
        if (clean === '' || clean === '/') return `/${currentLanguage}${query}`
        return `/${currentLanguage}/${clean}${query}`
      } catch {
        return href
      }
    },
    [currentLanguage, domainBased]
  )

  const availableLanguages = domainBased
    ? languages.filter((l) => LOCALE_DOMAINS[l.id])
    : languages

  useEffect(() => {
    onValue({
      currentLanguage,
      setLanguage,
      availableLanguages,
      getLanguageTitle,
      localizedHref,
    })
  }, [currentLanguage, setLanguage, getLanguageTitle, localizedHref, onValue, availableLanguages])

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
