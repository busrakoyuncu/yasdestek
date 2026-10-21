import { format, formatDistanceToNow } from 'date-fns';
import { de, enUS, tr } from 'date-fns/locale';
import { i18n, type Locale } from '@/lib/i18n';

// Api timestamps are UTC ISO strings; shown in the user's language.
const locales = { tr, en: enUS, de };
const current = () => locales[i18n.global.locale.value as Locale];

export const formatDate = (iso: string) =>
  format(new Date(iso), 'PP', { locale: current() });
export const formatDateTime = (iso: string) =>
  format(new Date(iso), 'PPp', { locale: current() });
export const timeAgo = (iso: string) =>
  formatDistanceToNow(new Date(iso), { addSuffix: true, locale: current() });
