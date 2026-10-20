import { z } from 'zod';

// A comment under a group mate's response. Single level: no replies to comments.
export const commentSchema = z.object({
  text: z.string().trim().min(1).max(5000),
});
export type CommentInput = z.infer<typeof commentSchema>;
