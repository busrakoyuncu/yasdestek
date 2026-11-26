import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, Plus } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router';
import { cn } from 'cn';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { errorMessage } from '@/lib/errors';
import { toastError, toastSuccess } from '@/lib/toast';
import { useSession } from '@/features/auth/useSession';
import { ModuleForm } from './ModuleForm';
import { ModuleView } from './ModuleView';
import {
  moduleSource,
  modulesQuery,
  permissionsOf,
  useModuleActions,
  type Module,
} from './useModules';

// Every module the caller may see, in the order participants get them: a
// list, and the chosen module beside it on a wide screen or as its own
// screen on a phone, shown the way participants meet it. Each module has its
// own address, .../modules/:moduleId; its form is at .../:moduleId/edit and
// a new module's at .../new, in the same place beside the list.
export function ModulesPage({ mode }: { mode?: 'new' | 'edit' }) {
  const { t } = useTranslation();
  const { user } = useSession();
  const { moduleId } = useParams();
  const navigate = useNavigate();
  const modules = useQuery(modulesQuery);
  const { remove } = useModuleActions();
  const [pending, setPending] = useState<Module | null>(null);

  const admin = user?.role === 'ADMIN';
  const base = admin ? '/admin/modules' : '/psychologist/modules';
  const creating = mode === 'new';
  // With no module in the address a wide screen opens the first one; a phone
  // shows only the list.
  const open = creating
    ? undefined
    : moduleId
      ? modules.data?.find((m) => m.id === moduleId)
      : modules.data?.[0];
  const editing =
    mode === 'edit' && open && permissionsOf(open, admin).mayEdit
      ? open
      : undefined;
  // the right side is the screen on a phone: a module, its form or a new one
  const detail = Boolean(moduleId) || creating;
  const pendingShared = pending ? permissionsOf(pending, admin).shared : false;

  const confirmDelete = () => {
    if (!pending) return;
    const module = pending;
    setPending(null);
    remove.mutate(module.id, {
      onSuccess: () => {
        toastSuccess(
          t(pendingShared ? 'modules.hide.done' : 'modules.remove.done'),
        );
        void navigate(base);
      },
      onError: toastError,
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="title-page">{t('nav.modules')}</h1>
        <Button asChild className="h-10 rounded-full px-4">
          <Link to={`${base}/new`}>
            <Plus className="size-4" aria-hidden="true" />
            {t('modules.new')}
          </Link>
        </Button>
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
      {modules.data?.length === 0 && !creating && (
        <p className="text-text-secondary">{t('modules.empty')}</p>
      )}

      {modules.data && (modules.data.length > 0 || creating) && (
        <div className="grid gap-8 md:grid-cols-[17rem_minmax(0,1fr)] lg:gap-12">
          <nav
            aria-label={t('nav.modules')}
            className={cn(detail && 'hidden md:block')}
          >
            {/* the hover fill reaches past the text, so the names line up
                with the title */}
            <ol className="-mx-3 flex flex-col gap-0.5">
              {modules.data.map((module, index) => {
                const current = module.id === open?.id;
                return (
                  <li key={module.id}>
                    <Link
                      to={`${base}/${module.id}`}
                      aria-current={current && moduleId ? 'page' : undefined}
                      className={cn(
                        'grid grid-cols-[1.25rem_minmax(0,1fr)] gap-x-2 rounded-lg px-3 py-2.5 outline-none transition-colors hover:bg-foreground/5 focus-visible:ring-3 focus-visible:ring-ring/50',
                        // the first module is open on a wide screen even
                        // before it is in the address
                        current && 'md:bg-foreground/7',
                        current && moduleId && 'bg-foreground/7',
                      )}
                    >
                      <span className="text-right text-muted-foreground tabular-nums">
                        {index + 1}
                      </span>
                      <span
                        className={cn(
                          'text-pretty',
                          current && 'md:font-medium',
                        )}
                      >
                        {module.title}
                      </span>
                      <span className="col-start-2 text-sm text-muted-foreground">
                        {moduleSource(t, module, admin)} ·{' '}
                        {t('modules.questions', {
                          count: module.questions.length,
                        })}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          </nav>

          <div className={cn('min-w-0', !detail && 'hidden md:block')}>
            {detail && (
              <Link
                to={base}
                className="mb-4 inline-flex items-center gap-1 text-text-secondary hover:text-foreground md:hidden"
              >
                <ChevronLeft className="size-4" aria-hidden="true" />
                {t('modules.all')}
              </Link>
            )}
            {creating ? (
              <ModuleForm
                onSaved={(saved) => void navigate(`${base}/${saved.id}`)}
                onCancel={() => void navigate(base)}
              />
            ) : editing ? (
              <ModuleForm
                key={editing.id}
                module={editing}
                shared={permissionsOf(editing, admin).shared}
                // a shared module saves as the counselor's own copy, with
                // its own id: open whichever came back
                onSaved={(saved) => void navigate(`${base}/${saved.id}`)}
                onCancel={() => void navigate(`${base}/${editing.id}`)}
              />
            ) : open ? (
              <ModuleView
                key={open.id}
                module={open}
                admin={admin}
                editPath={`${base}/${open.id}/edit`}
                onDelete={() => setPending(open)}
              />
            ) : (
              <p className="text-text-secondary">{t('modules.notFound')}</p>
            )}
          </div>
        </div>
      )}

      <AlertDialog
        open={pending !== null}
        onOpenChange={(open) => !open && setPending(null)}
      >
        {pending && (
          <AlertDialogContent className="rounded-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle>
                {t(
                  pendingShared ? 'modules.hide.title' : 'modules.remove.title',
                  { title: pending.title },
                )}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {t(pendingShared ? 'modules.hide.body' : 'modules.remove.body')}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="h-10 rounded-full px-4">
                {t('common.cancel')}
              </AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                className="h-10 rounded-full px-4"
                onClick={confirmDelete}
              >
                {t(
                  pendingShared
                    ? 'modules.hide.confirm'
                    : 'modules.remove.confirm',
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        )}
      </AlertDialog>
    </div>
  );
}
