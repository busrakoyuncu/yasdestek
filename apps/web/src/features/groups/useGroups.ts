import {
  queryOptions,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import type { GroupInput } from '@yasdestek/shared';
import { api } from '@/lib/api';

// A group as the api lists it: members and assigned modules ride along.
export type Group = {
  id: string;
  name: string;
  psychologistId: string;
  createdAt: string;
  members: { id: string; username: string; active: boolean }[];
  modules: { module: { id: string; title: string; order: number } }[];
};

// The caller's groups (a counselor's own; an admin sees all).
export const groupsQuery = queryOptions({
  queryKey: ['groups'],
  queryFn: () => api.get<Group[]>('/groups'),
});

// Every change to a group, its members or its modules refetches the list.
// Adding or removing a member also moves a participant, so the people list
// is refetched too.
export function useGroupActions() {
  const queryClient = useQueryClient();
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: groupsQuery.queryKey });
  const refreshPeople = () =>
    Promise.all([
      refresh(),
      queryClient.invalidateQueries({ queryKey: ['users'] }),
    ]);

  const create = useMutation({
    mutationFn: (input: GroupInput) => api.post<Group>('/groups', input),
    onSuccess: refresh,
  });
  const rename = useMutation({
    mutationFn: ({ id, ...input }: GroupInput & { id: string }) =>
      api.patch<Group>(`/groups/${id}`, input),
    onSuccess: refresh,
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.delete<void>(`/groups/${id}`),
    onSuccess: refreshPeople,
  });
  const addMember = useMutation({
    mutationFn: ({ groupId, userId }: { groupId: string; userId: string }) =>
      api.post<void>(`/groups/${groupId}/members`, { userId }),
    onSuccess: refreshPeople,
  });
  const removeMember = useMutation({
    mutationFn: ({ groupId, userId }: { groupId: string; userId: string }) =>
      api.delete<void>(`/groups/${groupId}/members/${userId}`),
    onSuccess: refreshPeople,
  });
  const assign = useMutation({
    mutationFn: ({
      groupId,
      moduleId,
    }: {
      groupId: string;
      moduleId: string;
    }) => api.post<void>(`/groups/${groupId}/modules`, { moduleId }),
    onSuccess: refresh,
  });
  const unassign = useMutation({
    mutationFn: ({
      groupId,
      moduleId,
    }: {
      groupId: string;
      moduleId: string;
    }) => api.delete<void>(`/groups/${groupId}/modules/${moduleId}`),
    onSuccess: refresh,
  });

  return { create, rename, remove, addMember, removeMember, assign, unassign };
}
