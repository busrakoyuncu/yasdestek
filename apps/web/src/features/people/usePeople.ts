import {
  queryOptions,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import type { CreateUserInput } from '@yasdestek/shared';
import { api } from '@/lib/api';
import type { CurrentUser } from '@/types/user';

// An account as the api lists it: the User row without the password hash.
export type Person = CurrentUser;

// Everyone the caller manages: an admin sees psychologists and participants,
// a psychologist sees their own participants. The api decides; the screens
// only filter by role.
export const peopleQuery = queryOptions({
  queryKey: ['users'],
  queryFn: () => api.get<Person[]>('/users'),
});

// The four account actions. Each one changes the list, so each one refetches
// it rather than patching the cache by hand.
export function usePeopleActions() {
  const queryClient = useQueryClient();
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: peopleQuery.queryKey });

  const create = useMutation({
    mutationFn: (input: CreateUserInput) =>
      api.post<{ user: Person; password: string }>('/users', input),
    onSuccess: refresh,
  });
  const setActive = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      api.post<void>(`/users/${id}/${active ? 'activate' : 'deactivate'}`),
    onSuccess: refresh,
  });
  const resetPassword = useMutation({
    mutationFn: (id: string) =>
      api.post<{ password: string }>(`/users/${id}/reset-password`),
    onSuccess: refresh,
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.delete<void>(`/users/${id}`),
    onSuccess: refresh,
  });

  return { create, setActive, resetPassword, remove };
}
