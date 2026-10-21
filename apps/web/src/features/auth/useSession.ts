import { queryOptions, useMutation, useQuery } from '@tanstack/vue-query';
import type { ChangePasswordInput, LoginInput } from '@yasdestek/shared';
import { api, ApiError } from '@/lib/api';
import { queryClient } from '@/lib/query';
import type { CurrentUser, Role } from '@/types/user';

// The signed-in user, or null. Fetched once per page load; login, logout,
// and password change update it in place instead of refetching.
export const sessionQuery = queryOptions({
  queryKey: ['session'],
  queryFn: async (): Promise<CurrentUser | null> => {
    try {
      return await api.get<CurrentUser>('/auth/me');
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) return null;
      throw error;
    }
  },
  staleTime: Infinity,
  retry: false,
});

export const homeFor: Record<Role, string> = {
  ADMIN: '/admin',
  PSYCHOLOGIST: '/psychologist',
  USER: '/app',
};

const setUser = (user: CurrentUser | null) =>
  queryClient.setQueryData(sessionQuery.queryKey, user);

export function useSession() {
  const session = useQuery(sessionQuery);

  const login = useMutation({
    mutationFn: (input: LoginInput) =>
      api.post<CurrentUser>('/auth/login', input),
    onSuccess: setUser,
  });

  const logout = useMutation({
    mutationFn: () => api.post<void>('/auth/logout'),
    onSettled: () => setUser(null),
  });

  const changePassword = useMutation({
    mutationFn: (input: ChangePasswordInput) =>
      api.post<void>('/auth/change-password', input),
    onSuccess: () => {
      const user = session.data.value;
      if (user) setUser({ ...user, mustChangePassword: false });
    },
  });

  return { user: session.data, login, logout, changePassword };
}
