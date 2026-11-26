import { queryOptions } from '@tanstack/react-query';
import { api } from '@/lib/api';

// Published response = completed, a draft = in progress, nothing = not started.
export type ModuleStatus = 'not_started' | 'in_progress' | 'completed';

// Every counselor with their participants, as GET /analytics/psychologists
// lists them: each participant with their group and a status per module of
// it, in module order. Admin only.
export type CounselorOverview = {
  id: string;
  username: string;
  active: boolean;
  users: {
    id: string;
    username: string;
    active: boolean;
    group: { id: string; name: string } | null;
    modules: {
      id: string;
      title: string;
      order: number;
      status: ModuleStatus;
    }[];
  }[];
};

export const counselorsOverviewQuery = queryOptions({
  queryKey: ['analytics', 'psychologists'],
  queryFn: () => api.get<CounselorOverview[]>('/analytics/psychologists'),
});
