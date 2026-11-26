import {
  queryOptions,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import type { GroupInput } from '@yasdestek/shared';
import type { TFunction } from 'i18next';
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

// "3 kişi, 2 modül", or "Henüz boş" for a group with neither.
export function groupSummary(t: TFunction, group: Group) {
  if (group.members.length === 0 && group.modules.length === 0) {
    return t('groups.blank');
  }
  return t('groups.summary', {
    people: t('people.board.members', { count: group.members.length }),
    modules: t('groups.moduleCount', { count: group.modules.length }),
  });
}

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
