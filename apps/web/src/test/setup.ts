import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/vue';
import { afterEach, beforeEach } from 'vitest';
import { setLocale } from '@/lib/i18n';
import { queryClient } from '@/lib/query';

// jsdom reports English; tests assert the Turkish default. No automatic
// retries, so a failed request stays failed until the test retries it.
beforeEach(() => {
  setLocale('tr');
  queryClient.setDefaultOptions({
    queries: { retry: false },
    mutations: { retry: false },
  });
});
// Without vitest globals, Testing Library does not unmount between tests on its own.
afterEach(cleanup);
