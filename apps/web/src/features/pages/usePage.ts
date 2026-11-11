import { queryOptions } from '@tanstack/react-query';
import { api } from '@/lib/api';

export type ContentPage = { slug: string; content: string; updatedAt: string };

// One editable platform page by slug. Read by every role; edited by admins.
export const pageQuery = (slug: string) =>
  queryOptions({
    queryKey: ['pages', slug],
    queryFn: () => api.get<ContentPage>(`/pages/${slug}`),
    staleTime: 5 * 60 * 1000,
  });
