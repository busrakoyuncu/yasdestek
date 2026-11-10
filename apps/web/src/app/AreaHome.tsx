import { useTranslation } from 'react-i18next';
import { Navigate, useLocation } from 'react-router';
import { useSession } from '@/features/auth/useSession';

// Stand-in for every signed-in screen until the role areas exist.
// Not signed in: back to login, remembering where the person wanted to go.
export function AreaHome() {
  const { t } = useTranslation();
  const { user, isLoading } = useSession();
  const { pathname } = useLocation();

  if (isLoading) return null;
  if (!user) {
    return (
      <Navigate
        to={`/login?redirect=${encodeURIComponent(pathname)}`}
        replace
      />
    );
  }

  return (
    <main className="mx-auto flex min-h-svh max-w-2xl flex-col justify-center gap-3 px-6">
      <h1 className="text-3xl font-medium">
        {t('area.welcome', { name: user.username })}
      </h1>
      <p className="text-muted-foreground">{t('area.comingSoon')}</p>
    </main>
  );
}
