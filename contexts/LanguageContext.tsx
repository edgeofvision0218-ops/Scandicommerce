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
  getBaseUrlForLocale,
  getLocaleFromHost,
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

  // Domain-based (e.g. scandicommerce.com) or path-based (/en/about)
  const host = typeof window !== 'undefined' ? window.location.hostname : ''
  const localeFromHost = getLocaleFromHost(host)
  const langFromPath = localeFromHost ?? getLangFromPath(pathname)
  const pathWithoutLang = getPathWithoutLang(pathname)
  const isPathBasedRoute =
    pathname !== '/' && isLocaleId(pathname.replace(/^\/+/, '').split('/')[0] || '')
  const isDomainBasedLocale = !!localeFromHost

  useEffect(() => {
    if (!isInitialized) {
      const lang = isDomainBasedLocale
        ? langFromPath
        : isPathBasedRoute
          ? langFromPath
          : (searchParams.get('lang') || (typeof window !== 'undefined' ? localStorage.getItem('language') : null) || defaultLanguage)
      setCurrentLanguageState(lang)
      if (typeof window !== 'undefined') {
        localStorage.setItem('language', lang)
      }
      setIsInitialized(true)
    }
  }, [searchParams, isInitialized, isPathBasedRoute, isDomainBasedLocale, langFromPath])

  useEffect(() => {
    if (isDomainBasedLocale || (isPathBasedRoute && langFromPath !== currentLanguage)) {
      setCurrentLanguageState(langFromPath)
      if (typeof window !== 'undefined') {
        localStorage.setItem('language', langFromPath)
      }
    } else if (!isPathBasedRoute && !isDomainBasedLocale) {
      const q = searchParams.get('lang')
      if (q && q !== currentLanguage) {
        setCurrentLanguageState(q)
        if (typeof window !== 'undefined') localStorage.setItem('language', q)
      }
    }
  }, [pathname, searchParams, currentLanguage, isPathBasedRoute, isDomainBasedLocale, langFromPath])

  const setLanguage = useCallback(
    (lang: string) => {
      setCurrentLanguageState(lang)
      if (typeof window !== 'undefined') {
        localStorage.setItem('language', lang)
        document.cookie = `language=${lang}; path=/; max-age=31536000`
      }
      // If target language has its own domain (e.g. en → scandicommerce.com, no → scandicommerce.no), navigate there
      const targetBase = typeof window !== 'undefined' ? getBaseUrlForLocale(lang) : null
      const currentHost = typeof window !== 'undefined' ? window.location.hostname : ''
      const localeFromHost = getLocaleFromHost(currentHost)
      if (targetBase && localeFromHost !== null) {
        const path = pathWithoutLang === '/' ? '' : pathWithoutLang
        window.location.href = `${targetBase}${path || '/'}`
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
    [pathname, pathWithoutLang, isPathBasedRoute, router, searchParams]
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
        const host = typeof window !== 'undefined' ? window.location.hostname : ''
        if (getLocaleFromHost(host)) {
          return (clean ? `/${clean}` : '/') + query
        }
        if (clean === '' || clean === '/') return `/${currentLanguage}${query}`
        return `/${currentLanguage}/${clean}${query}`
      } catch {
        return href
      }
    },
    [currentLanguage]
  )

  useEffect(() => {
    onValue({
      currentLanguage,
      setLanguage,
      availableLanguages: languages,
      getLanguageTitle,
      localizedHref,
    })
  }, [currentLanguage, setLanguage, getLanguageTitle, localizedHref, onValue])

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
