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
import { peopleQuery } from '@/features/people/usePeople';
import { GroupNameDialog } from './GroupNameDialog';
import { GroupPanel } from './GroupPanel';
import {
  groupSummary,
  groupsQuery,
  useGroupActions,
  type Group,
} from './useGroups';

// The counselor's groups: a list with counts, and the chosen group beside it
// on a wide screen or as its own screen on a phone. Each group has its own
// address, /psychologist/groups/:groupId.
export function GroupsPage() {
  const { t } = useTranslation();
  const { groupId } = useParams();
  const navigate = useNavigate();
  const groups = useQuery(groupsQuery);
  const people = useQuery(peopleQuery);
  const { remove } = useGroupActions();
  const [pending, setPending] = useState<Group | null>(null);

  // With no group in the address a wide screen opens the first one; a phone
  // shows only the list.
  const open = groupId
    ? groups.data?.find((g) => g.id === groupId)
    : groups.data?.[0];
  const waiting = (people.data ?? []).filter(
    (p) => p.role === 'USER' && p.groupId === null,
  );

  const confirmDelete = () => {
    if (!pending) return;
    const group = pending;
    setPending(null);
    remove.mutate(group.id, {
      onSuccess: () => {
        toastSuccess(t('groups.remove.done'));
        // back to the list; on a wide screen the first group opens
        void navigate('/psychologist/groups');
      },
      onError: toastError,
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="title-page">{t('nav.groups')}</h1>
        <GroupNameDialog
          onCreated={(group) =>
            void navigate(`/psychologist/groups/${group.id}`)
          }
          trigger={
            <Button className="h-10 rounded-full px-4">
              <Plus className="size-4" aria-hidden="true" />
              {t('groups.new')}
            </Button>
          }
        />
      </div>

      {groups.isPending && (
        <p className="text-text-secondary" role="status">
          {t('common.loading')}
        </p>
      )}
      {groups.isError && (
        <div className="flex flex-col items-start gap-3" role="alert">
          <p className="text-destructive">{errorMessage(groups.error)}</p>
          <Button
            variant="outline"
            className="h-10 rounded-full px-4"
            onClick={() => void groups.refetch()}
          >
            {t('common.retry')}
          </Button>
        </div>
      )}
      {groups.data?.length === 0 && (
        <p className="max-w-prose text-text-secondary">{t('groups.empty')}</p>
      )}

      {/* people a counselor still has to place, named where they get placed */}
      {waiting.length > 0 && (
        <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-y border-border py-3">
          <span className="font-medium text-secondary-accent">
            {t('groups.waiting')}
          </span>{' '}
          <span>{waiting.map((p) => p.username).join(', ')}</span>
        </p>
      )}

      {groups.data && groups.data.length > 0 && (
        <div className="grid gap-8 md:grid-cols-[15rem_minmax(0,1fr)]">
          <nav
            aria-label={t('nav.groups')}
            className={cn(groupId && 'hidden md:block')}
          >
            {/* the hover fill reaches past the text, so the names line up
                with the title */}
            <ul className="-mx-3 flex flex-col gap-0.5">
              {groups.data.map((group) => {
                const current = group.id === open?.id;
                return (
                  <li key={group.id}>
                    <Link
                      to={`/psychologist/groups/${group.id}`}
                      aria-current={current && groupId ? 'page' : undefined}
                      className={cn(
                        'flex flex-col rounded-lg px-3 py-2.5 outline-none transition-colors hover:bg-foreground/5 focus-visible:ring-3 focus-visible:ring-ring/50',
                        // the first group is open on a wide screen even
                        // before it is in the address
                        current && 'md:bg-foreground/7',
                        current && groupId && 'bg-foreground/7',
                      )}
                    >
                      <span className={cn(current && 'md:font-medium')}>
                        {group.name}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {groupSummary(t, group)}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className={cn('min-w-0', !groupId && 'hidden md:block')}>
            {groupId && (
              <Link
                to="/psychologist/groups"
                className="mb-4 inline-flex items-center gap-1 text-text-secondary hover:text-foreground md:hidden"
              >
                <ChevronLeft className="size-4" aria-hidden="true" />
                {t('groups.all')}
              </Link>
            )}
            {open ? (
              <GroupPanel
                key={open.id}
                group={open}
                onDelete={() => setPending(open)}
              />
            ) : (
              <p className="text-text-secondary">{t('groups.notFound')}</p>
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
                {t('groups.remove.title', { name: pending.name })}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {t('groups.remove.body')}
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
                {t('groups.remove.confirm')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        )}
      </AlertDialog>
    </div>
  );
}
