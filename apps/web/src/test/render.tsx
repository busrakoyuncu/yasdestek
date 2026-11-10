import { QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { queryClient } from '@/lib/query';

// Mounts an element at `path` with the same providers the app uses, inside a
// memory router with a catch-all route so navigation can be asserted.
export function renderApp(element: ReactNode, path = '/') {
  queryClient.clear();
  const router = createMemoryRouter(
    [
      { path, element },
      { path: '*', element: null },
    ],
    { initialEntries: [path] },
  );
  const result = render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return { ...result, router };
}
