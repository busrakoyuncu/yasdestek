import { createI18n } from 'vue-i18n';
import de from '@/locales/de.json';
import en from '@/locales/en.json';
import tr from '@/locales/tr.json';

export const LOCALES = ['tr', 'en', 'de'] as const;
export type Locale = (typeof LOCALES)[number];
const STORAGE_KEY = 'locale';

function isLocale(value: unknown): value is Locale {
  return LOCALES.includes(value as Locale);
}

// A saved choice wins, then the browser language if we have it, else Turkish.
function detectLocale(): Locale {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (isLocale(saved)) return saved;
  } catch {
    // storage unavailable (private mode, blocked): fall through
  }
  const browser = navigator.language.slice(0, 2).toLowerCase();
  return isLocale(browser) ? browser : 'tr';
}

// All three files share the Turkish file's shape; the type catches a missing key.
type MessageSchema = typeof tr;

export const i18n = createI18n<[MessageSchema], Locale, false>({
  legacy: false,
  locale: detectLocale(),
  fallbackLocale: 'tr',
  messages: { tr, en, de },
});

export function setLocale(locale: Locale) {
  i18n.global.locale.value = locale;
  document.documentElement.lang = locale;
  try {
    localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    // storage unavailable: the choice lasts for this page load only
  }
}

document.documentElement.lang = i18n.global.locale.value;
