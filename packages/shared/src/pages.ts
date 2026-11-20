import { z } from 'zod';

// Editable platform pages such as general-rules. Content is plain text.
export const pageSchema = z.object({
  content: z.string().trim().min(1).max(20_000),
});
export type PageInput = z.infer<typeof pageSchema>;

// The languages a page is kept in, as `?locale=` on the page routes.
// Turkish is the default and what a missing translation falls back to.
export const pageLocales = ['tr', 'en', 'de'] as const;
export const pageLocaleQuerySchema = z.object({
  locale: z.enum(pageLocales).default('tr'),
});
export type PageLocale = (typeof pageLocales)[number];
