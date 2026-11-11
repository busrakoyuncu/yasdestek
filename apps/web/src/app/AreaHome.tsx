import { useTranslation } from 'react-i18next';
import { Navigate, useLocation } from 'react-router';
import { useSession } from '@/features/auth/useSession';
import { PageLoading } from '@/components/PageLoading';

// Stand-in for every signed-in screen until the role areas exist.
// Not signed in: back to login, remembering where the person wanted to go.
export function AreaHome() {
  const { t } = useTranslation();
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
  // The handed-out password has to go before anything else loads.
  if (user.mustChangePassword)
    return <Navigate to="/change-password" replace />;

  // Night-themed like the pages before it, so sign-in does not end in a flash of cream.
  return (
    <main className="dark flex min-h-svh flex-col justify-center bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-3 px-6">
        <h1 className="text-3xl font-medium text-glow">
          {t('area.welcome', { name: user.username })}
        </h1>
        <p className="text-text-secondary">{t('area.comingSoon')}</p>
      </div>
    </main>
  );
}
