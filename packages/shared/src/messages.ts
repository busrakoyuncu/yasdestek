import { z } from 'zod';

// A private message between a participant and their psychologist.
// Participants never name a recipient: it is always their psychologist.
// Psychologists name one of their own participants.
export const sendMessageSchema = z.object({
  recipientId: z.uuid().optional(),
  body: z.string().trim().min(1).max(5000),
});
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
