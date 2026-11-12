import { createBrowserRouter, Navigate, type RouteObject } from 'react-router';
import { PageLoading } from '@/components/PageLoading';
import { ChangePasswordPage } from '@/features/auth/ChangePasswordPage';
import { LoginPage } from '@/features/auth/LoginPage';
import { homeFor } from '@/features/auth/useSession';
import { WelcomePage } from '@/features/welcome/WelcomePage';
import type { Role } from '@/types/user';
import { AppShell } from './AppShell';
import { AreaError } from './AreaError';
import { RequireAuth } from './RequireAuth';

// One role's area: the guard, then the shell, then the area's own screens in
// a chunk that is downloaded on first visit. The firefly screen covers that
// download on a cold start; a crash inside lands on AreaError.
const area = (
  role: Role,
  load: () => Promise<{ Component: React.ComponentType }>,
): RouteObject => ({
  path: homeFor[role],
  element: <RequireAuth role={role} />,
  ErrorBoundary: AreaError,
  HydrateFallback: PageLoading,
  children: [
    {
      element: <AppShell role={role} />,
      // the splat alone does not match the bare area path; the index does
      children: [
        { index: true, lazy: load },
        { path: '*', lazy: load },
      ],
    },
  ],
});

export const router = createBrowserRouter([
  { path: '/', Component: WelcomePage },
  { path: '/login', Component: LoginPage },
  { path: '/change-password', Component: ChangePasswordPage },
  area('USER', () => import('./areas/participant')),
  area('PSYCHOLOGIST', () => import('./areas/psychologist')),
  area('ADMIN', () => import('./areas/admin')),
  { path: '*', element: <Navigate to="/" replace /> },
]);
