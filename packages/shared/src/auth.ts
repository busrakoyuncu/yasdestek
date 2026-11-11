import { z } from 'zod';

export const loginSchema = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(1),
});
export type LoginInput = z.infer<typeof loginSchema>;

// Unicode letter classes, so Turkish and German letters count as well.
const hasBothCases = (value: string) =>
  /\p{Lu}/u.test(value) && /\p{Ll}/u.test(value);

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z
    .string()
    .min(8)
    .max(128)
    // `params.key` names the translation the web shows for this rule
    .refine(hasBothCases, { params: { key: 'passwordCase' } }),
});
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
