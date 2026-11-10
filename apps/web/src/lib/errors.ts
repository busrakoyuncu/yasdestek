import { ApiError } from '@/lib/api';
import { i18n } from '@/lib/i18n';

// Human message for any failure: known api codes map to a translation,
// everything else to the generic one. Never shows raw server text.
export function errorMessage(error: unknown): string {
  const code = error instanceof ApiError ? error.code : 'UNKNOWN';
  const key = `errors.${code}`;
  return i18n.exists(key) ? i18n.t(key) : i18n.t('errors.UNKNOWN');
}
