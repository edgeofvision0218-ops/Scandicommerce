'use client'

import React, { useState, useRef, useEffect, Suspense } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { Globe } from 'lucide-react'
import { defaultLanguage } from '@/sanity/lib/languages'

/** Placeholder that matches server/first paint to avoid hydration mismatch */
function LanguageSwitcherPlaceholder() {
  const defaultLangTitle = 'English'
  const defaultCode = defaultLanguage.toUpperCase()
  return (
    <div className="relative">
      <div
        className="flex gap-2 px-3 py-2 text-gray-900 font-medium text-sm border border-gray-200 rounded-lg"
        aria-hidden
      >
        <Globe className="w-4 h-4" />
        <span className="hidden sm:inline">{defaultLangTitle}</span>
        <span className="sm:hidden">{defaultCode}</span>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  )
}

function LanguageSwitcherInner() {
  const { currentLanguage, setLanguage, availableLanguages } = useLanguage()
  const [isOpen, setIsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => setMounted(true), [])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleLanguageChange = (langId: string) => {
    setLanguage(langId)
    setIsOpen(false)
  }

  if (!mounted) {
    return <LanguageSwitcherPlaceholder />
  }

  const currentLang = availableLanguages.find((lang) => lang.id === currentLanguage)

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 text-gray-900 hover:text-teal transition-colors font-medium text-sm border border-gray-200 rounded-lg hover:border-teal"
        aria-label="Select language"
      >
        <Globe className="w-4 h-4" />
        <span className="hidden sm:inline">{currentLang?.title || currentLanguage.toUpperCase()}</span>
        <span className="sm:hidden">{currentLanguage.toUpperCase()}</span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
          {availableLanguages.map((lang) => (
            <button
              key={lang.id}
              onClick={() => handleLanguageChange(lang.id)}
              className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                currentLanguage === lang.id
                  ? 'bg-teal/10 text-teal font-semibold'
                  : 'text-gray-900 hover:bg-gray-50 hover:text-teal'
              }`}
            >
              <div className="flex items-center justify-between">
                <span>{lang.title}</span>
                {currentLanguage === lang.id && (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function LanguageSwitcher() {
  return (
    <Suspense fallback={<LanguageSwitcherPlaceholder />}>
      <LanguageSwitcherInner />
    </Suspense>
  )
}
