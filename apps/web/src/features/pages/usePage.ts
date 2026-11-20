import {
  queryOptions,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import type { PageInput } from '@yasdestek/shared';
import { api } from '@/lib/api';

// `locale` is the language that came back: the one asked for, or Turkish
// while that translation is missing.
export type ContentPage = {
  slug: string;
  locale: string;
  content: string;
  updatedAt: string;
};

// One editable platform page by slug, in the interface language. Read by
// every role; edited by admins. A language switch asks again.
export const pageQuery = (slug: string, locale: string) =>
  queryOptions({
    queryKey: ['pages', slug, locale],
    queryFn: () => api.get<ContentPage>(`/pages/${slug}?locale=${locale}`),
    staleTime: 5 * 60 * 1000,
  });

// An admin saves one language of a page. Every cached language of it is
// refetched, since a missing translation is served from the Turkish text.
export function useSavePage(slug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ locale, content }: { locale: string; content: string }) =>
      api.put<void>(`/pages/${slug}?locale=${locale}`, {
        content,
      } satisfies PageInput),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['pages', slug] }),
  });
}
