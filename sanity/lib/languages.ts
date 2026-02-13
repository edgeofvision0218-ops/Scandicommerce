// Language configuration for Sanity CMS
export const languages = [
  { id: "en", title: "English", isDefault: true },
  { id: "no", title: "Norwegian (Norsk)", isDefault: false },
  { id: "sv", title: "Swedish (Svenska)", isDefault: false },
  { id: "da", title: "Danish (Dansk)", isDefault: false },
  { id: "de", title: "German (Deutsch)", isDefault: false },
];

/** Valid locale slugs for path-based URLs: /en/..., /no/..., etc. */
export const LOCALE_IDS = languages.map((l) => l.id);

/** Domain-based locale: hostname (no port) → locale. Used when not using path-based /en, /no. */
export const DOMAIN_LOCALE_MAP: Record<string, string> = {
  'scandicommerce.no': 'no',
  'scandicommerce.com': 'en',
  'www.scandicommerce.no': 'no',
  'www.scandicommerce.com': 'en',
}

/** Locale → primary domain for language switcher (same path on other domain). */
export const LOCALE_DOMAINS: Record<string, string> = {
  en: 'https://scandicommerce.com',
  no: 'https://scandicommerce.no',
}

export function getLocaleFromHost(host: string | null): string | null {
  if (!host) return null
  const hostname = host.split(':')[0].toLowerCase()
  return DOMAIN_LOCALE_MAP[hostname] ?? null
}

/** Whether this host uses domain-based locale (no /en, /no in URL). */
export function isDomainBasedHost(host: string | null): boolean {
  return getLocaleFromHost(host) !== null
}

/** Shape expected by document-internationalization and other Sanity plugins */
export const supportedLanguages = languages.map(({ id, title }) => ({ id, title }));

export const defaultLanguage = languages.find((lang) => lang.isDefault)?.id || "en";

export function isLocaleId(id: string): boolean {
  return LOCALE_IDS.includes(id);
}

/** Get language from pathname, e.g. /en/about → "en", /EN/about → "en". Returns default if first segment is not a locale. */
export function getLangFromPath(pathname: string): string {
  const segment = pathname.replace(/^\/+|\/+$/g, "").split("/")[0] || "";
  const segmentLower = segment.toLowerCase();
  return isLocaleId(segmentLower) ? segmentLower : defaultLanguage;
}

/** Path without leading locale segment for path-based i18n. /en/about → /about, /EN/about → /about */
export function getPathWithoutLang(pathname: string): string {
  const segments = pathname.replace(/^\/+/, "").split("/").filter(Boolean);
  const first = segments[0]?.toLowerCase() ?? "";
  if (segments.length > 0 && isLocaleId(first)) {
    segments.shift();
  }
  return segments.length ? `/${segments.join("/")}` : "/";
}

/** Document type names that support translation (document-level i18n) */
export const TRANSLATABLE_SCHEMA_TYPES = [
  "landingPage",
  "servicesPage",
  "aboutPage",
  "contactPage",
  "workPage",
  "blogPage",
  "blogPost",
  "shopifyDevelopmentPage",
  "migratePage",
  "shopifyPosPage",
  "allPackagesPage",
  "shopifyPlatformPage",
  "shopifyPosInfoPage",
  "shopifyTcoCalculatorPage",
  "shopifyXPimPage",
  "shopifyXAiPage",
  "whyShopifyPage",
  "partnersPage",
  "packageDetailPage",
  "merchPage",
  "merchProductSettings",
  "headerSettings",
  "footerSettings",
  "vippsHurtigkassePage",
] as const;

export const getLanguageTitle = (id: string): string => {
  return languages.find((lang) => lang.id === id)?.title || id;
};

/**
 * Get languages formatted for AI Assist plugin
 * Maps language codes to proper locale format (e.g., en -> en-US, de -> de-DE)
 */
export const getLanguagesForAIAssist = () => {
  return languages.map((lang) => {
    // Map language codes to proper locale format for AI Assist
    const localeMap: Record<string, string> = {
      en: "en-US",
      no: "nb-NO", // Norwegian Bokmål
      sv: "sv-SE", // Swedish
      da: "da-DK", // Danish
      de: "de-DE", // German
    };

    return {
      id: localeMap[lang.id] || lang.id,
      title: lang.title,
    };
  });
};
