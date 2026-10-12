import { z } from 'zod';

// Editable platform pages such as general-rules. Content is plain text.
export const pageSchema = z.object({
  content: z.string().trim().min(1).max(20_000),
});
export type PageInput = z.infer<typeof pageSchema>;
