import { Navigate, Outlet, useLocation } from 'react-router';
import { PageLoading } from '@/components/PageLoading';
import { homeFor, useSession } from '@/features/auth/useSession';
import type { Role } from '@/types/user';

// Layout route in front of one role's area. Decides once, from the session,
// whether the person may be here; the screens below it can assume a user.
// UX only: the api checks every permission again.
export function RequireAuth({ role }: { role: Role }) {
  const { user, isLoading } = useSession();
  const { pathname } = useLocation();

  if (isLoading) return <PageLoading />;
  if (!user) {
    return (
      <Navigate
        to={`/login?redirect=${encodeURIComponent(pathname)}`}
        replace
      />
    );
  }
  if (user.mustChangePassword)
    return <Navigate to="/change-password" replace />;
  if (user.role !== role) return <Navigate to={homeFor[user.role]} replace />;
  return <Outlet />;
}
