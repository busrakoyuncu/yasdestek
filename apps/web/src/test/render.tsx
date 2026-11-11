import { QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import type { ReactNode } from 'react';
import {
  createMemoryRouter,
  RouterProvider,
  type RouteObject,
} from 'react-router';
import { queryClient } from '@/lib/query';

// Mounts an element at `path` with the same providers the app uses, inside a
// memory router with a catch-all route so navigation can be asserted.
// `children` nest under the element, for layout routes that render an Outlet.
export function renderApp(
  element: ReactNode,
  path = '/',
  children?: RouteObject[],
) {
  queryClient.clear();
  const router = createMemoryRouter(
    [
      { path, element, children },
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
