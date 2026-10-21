import { ApiError } from '@/lib/api';
import { i18n } from '@/lib/i18n';

// Human message for any failure: known api codes map to a translation,
// everything else to the generic one. Never shows raw server text.
export function errorMessage(error: unknown): string {
  const { t, te } = i18n.global;
  const code = error instanceof ApiError ? error.code : 'UNKNOWN';
  return te(`errors.${code}`) ? t(`errors.${code}`) : t('errors.UNKNOWN');
}
