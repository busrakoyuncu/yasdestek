import { queryOptions, useQuery } from '@tanstack/vue-query';
import { api } from '@/lib/api';

export type ContentPage = {
  id: string;
  slug: string;
  content: string;
  updatedAt: string;
};

export const pageQuery = (slug: string) =>
  queryOptions({
    queryKey: ['pages', slug],
    queryFn: () => api.get<ContentPage>(`/pages/${slug}`),
  });

export const usePage = (slug: string) => useQuery(pageQuery(slug));
