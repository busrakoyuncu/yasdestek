import { useQuery } from '@tanstack/react-query';
import {
  MessagesSquare,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import { useId, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toastError, toastSuccess } from '@/lib/toast';
import { modulesQuery } from '@/features/modules/useModules';
import { peopleQuery } from '@/features/people/usePeople';
import { GroupNameDialog } from './GroupNameDialog';
import { groupSummary, useGroupActions, type Group } from './useGroups';

// One group: its name with a "..." menu (rename, delete), then its members and
// its modules as rows, side by side on a wide screen. Adding is a quiet button
// that opens a picker; removing is a quiet button on each row.
export function GroupPanel({
  group,
  onDelete,
}: {
  group: Group;
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  const headingId = useId();
  const people = useQuery(peopleQuery);
  const modules = useQuery(modulesQuery);
  const { addMember, removeMember, assign, unassign } = useGroupActions();
  const [renaming, setRenaming] = useState(false);
  // A removal that waits for a yes: what the dialog says, and what a yes does.
  const [asking, setAsking] = useState<{
    title: string;
    body: string;
    confirm: string;
    run: () => void;
  } | null>(null);

  const askLeave = (member: Group['members'][number]) =>
    setAsking({
      title: t('groups.members.leave.title', { name: member.username }),
      body: t('groups.members.leave.body'),
      confirm: t('groups.members.leave.confirm'),
      run: () =>
        removeMember.mutate(
          { groupId: group.id, userId: member.id },
          {
            onSuccess: () => toastSuccess(t('groups.members.removed')),
            onError: toastError,
          },
        ),
    });

  const askUnassign = (module: { id: string; title: string }) =>
    setAsking({
      title: t('groups.modules.leave.title', { title: module.title }),
      body: t('groups.modules.leave.body'),
      confirm: t('groups.modules.leave.confirm'),
      run: () =>
        unassign.mutate(
          { groupId: group.id, moduleId: module.id },
          {
            onSuccess: () => toastSuccess(t('groups.modules.unassigned')),
            onError: toastError,
          },
        ),
    });

  // participants of this counselor who are in no group yet
  const free = (people.data ?? []).filter(
    (p) => p.role === 'USER' && p.groupId === null,
  );
  const assignedIds = new Set(group.modules.map((m) => m.module.id));
  const assignable = (modules.data ?? []).filter((m) => !assignedIds.has(m.id));

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-6">
      <div className="flex items-baseline gap-x-3">
        <h2
          id={headingId}
          className="flex min-w-0 flex-wrap items-baseline gap-x-3 text-xl font-medium tracking-[-0.01em]"
        >
          {group.name}{' '}
          <span className="text-base font-normal text-muted-foreground">
            {groupSummary(t, group)}
          </span>
        </h2>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="ml-auto size-9 shrink-0 self-center rounded-lg"
              aria-label={`${t('common.actions')}: ${group.name}`}
            >
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => setRenaming(true)}>
              <Pencil className="size-4" aria-hidden="true" />
              {t('groups.rename')}
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onSelect={onDelete}>
              <Trash2 className="size-4" aria-hidden="true" />
              {t('groups.delete')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <GroupNameDialog
          group={group}
          open={renaming}
          onOpenChange={setRenaming}
        />
      </div>

      <div className="grid gap-x-10 gap-y-8 lg:grid-cols-2">
        <Column
          title={t('groups.members.title')}
          add={
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
          }
          empty={group.members.length === 0 && t('groups.members.empty')}
        >
          {group.members.map((member) => (
            <Row
              key={member.id}
              action={
                <QuietButton
                  label={t('groups.members.remove', { name: member.username })}
                  onClick={() => askLeave(member)}
                >
                  {t('groups.members.removeShort')}
                </QuietButton>
              }
            >
              <span className={cn(!member.active && 'text-muted-foreground')}>
                {member.username}
              </span>
              {!member.active && (
                <span className="ml-2 text-sm text-muted-foreground">
                  {t('people.status.inactive')}
                </span>
              )}
            </Row>
          ))}
        </Column>

        <Column
          title={t('groups.modules.title')}
          add={
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
          }
          empty={group.modules.length === 0 && t('groups.modules.empty')}
          ordered
        >
          {group.modules.map(({ module }, index) => (
            <Row
              key={module.id}
              number={index + 1}
              action={
                <>
                  <Link
                    to={`/psychologist/forums/${group.id}/${module.id}`}
                    aria-label={t('groups.modules.forum', {
                      title: module.title,
                    })}
                    className="inline-flex items-center gap-1.5 rounded-md text-sm text-text-secondary underline-offset-4 outline-none hover:text-foreground hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    <MessagesSquare className="size-4" aria-hidden="true" />
                    {t('groups.modules.forumShort')}
                  </Link>
                  <QuietButton
                    label={t('groups.modules.unassign', {
                      title: module.title,
                    })}
                    onClick={() => askUnassign(module)}
                  >
                    {t('groups.modules.unassignShort')}
                  </QuietButton>
                </>
              }
            >
              {module.title}
            </Row>
          ))}
        </Column>
      </div>

      <AlertDialog
        open={asking !== null}
        onOpenChange={(open) => !open && setAsking(null)}
      >
        {asking && (
          <AlertDialogContent className="rounded-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle>{asking.title}</AlertDialogTitle>
              <AlertDialogDescription>{asking.body}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="h-10 rounded-full px-4">
                {t('common.cancel')}
              </AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                className="h-10 rounded-full px-4"
                onClick={() => {
                  setAsking(null);
                  asking.run();
                }}
              >
                {asking.confirm}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        )}
      </AlertDialog>
    </section>
  );
}

// A titled list of rows split by thin lines, with its add control under it.
function Column({
  title,
  empty,
  ordered,
  add,
  children,
}: {
  title: string;
  empty: string | false;
  ordered?: boolean;
  add: ReactNode;
  children: ReactNode;
}) {
  const List = ordered ? 'ol' : 'ul';
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
      {empty ? (
        <p className="border-y border-border py-2.5 text-text-secondary">
          {empty}
        </p>
      ) : (
        <List className="border-t border-border">{children}</List>
      )}
      <div className="pt-1">{add}</div>
    </div>
  );
}

// One row; its actions stay faint until the row is pointed at or focused,
// and always show on a touch screen.
function Row({
  number,
  action,
  children,
}: {
  number?: number;
  action: ReactNode;
  children: ReactNode;
}) {
  return (
    <li className="group/row flex min-h-12 items-center gap-3 border-b border-border py-2">
      {number !== undefined && (
        <span className="w-5 shrink-0 text-right text-muted-foreground tabular-nums">
          {number}
        </span>
      )}
      <span className="min-w-0 flex-1 truncate">{children}</span>
      <span className="flex shrink-0 items-center gap-4">{action}</span>
    </li>
  );
}

function QuietButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="rounded-md px-1.5 py-1 text-sm text-muted-foreground outline-none transition-opacity hover:text-foreground focus-visible:opacity-100 focus-visible:ring-3 focus-visible:ring-ring/50 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover/row:opacity-100"
    >
      {children}
    </button>
  );
}

// A quiet "+ add" button that opens a picker; picking adds and closes it.
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
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  if (options.length === 0) {
    return <p className="text-sm text-muted-foreground">{noneLeft}</p>;
  }
  if (!open) {
    return (
      <Button
        variant="ghost"
        className="-ml-2.5 h-9 rounded-lg px-2.5 text-text-secondary"
        onClick={() => setOpen(true)}
      >
        <Plus className="size-4" aria-hidden="true" />
        {label}
      </Button>
    );
  }
  return (
    // one line: the picker takes the room "Vazgeç" leaves
    <div className="flex items-center gap-2">
      <Select
        defaultOpen
        onValueChange={(id) => {
          onPick(id);
          setOpen(false);
        }}
      >
        <SelectTrigger
          className="h-10 min-w-0 flex-1 rounded-lg sm:max-w-xs"
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
      <Button
        variant="ghost"
        className="h-10 rounded-lg px-3 text-muted-foreground"
        onClick={() => setOpen(false)}
      >
        {t('common.cancel')}
      </Button>
    </div>
  );
}
