import { useQuery } from '@tanstack/react-query';
import { ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { cn } from 'cn';
import { Button } from '@/components/ui/button';
import { errorMessage } from '@/lib/errors';
import { modulesQuery, progressOf } from './useModules';

const progressStyle = {
  not_started: 'text-muted-foreground',
  draft: 'text-secondary-accent',
  shared: 'text-primary',
};

// The participant's home: the intro line, then their group's modules in
// order, each with where they stand.
export function ModuleListPage() {
  const { t } = useTranslation();
  const modules = useQuery(modulesQuery);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <h1 className="text-3xl font-semibold tracking-tight text-balance">
          {t('app.home.title')}
        </h1>
        <p className="text-lg leading-relaxed text-pretty text-text-secondary">
          {t('app.home.intro')}
        </p>
      </div>

      {modules.isPending && (
        <p className="text-text-secondary" role="status">
          {t('common.loading')}
        </p>
      )}
      {modules.isError && (
        <div className="flex flex-col items-start gap-3" role="alert">
          <p className="text-destructive">{errorMessage(modules.error)}</p>
          <Button
            variant="outline"
            className="h-10 rounded-full px-4"
            onClick={() => void modules.refetch()}
          >
            {t('common.retry')}
          </Button>
        </div>
      )}
      {modules.data?.length === 0 && (
        <p className="max-w-prose text-text-secondary">
          {t('writing.noModules')}
        </p>
      )}
      {modules.data && modules.data.length > 0 && (
        <ol className="flex flex-col gap-3">
          {modules.data.map((module, index) => {
            const progress = progressOf(module);
            return (
              <li key={module.id}>
                <Link
                  to={`modules/${module.id}`}
                  className="flex items-center gap-4 rounded-2xl border border-border px-4 py-4 outline-none transition-colors hover:bg-surface focus-visible:ring-3 focus-visible:ring-ring/50 md:px-5"
                >
                  <span className="w-6 shrink-0 text-right text-lg text-text-secondary tabular-nums">
                    {index + 1}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="text-lg font-medium text-balance">
                      {module.title}
                    </span>
                    <span className={cn('text-sm', progressStyle[progress])}>
                      {t(`writing.progress.${progress}`)}
                    </span>
                  </span>
                  <ChevronRight
                    className="size-5 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
