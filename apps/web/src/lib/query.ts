import { QueryClient } from '@tanstack/vue-query';

// One client for the app and the router guard.
export const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});
