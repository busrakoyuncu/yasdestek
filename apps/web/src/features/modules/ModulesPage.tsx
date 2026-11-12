import { useQuery } from '@tanstack/react-query';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { errorMessage } from '@/lib/errors';
import { toastError, toastSuccess } from '@/lib/toast';
import { useSession } from '@/features/auth/useSession';
import { ModuleFormDialog } from './ModuleFormDialog';
import {
  modulesQuery,
  scopeOf,
  useModuleActions,
  type Module,
} from './useModules';

const scopeStyle = {
  base: 'border-primary/40 text-primary',
  global: 'border-border text-text-secondary',
  own: 'border-secondary-accent/60 text-secondary-accent',
};

// Every module the caller may see, in the order participants get them. The
// admin owns the global ones, a counselor owns their own; base modules can be
// edited by the admin but never deleted.
export function ModulesPage() {
  const { t } = useTranslation();
  const { user } = useSession();
  const modules = useQuery(modulesQuery);
  const { remove } = useModuleActions();
  const [pending, setPending] = useState<Module | null>(null);

  const admin = user?.role === 'ADMIN';
  const mayEdit = (m: Module) =>
    admin ? scopeOf(m) !== 'own' : scopeOf(m) === 'own';
  const mayDelete = (m: Module) => mayEdit(m) && !m.isBase;

  const confirmDelete = () => {
    if (!pending) return;
    const module = pending;
    setPending(null);
    remove.mutate(module.id, {
      onSuccess: () => toastSuccess(t('modules.remove.done')),
      onError: toastError,
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">
          {t('nav.modules')}
        </h1>
        <ModuleFormDialog
          trigger={
            <Button className="h-10 rounded-full px-4">
              <Plus className="size-4" aria-hidden="true" />
              {t('modules.new')}
            </Button>
          }
        />
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
        <p className="text-text-secondary">{t('modules.empty')}</p>
      )}
      {modules.data && modules.data.length > 0 && (
        <ol className="divide-y divide-border rounded-2xl border border-border">
          {modules.data.map((module, index) => {
            const scope = scopeOf(module);
            return (
              <li
                key={module.id}
                className="flex items-start gap-4 px-4 py-4 md:px-5"
              >
                <span className="w-6 shrink-0 pt-0.5 text-right text-text-secondary tabular-nums">
                  {index + 1}
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-medium text-balance">
                      {module.title}
                    </h2>
                    <Badge variant="outline" className={scopeStyle[scope]}>
                      {t(`modules.scope.${scope}`)}
                    </Badge>
                  </div>
                  <p className="text-sm text-text-secondary">
                    {t('modules.questions', { count: module.questions.length })}
                    {admin && module.createdBy && (
                      <>
                        {' '}
                        · {t('modules.by', { name: module.createdBy.username })}
                      </>
                    )}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {mayEdit(module) && (
                    <ModuleFormDialog
                      module={module}
                      trigger={
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-10 rounded-full"
                          aria-label={`${t('modules.edit')}: ${module.title}`}
                        >
                          <Pencil className="size-4" />
                        </Button>
                      }
                    />
                  )}
                  {mayDelete(module) && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-10 rounded-full text-destructive hover:text-destructive"
                      aria-label={`${t('modules.delete')}: ${module.title}`}
                      onClick={() => setPending(module)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <AlertDialog
        open={pending !== null}
        onOpenChange={(open) => !open && setPending(null)}
      >
        {pending && (
          <AlertDialogContent className="rounded-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle>
                {t('modules.remove.title', { title: pending.title })}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {t('modules.remove.body')}
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
                {t('modules.remove.confirm')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        )}
      </AlertDialog>
    </div>
  );
}
