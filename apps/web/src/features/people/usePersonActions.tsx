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
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toastError, toastSuccess } from '@/lib/toast';
import { OneTimePassword } from './OneTimePassword';
import { usePeopleActions, type Person } from './usePeople';

type Kind = 'deactivate' | 'reset' | 'delete';

// The account actions every people screen offers. Activating runs at once;
// deactivating, a password reset and a hard delete cost the person something,
// so they ask first. Render `dialogs` once on the screen.
export function usePersonActions() {
  const { t } = useTranslation();
  const { setActive, resetPassword, remove } = usePeopleActions();
  const [pending, setPending] = useState<{ kind: Kind; person: Person } | null>(
    null,
  );
  const [reset, setReset] = useState<{
    username: string;
    password: string;
  } | null>(null);

  const activate = (person: Person) =>
    setActive.mutate(
      { id: person.id, active: true },
      {
        onSuccess: () => toastSuccess(t('people.activate.done')),
        onError: toastError,
      },
    );

  const ask = (kind: Kind, person: Person) => setPending({ kind, person });

  // Runs the action the person confirmed.
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

  const dialogs = (
    <>
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

  return { activate, ask, dialogs };
}

export type PersonActions = ReturnType<typeof usePersonActions>;
