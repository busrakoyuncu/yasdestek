import { z } from 'zod';

export const groupSchema = z.object({
  name: z.string().trim().min(1).max(80),
});
export type GroupInput = z.infer<typeof groupSchema>;

export const addMemberSchema = z.object({
  userId: z.uuid(),
});
export type AddMemberInput = z.infer<typeof addMemberSchema>;
