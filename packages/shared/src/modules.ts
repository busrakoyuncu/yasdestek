import { z } from 'zod';

// A module is a prompt: title, welcome text, rules (required), guided questions.
export const moduleSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().min(1),
  rules: z.string().trim().min(1),
  questions: z.array(z.string().trim().min(1)).min(1).max(20),
  // Position in the participant's list. Defaults to the end when omitted.
  order: z.number().int().min(0).optional(),
});
export type ModuleInput = z.infer<typeof moduleSchema>;

export const updateModuleSchema = moduleSchema.partial();
export type UpdateModuleInput = z.infer<typeof updateModuleSchema>;

export const assignModuleSchema = z.object({
  moduleId: z.uuid(),
});
export type AssignModuleInput = z.infer<typeof assignModuleSchema>;
