import { MutationCache, QueryCache, QueryClient } from '@tanstack/vue-query';
import { ApiError } from '@/lib/api';

// A 401 while signed in means the session ended (expired, deactivated,
// password reset elsewhere). Forget the user and go to the login page.
// The router is imported lazily: it depends on this client.
async function onSessionEnded(error: unknown) {
  if (!(error instanceof ApiError && error.status === 401)) return;
  if (queryClient.getQueryData(['session']) == null) return;
  queryClient.setQueryData(['session'], null);
  const { router } = await import('@/app/router');
  await router.replace({ name: 'login' });
}

// One client for the app and the router guard.
export const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
  queryCache: new QueryCache({ onError: onSessionEnded }),
  mutationCache: new MutationCache({ onError: onSessionEnded }),
});
