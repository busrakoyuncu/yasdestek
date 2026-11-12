import { z } from 'zod';

// Login handle, chosen by the creator. Lowercase ascii keeps it typeable on phones.
export const usernameSchema = z
  .string()
  .trim()
  .min(3)
  .max(32)
  // `params.key` names the translation the web shows for this rule
  .refine((value) => /^[a-z0-9._-]+$/.test(value), {
    params: { key: 'username' },
  });

export const createUserSchema = z.object({
  role: z.enum(['PSYCHOLOGIST', 'USER']),
  username: usernameSchema,
  // Required when an admin creates a participant; ignored for psychologists.
  psychologistId: z.uuid().optional(),
});
export type CreateUserInput = z.infer<typeof createUserSchema>;
