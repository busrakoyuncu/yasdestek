import { queryOptions } from '@tanstack/react-query';
import { api } from '@/lib/api';

type Group = { id: string; name: string };

// Every counselor with their participants, as GET /analytics/psychologists
// lists them. Admin only.
export type CounselorOverview = {
  id: string;
  username: string;
  active: boolean;
  users: {
    id: string;
    username: string;
    active: boolean;
    group: Group | null;
  }[];
};

// Published response = completed, a draft = in progress, nothing = not started.
export type ModuleStatus = 'not_started' | 'in_progress' | 'completed';

export type ParticipantProgress = {
  id: string;
  username: string;
  group: Group | null;
  modules: { id: string; title: string; order: number; status: ModuleStatus }[];
};

export const counselorsOverviewQuery = queryOptions({
  queryKey: ['analytics', 'psychologists'],
  queryFn: () => api.get<CounselorOverview[]>('/analytics/psychologists'),
});

export const participantProgressQuery = (id: string) =>
  queryOptions({
    queryKey: ['analytics', 'users', id],
    queryFn: () => api.get<ParticipantProgress>(`/analytics/users/${id}`),
  });
