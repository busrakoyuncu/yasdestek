import { zodResolver } from '@hookform/resolvers/zod';
import { groupSchema, type GroupInput } from '@yasdestek/shared';
import { useState, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { errorMessage } from '@/lib/errors';
import { toastSuccess } from '@/lib/toast';
import { useGroupActions, type Group } from './useGroups';

// Create (no group) or rename (with group): one field, one dialog. It opens
// from its trigger, or from outside through open and onOpenChange (the
// group's "..." menu).
export function GroupNameDialog({
  group,
  trigger,
  open: openFromOutside,
  onOpenChange: setOpenFromOutside,
  onCreated,
}: {
  group?: Group;
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onCreated?: (group: Group) => void;
}) {
  const { t } = useTranslation();
  const { create, rename } = useGroupActions();
  const mutation = group ? rename : create;
  const [ownOpen, setOwnOpen] = useState(false);
  const open = openFromOutside ?? ownOpen;
  const setOpen = setOpenFromOutside ?? setOwnOpen;
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<GroupInput>({
    resolver: zodResolver(groupSchema),
    defaultValues: { name: group?.name ?? '' },
  });

  const onOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) mutation.reset();
  };

  const onSubmit = handleSubmit((values) => {
    const done = () => {
      toastSuccess(t(group ? 'groups.form.renamed' : 'groups.form.created'));
      onOpenChange(false);
    };
    if (group) rename.mutate({ id: group.id, ...values }, { onSuccess: done });
    else
      create.mutate(values, {
        onSuccess: (created) => {
          done();
          onCreated?.(created);
        },
      });
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent
        className="rounded-2xl sm:max-w-md"
        // however it was opened, it starts from the current name
        onOpenAutoFocus={() => reset({ name: group?.name ?? '' })}
      >
        <form className="flex flex-col gap-5" noValidate onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>
              {t(group ? 'groups.form.renameTitle' : 'groups.form.createTitle')}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {t('groups.form.name')}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="group-name">{t('groups.form.name')}</Label>
            <Input
              id="group-name"
              className="h-11 rounded-xl text-base"
              aria-invalid={!!errors.name}
              {...register('name')}
            />
            {errors.name && (
              <p role="alert" className="text-base leading-6 text-destructive">
                {errors.name.message}
              </p>
            )}
          </div>
          {mutation.isError && (
            <p role="alert" className="text-base leading-6 text-destructive">
              {errorMessage(mutation.error)}
            </p>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              className="h-10 rounded-full px-4"
              onClick={() => onOpenChange(false)}
            >
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              className="h-10 rounded-full px-4"
              disabled={mutation.isPending}
              aria-busy={mutation.isPending}
            >
              {t(
                mutation.isPending
                  ? 'groups.form.submitting'
                  : group
                    ? 'groups.form.submitRename'
                    : 'groups.form.submitCreate',
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
