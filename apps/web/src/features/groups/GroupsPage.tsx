import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { groupSchema, type GroupInput } from '@yasdestek/shared';
import { Pencil, Plus, Trash2, X } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { errorMessage } from '@/lib/errors';
import { toastError, toastSuccess } from '@/lib/toast';
import { modulesQuery } from '@/features/modules/useModules';
import { peopleQuery } from '@/features/people/usePeople';
import { groupsQuery, useGroupActions, type Group } from './useGroups';

// The counselor's groups: each one with its members and its assigned
// modules, and the controls to change both. Three lists feed it: groups,
// the counselor's participants (to add), and the visible modules (to assign).
export function GroupsPage() {
  const { t } = useTranslation();
  const groups = useQuery(groupsQuery);
  const { remove } = useGroupActions();
  const [pending, setPending] = useState<Group | null>(null);

  const confirmDelete = () => {
    if (!pending) return;
    const group = pending;
    setPending(null);
    remove.mutate(group.id, {
      onSuccess: () => toastSuccess(t('groups.remove.done')),
      onError: toastError,
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">
          {t('nav.groups')}
        </h1>
        <GroupNameDialog
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
      {groups.data?.map((group) => (
        <GroupSection
          key={group.id}
          group={group}
          onDelete={() => setPending(group)}
        />
      ))}

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

// One group: name with rename and delete, then members, then modules.
function GroupSection({
  group,
  onDelete,
}: {
  group: Group;
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  const people = useQuery(peopleQuery);
  const modules = useQuery(modulesQuery);
  const { addMember, removeMember, assign, unassign } = useGroupActions();

  // participants of this counselor who are in no group yet
  const free = (people.data ?? []).filter(
    (p) => p.role === 'USER' && p.groupId === null,
  );
  const assignedIds = new Set(group.modules.map((m) => m.module.id));
  const assignable = (modules.data ?? []).filter((m) => !assignedIds.has(m.id));

  return (
    <section
      aria-labelledby={`group-${group.id}`}
      className="flex flex-col gap-5 rounded-2xl border border-border p-5"
    >
      <div className="flex flex-wrap items-center gap-2">
        <h2 id={`group-${group.id}`} className="text-xl font-medium">
          {group.name}
        </h2>
        <GroupNameDialog
          group={group}
          trigger={
            <Button
              variant="ghost"
              size="icon"
              className="size-9 rounded-full"
              aria-label={`${t('groups.rename')}: ${group.name}`}
            >
              <Pencil className="size-4" />
            </Button>
          }
        />
        <Button
          variant="ghost"
          size="icon"
          className="ml-auto size-9 rounded-full text-destructive hover:text-destructive"
          aria-label={`${t('groups.delete')}: ${group.name}`}
          onClick={onDelete}
        >
          <Trash2 className="size-4" />
        </Button>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-medium text-text-secondary">
          {t('groups.members.title')}
        </h3>
        {group.members.length === 0 ? (
          <p className="text-sm text-text-secondary">
            {t('groups.members.empty')}
          </p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {group.members.map((member) => (
              <li
                key={member.id}
                className="flex h-9 items-center gap-1 rounded-full border border-border pr-1 pl-3 text-sm"
              >
                {member.username}
                {!member.active && (
                  <span className="text-muted-foreground">
                    {' '}
                    · {t('groups.members.inactive')}
                  </span>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 rounded-full"
                  aria-label={t('groups.members.remove', {
                    name: member.username,
                  })}
                  onClick={() =>
                    removeMember.mutate(
                      { groupId: group.id, userId: member.id },
                      {
                        onSuccess: () =>
                          toastSuccess(t('groups.members.removed')),
                        onError: toastError,
                      },
                    )
                  }
                >
                  <X className="size-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        )}
        <Picker
          label={t('groups.members.add')}
          placeholder={t('groups.members.placeholder')}
          noneLeft={t('groups.members.noneLeft')}
          options={free.map((p) => ({ id: p.id, label: p.username }))}
          onPick={(userId) =>
            addMember.mutate(
              { groupId: group.id, userId },
              {
                onSuccess: () => toastSuccess(t('groups.members.added')),
                onError: toastError,
              },
            )
          }
        />
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-medium text-text-secondary">
          {t('groups.modules.title')}
        </h3>
        {group.modules.length === 0 ? (
          <p className="text-sm text-text-secondary">
            {t('groups.modules.empty')}
          </p>
        ) : (
          <ol className="flex flex-col gap-1">
            {group.modules.map(({ module }, index) => (
              <li key={module.id} className="flex items-center gap-2 text-base">
                <span className="w-5 text-right text-text-secondary tabular-nums">
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1">{module.title}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 rounded-full"
                  aria-label={t('groups.modules.unassign', {
                    title: module.title,
                  })}
                  onClick={() =>
                    unassign.mutate(
                      { groupId: group.id, moduleId: module.id },
                      {
                        onSuccess: () =>
                          toastSuccess(t('groups.modules.unassigned')),
                        onError: toastError,
                      },
                    )
                  }
                >
                  <X className="size-3.5" />
                </Button>
              </li>
            ))}
          </ol>
        )}
        <Picker
          label={t('groups.modules.assign')}
          placeholder={t('groups.modules.placeholder')}
          noneLeft={t('groups.modules.noneLeft')}
          options={assignable.map((m) => ({ id: m.id, label: m.title }))}
          onPick={(moduleId) =>
            assign.mutate(
              { groupId: group.id, moduleId },
              {
                onSuccess: () => toastSuccess(t('groups.modules.assigned')),
                onError: toastError,
              },
            )
          }
        />
      </div>
    </section>
  );
}

// A select that acts on choice: pick one, it is added, the select clears.
function Picker({
  label,
  placeholder,
  noneLeft,
  options,
  onPick,
}: {
  label: string;
  placeholder: string;
  noneLeft: string;
  options: { id: string; label: string }[];
  onPick: (id: string) => void;
}) {
  const [key, setKey] = useState(0);
  if (options.length === 0) {
    return <p className="text-sm text-muted-foreground">{noneLeft}</p>;
  }
  return (
    <Select
      key={key}
      onValueChange={(id) => {
        onPick(id);
        setKey((k) => k + 1);
      }}
    >
      <SelectTrigger
        className="h-10 w-full max-w-xs rounded-full"
        aria-label={label}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.id} value={o.id}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// Create (no group) or rename (with group): one field, one dialog.
function GroupNameDialog({
  group,
  trigger,
}: {
  group?: Group;
  trigger: ReactNode;
}) {
  const { t } = useTranslation();
  const { create, rename } = useGroupActions();
  const mutation = group ? rename : create;
  const [open, setOpen] = useState(false);
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
    if (next) reset({ name: group?.name ?? '' });
    else mutation.reset();
  };

  const onSubmit = handleSubmit((values) => {
    const done = () => {
      toastSuccess(t(group ? 'groups.form.renamed' : 'groups.form.created'));
      onOpenChange(false);
    };
    if (group) rename.mutate({ id: group.id, ...values }, { onSuccess: done });
    else create.mutate(values, { onSuccess: done });
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="rounded-2xl sm:max-w-md">
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
