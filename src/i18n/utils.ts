import { en } from './translations/en';
import { fr } from './translations/fr';

export const languages = {
  en: 'English',
  fr: 'Français',
};

export const defaultLang = 'en';

export const translations = {
  en,
  fr,
};

export function getLangFromUrl(url: URL) {
  const [, lang] = url.pathname.split('/');
  if (lang in translations) return lang as keyof typeof translations;
  return defaultLang;
}

export function useTranslations(lang: keyof typeof translations) {
  return function t(key: string) {
    const keys = key.split('.');
    let value: any = translations[lang];
    
    for (const k of keys) {
      value = value?.[k];
    }
    
    return value || key;
  }
}

export function getCurrentLocale(pathname: string): 'en' | 'fr' {
  if (pathname.startsWith('/fr')) return 'fr';
  return 'en';
}

export function getLocalizedPath(path: string, locale: 'en' | 'fr'): string {
  if (locale === 'en') {
    return path.replace(/^\/fr/, '') || '/';
  }
  return `/fr${path}`;
}
