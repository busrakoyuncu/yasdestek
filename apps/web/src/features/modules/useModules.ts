import {
  queryOptions,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import type { ModuleInput, UpdateModuleInput } from '@yasdestek/shared';
import { api } from '@/lib/api';
import type { Role } from '@/types/user';

// A module as the api lists it, with its creator for the scope label.
export type Module = {
  id: string;
  title: string;
  description: string;
  rules: string;
  questions: string[];
  order: number;
  isBase: boolean;
  createdById: string | null;
  createdBy: { username: string; role: Role } | null;
  createdAt: string;
  updatedAt: string;
};

// Where a module comes from: seeded with the platform, made by an admin for
// everyone, or made by a psychologist for their own participants.
export type Scope = 'base' | 'global' | 'own';
export const scopeOf = (module: Module): Scope =>
  module.isBase
    ? 'base'
    : module.createdBy?.role === 'PSYCHOLOGIST'
      ? 'own'
      : 'global';

// Every module the caller may see, in participant order. The api scopes it.
export const modulesQuery = queryOptions({
  queryKey: ['modules'],
  queryFn: () => api.get<Module[]>('/modules'),
});

export function useModuleActions() {
  const queryClient = useQueryClient();
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: modulesQuery.queryKey });

  const create = useMutation({
    mutationFn: (input: ModuleInput) => api.post<Module>('/modules', input),
    onSuccess: refresh,
  });
  const update = useMutation({
    mutationFn: ({ id, ...input }: UpdateModuleInput & { id: string }) =>
      api.patch<Module>(`/modules/${id}`, input),
    onSuccess: refresh,
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.delete<void>(`/modules/${id}`),
    onSuccess: refresh,
  });

  return { create, update, remove };
}
