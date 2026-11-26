import {
  queryOptions,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import type { ModuleInput, UpdateModuleInput } from '@yasdestek/shared';
import type { TFunction } from 'i18next';
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
  // what a response may carry besides text
  allowImages: boolean;
  allowAudio: boolean;
  createdById: string | null;
  createdBy: { username: string; role: Role } | null;
  // a participant's own response state, only in a participant's list
  responses?: { published: boolean; updatedAt: string }[];
  createdAt: string;
  updatedAt: string;
};

// Where a participant stands with a module, from the list's response state.
export type Progress = 'not_started' | 'draft' | 'shared';
export const progressOf = (module: Module): Progress => {
  const mine = module.responses?.[0];
  if (!mine) return 'not_started';
  return mine.published ? 'shared' : 'draft';
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

// Where a module comes from, in words: "Temel", "Genel", "Kendi modülüm".
// The admin sees a counselor's module by who made it.
export function moduleSource(t: TFunction, module: Module, admin: boolean) {
  const scope = scopeOf(module);
  if (admin && scope === 'own' && module.createdBy) {
    return t('modules.by', { name: module.createdBy.username });
  }
  return t(`modules.scope.${scope}`);
}

// What the caller may do with a module. The admin owns the global ones and
// edits them for everyone; base modules are never deleted. A counselor may
// change every module they see: editing a shared one makes their own copy,
// deleting it hides it for them only.
export function permissionsOf(module: Module, admin: boolean) {
  const mayEdit = !admin || scopeOf(module) !== 'own';
  return {
    mayEdit,
    mayDelete: !admin || (mayEdit && !module.isBase),
    // for a counselor, a module that belongs to everyone, not to them
    shared: !admin && scopeOf(module) !== 'own',
  };
}

// Every module the caller may see, in participant order. The api scopes it.
export const modulesQuery = queryOptions({
  queryKey: ['modules'],
  queryFn: () => api.get<Module[]>('/modules'),
});

export const moduleQuery = (id: string) =>
  queryOptions({
    queryKey: ['modules', id],
    queryFn: () => api.get<Module>(`/modules/${id}`),
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
