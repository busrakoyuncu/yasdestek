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

// The participant's home: the forest clearing from the welcome page, the
// intro line, then their group's modules in order, each with where they
// stand.
export function ModuleListPage() {
  const { t } = useTranslation();
  const modules = useQuery(modulesQuery);

  return (
    <div className="flex flex-col">
      {/* The welcome page's forest, carried in as a band that fades into
          the page, so the app feels like the same place. Decoration only. */}
      <img
        src="/forest-1280.jpg"
        srcSet="/forest-1280.jpg 1280w, /forest-2752.jpg 2752w"
        sizes="100vw"
        alt=""
        aria-hidden="true"
        className="-mx-4 -mt-6 h-40 w-[calc(100%+2rem)] max-w-none object-cover object-[center_38%] opacity-70 dark:opacity-100 [mask-image:linear-gradient(to_bottom,black_35%,transparent)] md:-mx-8 md:h-60 md:w-[calc(100%+4rem)]"
      />
      <div className="mx-auto -mt-4 flex w-full max-w-2xl flex-col gap-10 md:-mt-8">
        <div className="flex flex-col gap-4">
          <h1 className="title-page">{t('app.home.title')}</h1>
          <p className="max-w-prose text-lg leading-relaxed text-pretty text-text-secondary">
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
          <ol className="flex flex-col border-t border-border">
            {modules.data.map((module) => {
              const progress = progressOf(module);
              return (
                <li key={module.id} className="border-b border-border">
                  {/* rows split by a line, not boxes; no separate number:
                    module titles carry their own */}
                  <Link
                    to={`modules/${module.id}`}
                    className="group flex items-center gap-4 rounded-lg py-5 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    <span className="flex min-w-0 flex-1 flex-col gap-1">
                      <span className="text-xl tracking-[-0.01em] text-balance">
                        {module.title}
                      </span>
                      <span className={cn('text-sm', progressStyle[progress])}>
                        {t(`writing.progress.${progress}`)}
                      </span>
                    </span>
                    <ChevronRight
                      className="size-5 shrink-0 text-muted-foreground transition-transform duration-200 ease-out group-hover:translate-x-1 group-hover:text-foreground motion-reduce:transition-none"
                      aria-hidden="true"
                    />
                  </Link>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}
