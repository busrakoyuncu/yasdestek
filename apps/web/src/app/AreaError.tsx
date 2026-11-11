import { useTranslation } from 'react-i18next';
import { useRouteError } from 'react-router';
import { Button } from '@/components/ui/button';
import { errorMessage } from '@/lib/errors';

// Catches a crash anywhere inside one role's area. A reload is the retry: the
// home-screen app has no browser chrome, so the screen must offer one itself.
export function AreaError() {
  const { t } = useTranslation();
  const error = useRouteError();
  return (
    <main className="grid min-h-svh place-content-center gap-4 bg-background px-6 text-center text-foreground">
      <h1 className="text-2xl font-semibold tracking-tight">
        {t('errors.crashTitle')}
      </h1>
      <p className="max-w-md text-text-secondary">{errorMessage(error)}</p>
      <Button
        className="mx-auto h-11 rounded-full px-6 text-base"
        onClick={() => window.location.reload()}
      >
        {t('common.retry')}
      </Button>
    </main>
  );
}
