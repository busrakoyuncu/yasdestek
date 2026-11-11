import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { z } from 'zod';
import { de, en, tr } from 'zod/locales';
import messagesDe from '@/locales/de.json';
import messagesEn from '@/locales/en.json';
import messagesTr from '@/locales/tr.json';

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

void i18n.use(initReactI18next).init({
  lng: detectLocale(),
  fallbackLng: 'tr',
  resources: {
    tr: { translation: messagesTr },
    en: { translation: messagesEn },
    de: { translation: messagesDe },
  },
  // React already escapes rendered strings
  interpolation: { escapeValue: false },
});

// Short translated field messages for the common zod issue kinds. Anything
// else falls through to zod's own messages in the active language.
function fieldMessage(issue: z.core.$ZodRawIssue): string | undefined {
  switch (issue.code) {
    case 'invalid_type':
      return issue.input === undefined
        ? i18n.t('validation.required')
        : i18n.t('validation.invalid');
    case 'too_small':
      return Number(issue.minimum) <= 1
        ? i18n.t('validation.required')
        : i18n.t('validation.minLength', { n: issue.minimum });
    case 'too_big':
      return i18n.t('validation.maxLength', { n: issue.maximum });
    case 'invalid_format':
      return i18n.t('validation.invalid');
    case 'custom': {
      // shared schemas name their rule's translation in params.key
      const key = (issue.params as { key?: string } | undefined)?.key;
      return key ? i18n.t(`validation.${key}`) : undefined;
    }
    default:
      return undefined;
  }
}

const zodLocales = { tr, en, de };

function applyLocale(locale: Locale) {
  document.documentElement.lang = locale;
  z.config({ ...zodLocales[locale](), customError: fieldMessage });
}

export async function setLocale(locale: Locale) {
  await i18n.changeLanguage(locale);
  applyLocale(locale);
  try {
    localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    // storage unavailable: the choice lasts for this page load only
  }
}

applyLocale(i18n.language as Locale);

export { i18n };
