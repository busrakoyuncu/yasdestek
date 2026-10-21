import { queryOptions, useMutation, useQuery } from '@tanstack/vue-query';
import type { CreateUserInput } from '@yasdestek/shared';
import { api } from '@/lib/api';
import { queryClient } from '@/lib/query';
import type { CurrentUser } from '@/types/user';

export type UserRow = Omit<CurrentUser, 'updatedAt'>;
export type CreatedUser = { user: UserRow; password: string };

// Accounts the signed-in admin or psychologist manages; the api scopes the list.
export const usersQuery = queryOptions({
  queryKey: ['users'],
  queryFn: () => api.get<UserRow[]>('/users'),
});

const refresh = () =>
  queryClient.invalidateQueries({ queryKey: usersQuery.queryKey });

export function useUsers() {
  const users = useQuery(usersQuery);

  const create = useMutation({
    mutationFn: (input: CreateUserInput) =>
      api.post<CreatedUser>('/users', input),
    onSuccess: refresh,
  });
  const activate = useMutation({
    mutationFn: (id: string) => api.post<void>(`/users/${id}/activate`),
    onSuccess: refresh,
  });
  const deactivate = useMutation({
    mutationFn: (id: string) => api.post<void>(`/users/${id}/deactivate`),
    onSuccess: refresh,
  });
  const resetPassword = useMutation({
    mutationFn: (id: string) =>
      api.post<{ password: string }>(`/users/${id}/reset-password`),
    onSuccess: refresh,
  });

  return { users, create, activate, deactivate, resetPassword };
}
