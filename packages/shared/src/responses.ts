import { z } from 'zod';

// A participant's answer to a module. Text may be empty when the module is
// answered with audio or images only. Drafts stay private until published.
export const responseSchema = z.object({
  text: z.string().trim().max(50_000).default(''),
  published: z.boolean().default(false),
});
export type ResponseInput = z.infer<typeof responseSchema>;
