import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FILE_RULES, fileKind, type FileKind } from '@yasdestek/shared';
import { api } from '@/lib/api';
import {
  myResponseQuery,
  type MediaFile,
  type MyResponse,
} from './useMyResponse';

// Where a saved file is served from. Same origin, session cookie, byte
// ranges: an <audio> or <img> can point at it directly.
export const fileUrl = (id: string) =>
  `${import.meta.env.VITE_API_URL}/files/${id}`;

export const kindOf = (file: MediaFile): FileKind | null =>
  fileKind(file.mimeType);

// The shared rules, checked before anything leaves the phone. Returns the
// error code the api would answer with, or null when the file may go.
export function checkFile(
  file: Blob,
): 'UNSUPPORTED_FILE_TYPE' | 'FILE_TOO_LARGE' | null {
  const kind = fileKind(file.type);
  if (!kind) return 'UNSUPPORTED_FILE_TYPE';
  if (file.size > FILE_RULES[kind].maxBytes) return 'FILE_TOO_LARGE';
  return null;
}

export const acceptImages = FILE_RULES.image.mimeTypes.join(',');

// Uploading creates the draft response if there is none yet, so the response
// in the cache is refreshed from the api rather than patched; the module list
// follows because the module's state may have changed.
export function useFileActions(moduleId: string) {
  const queryClient = useQueryClient();
  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({
        queryKey: myResponseQuery(moduleId).queryKey,
      }),
      queryClient.invalidateQueries({ queryKey: ['modules'] }),
    ]);

  const upload = useMutation({
    mutationFn: ({ blob, name }: { blob: Blob; name: string }) => {
      const form = new FormData();
      form.append('moduleId', moduleId);
      form.append('file', blob, name);
      return api.post<MediaFile>('/files', form);
    },
    onSuccess: refresh,
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete<void>(`/files/${id}`),
    onSuccess: (_, id) => {
      queryClient.setQueryData<MyResponse | null>(
        myResponseQuery(moduleId).queryKey,
        (current) =>
          current && {
            ...current,
            files: current.files.filter((f) => f.id !== id),
          },
      );
    },
  });

  return { upload, remove };
}
