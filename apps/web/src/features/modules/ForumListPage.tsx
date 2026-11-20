import { useQuery } from '@tanstack/react-query';
import { ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { errorMessage } from '@/lib/errors';
import { modulesQuery } from './useModules';

// "Forumlar": one forum per assigned module, in module order. On a phone this
// is where the tab leads; on a desktop the sidebar lists the same links.
export function ForumListPage() {
  const { t } = useTranslation();
  const modules = useQuery(modulesQuery);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
      <div className="flex flex-col gap-3">
        <h1 className="text-3xl font-semibold tracking-tight text-balance">
          {t('forum.listTitle')}
        </h1>
        <p className="text-lg leading-relaxed text-pretty text-text-secondary">
          {t('forum.intro')}
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
          {modules.data.map((module) => (
            <li key={module.id}>
              <Link
                to={`/app/forums/${module.id}`}
                className="flex items-center gap-4 rounded-2xl border border-border px-4 py-4 outline-none transition-colors hover:bg-surface focus-visible:ring-3 focus-visible:ring-ring/50 md:px-5"
              >
                <span className="min-w-0 flex-1 text-lg font-medium text-balance">
                  {module.title}
                </span>
                <ChevronRight
                  className="size-5 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
              </Link>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
