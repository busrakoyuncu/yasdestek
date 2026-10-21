import type { TypedSchema } from 'vee-validate';
import type { z } from 'zod';
import { i18n } from '@/lib/i18n';

// Bridges a zod 4 schema (from packages/shared) to vee-validate, with the
// common issue kinds turned into short translated field messages.
function messageFor(issue: z.core.$ZodIssue): string {
  const { t } = i18n.global;
  switch (issue.code) {
    case 'invalid_type':
      return issue.input === undefined
        ? t('validation.required')
        : t('validation.invalid');
    case 'too_small':
      return Number(issue.minimum) <= 1
        ? t('validation.required')
        : t('validation.minLength', { n: issue.minimum });
    case 'too_big':
      return t('validation.maxLength', { n: issue.maximum });
    case 'invalid_format':
      return t('validation.invalid');
    default:
      return issue.message;
  }
}

export function toTypedSchema<S extends z.ZodType>(
  schema: S,
): TypedSchema<z.input<S>, z.output<S>> {
  return {
    __type: 'VVTypedSchema',
    async parse(values) {
      const result = await schema.safeParseAsync(values);
      if (result.success) return { value: result.data, errors: [] };
      const byPath = new Map<string, string[]>();
      for (const issue of result.error.issues) {
        const path = issue.path.join('.');
        byPath.set(path, [...(byPath.get(path) ?? []), messageFor(issue)]);
      }
      return {
        errors: [...byPath].map(([path, errors]) => ({ path, errors })),
      };
    },
  };
}
