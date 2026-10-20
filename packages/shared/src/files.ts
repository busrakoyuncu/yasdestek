import { z } from 'zod';

const MB = 1024 * 1024;

// What a response may carry. Browsers record audio as webm/opus (Chrome,
// Firefox) or mp4/aac (Safari). Checked on both sides: before upload and on the api.
export const FILE_RULES = {
  image: {
    maxBytes: 10 * MB,
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/heic'],
  },
  audio: {
    maxBytes: 50 * MB,
    mimeTypes: ['audio/webm', 'audio/mp4', 'audio/aac'],
  },
} as const;

export type FileKind = keyof typeof FILE_RULES;

export const MAX_UPLOAD_BYTES = Math.max(
  ...Object.values(FILE_RULES).map((rule) => rule.maxBytes),
);

// "audio/webm;codecs=opus" -> audio
export function fileKind(mimeType: string): FileKind | null {
  const base = mimeType.split(';')[0].trim().toLowerCase();
  for (const kind of Object.keys(FILE_RULES) as FileKind[]) {
    if ((FILE_RULES[kind].mimeTypes as readonly string[]).includes(base)) {
      return kind;
    }
  }
  return null;
}

export const uploadFileSchema = z.object({
  moduleId: z.uuid(),
});
export type UploadFileInput = z.infer<typeof uploadFileSchema>;
