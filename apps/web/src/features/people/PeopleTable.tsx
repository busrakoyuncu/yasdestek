import {
  KeyRound,
  MoreHorizontal,
  Trash2,
  UserCheck,
  UserX,
} from 'lucide-react';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toastError, toastSuccess } from '@/lib/toast';
import { OneTimePassword } from './OneTimePassword';
import { usePeopleActions, type Person } from './usePeople';

type Props = {
  people: Person[];
  // Admins see whose participant each one is; the list to look names up in.
  counselors?: Person[];
  // Hard delete exists for privacy requests and only admins may do it.
  canDelete?: boolean;
  emptyMessage: string;
};

type Pending = { kind: 'deactivate' | 'reset' | 'delete'; person: Person };

// Reads as "where is this account in its life": inactive until activated,
// then waiting for its first sign-in, then active.
function status(person: Person): 'inactive' | 'pending' | 'active' {
  if (!person.active) return 'inactive';
  return person.mustChangePassword ? 'pending' : 'active';
}

const statusStyle = {
  active: 'border-primary/40 text-primary',
  pending: 'border-secondary-accent/60 text-secondary-accent',
  inactive: 'border-border text-muted-foreground',
};

export function PeopleTable({
  people,
  counselors,
  canDelete,
  emptyMessage,
}: Props) {
  const { t, i18n } = useTranslation();
  const { setActive, resetPassword, remove } = usePeopleActions();
  const [pending, setPending] = useState<Pending | null>(null);
  const [reset, setReset] = useState<{
    username: string;
    password: string;
  } | null>(null);

  const counselorName = (id: string | null) =>
    counselors?.find((c) => c.id === id)?.username ?? '';
  const date = new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium' });

  const activate = (person: Person) =>
    setActive.mutate(
      { id: person.id, active: true },
      {
        onSuccess: () => toastSuccess(t('people.activate.done')),
        onError: toastError,
      },
    );

  // Deactivate, reset and delete all ask first; this runs the confirmed one.
  const confirm = () => {
    if (!pending) return;
    const { kind, person } = pending;
    setPending(null);
    if (kind === 'deactivate') {
      setActive.mutate(
        { id: person.id, active: false },
        {
          onSuccess: () => toastSuccess(t('people.deactivate.done')),
          onError: toastError,
        },
      );
    } else if (kind === 'reset') {
      resetPassword.mutate(person.id, {
        onSuccess: ({ password }) =>
          setReset({ username: person.username, password }),
        onError: toastError,
      });
    } else {
      remove.mutate(person.id, {
        onSuccess: () => toastSuccess(t('people.delete.done')),
        onError: toastError,
      });
    }
  };

  if (people.length === 0) {
    return <p className="text-text-secondary">{emptyMessage}</p>;
  }

  return (
    <>
      <div className="overflow-x-auto rounded-2xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('people.columns.username')}</TableHead>
              <TableHead>{t('people.columns.status')}</TableHead>
              {counselors && (
                <TableHead>{t('people.columns.counselor')}</TableHead>
              )}
              <TableHead>{t('people.columns.created')}</TableHead>
              <TableHead className="w-12">
                <span className="sr-only">{t('common.actions')}</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {people.map((person) => {
              const state = status(person);
              return (
                <TableRow key={person.id}>
                  <TableCell className="font-medium">
                    {person.username}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={statusStyle[state]}>
                      {t(`people.status.${state}`)}
                    </Badge>
                  </TableCell>
                  {counselors && (
                    <TableCell>
                      {counselorName(person.psychologistId)}
                    </TableCell>
                  )}
                  <TableCell className="text-text-secondary">
                    {date.format(new Date(person.createdAt))}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-9 rounded-full"
                          aria-label={`${t('common.actions')}: ${person.username}`}
                        >
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {person.active ? (
                          <DropdownMenuItem
                            onSelect={() =>
                              setPending({ kind: 'deactivate', person })
                            }
                          >
                            <UserX className="size-4" aria-hidden="true" />
                            {t('people.actions.deactivate')}
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onSelect={() => activate(person)}>
                            <UserCheck className="size-4" aria-hidden="true" />
                            {t('people.actions.activate')}
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onSelect={() => setPending({ kind: 'reset', person })}
                        >
                          <KeyRound className="size-4" aria-hidden="true" />
                          {t('people.actions.resetPassword')}
                        </DropdownMenuItem>
                        {canDelete && (
                          <DropdownMenuItem
                            variant="destructive"
                            onSelect={() =>
                              setPending({ kind: 'delete', person })
                            }
                          >
                            <Trash2 className="size-4" aria-hidden="true" />
                            {t('people.actions.delete')}
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* One confirmation for the three actions that cost the person something. */}
      <AlertDialog
        open={pending !== null}
        onOpenChange={(open) => !open && setPending(null)}
      >
        {pending && (
          <AlertDialogContent className="rounded-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle>
                {t(`people.${pending.kind}.title`, {
                  name: pending.person.username,
                })}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {t(`people.${pending.kind}.body`)}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="h-10 rounded-full px-4">
                {t('common.cancel')}
              </AlertDialogCancel>
              <AlertDialogAction
                className="h-10 rounded-full px-4"
                variant={pending.kind === 'delete' ? 'destructive' : 'default'}
                onClick={confirm}
              >
                {t(`people.${pending.kind}.confirm`)}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        )}
      </AlertDialog>

      {/* The new temporary password after a reset, shown once. */}
      <Dialog
        open={reset !== null}
        onOpenChange={(open) => !open && setReset(null)}
      >
        {reset && (
          <DialogContent className="rounded-2xl sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{t('people.password.title')}</DialogTitle>
              <DialogDescription className="sr-only">
                {t('people.password.note')}
              </DialogDescription>
            </DialogHeader>
            <OneTimePassword
              username={reset.username}
              password={reset.password}
            />
            <DialogFooter>
              <Button
                className="h-10 rounded-full px-4"
                onClick={() => setReset(null)}
              >
                {t('people.password.done')}
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </>
  );
}
