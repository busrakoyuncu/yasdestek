import {
  queryOptions,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import type { ResponseInput } from '@yasdestek/shared';
import { api, ApiError } from '@/lib/api';

export type MediaFile = {
  id: string;
  mimeType: string;
  size: number;
  createdAt: string;
};

export type MyResponse = {
  id: string;
  moduleId: string;
  text: string;
  published: boolean;
  createdAt: string;
  updatedAt: string;
  files: MediaFile[];
};

// The participant's own answer to one module. Nothing saved yet is a 404 on
// the api and `null` here: the screen then starts from an empty page.
export const myResponseQuery = (moduleId: string) =>
  queryOptions({
    queryKey: ['response', moduleId],
    queryFn: async (): Promise<MyResponse | null> => {
      try {
        return await api.get<MyResponse>(`/modules/${moduleId}/response`);
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) return null;
        throw error;
      }
    },
  });

// Saving creates on the first call and updates after. The answer is the new
// truth, so it goes straight into the cache; the module list is refetched
// because its state column changed.
export function useSaveResponse(moduleId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ResponseInput) =>
      api.put<MyResponse>(`/modules/${moduleId}/response`, input),
    onSuccess: (saved) => {
      queryClient.setQueryData(myResponseQuery(moduleId).queryKey, saved);
      void queryClient.invalidateQueries({ queryKey: ['modules'] });
    },
  });
}
