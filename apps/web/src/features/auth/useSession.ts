import { queryOptions, useMutation, useQuery } from '@tanstack/react-query';
import type { ChangePasswordInput, LoginInput } from '@yasdestek/shared';
import { api, ApiError } from '@/lib/api';
import { queryClient } from '@/lib/query';
import type { CurrentUser, Role } from '@/types/user';

// The signed-in user, or null. Fetched once per page load; login updates it
// in place instead of refetching.
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

  // The api answers 204, so the cached user is updated by hand: the forced
  // change is done, everything else about them is unchanged.
  const changePassword = useMutation({
    mutationFn: (input: ChangePasswordInput) =>
      api.post<void>('/auth/change-password', input),
    onSuccess: () => {
      const user = queryClient.getQueryData(sessionQuery.queryKey);
      if (user) setUser({ ...user, mustChangePassword: false });
    },
  });

  // Ends the session on the server, then forgets the user here. Other queries
  // are dropped too, so nothing from this person survives into the next sign-in.
  const logout = useMutation({
    mutationFn: () => api.post<void>('/auth/logout'),
    onSuccess: () => {
      queryClient.clear();
      setUser(null);
    },
  });

  return {
    user: session.data,
    isLoading: session.isPending,
    login,
    changePassword,
    logout,
  };
}
