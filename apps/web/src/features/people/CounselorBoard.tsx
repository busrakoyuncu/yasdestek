import { useQuery } from '@tanstack/react-query';
import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { groupsQuery } from '@/features/groups/useGroups';
import { inboxQuery } from '@/features/messages/useMessages';
import { PersonMenu } from './PersonMenu';
import { latestStepsQuery, type LatestStep, type Person } from './usePeople';
import { usePersonActions, type PersonActions } from './usePersonActions';

// What a person waits for from their counselor, most urgent first, or null.
type Task = 'activate' | 'firstLogin' | 'noGroup';
function taskOf(person: Person): Task | null {
  if (!person.active) return 'activate';
  if (person.mustChangePassword) return 'firstLogin';
  if (!person.groupId) return 'noGroup';
  return null;
}

// The counselor's participants: first the accounts that need them, then
// everyone by group, the way a counselor thinks of them, with where each
// person is and any unread messages.
export function CounselorBoard({ people }: { people: Person[] }) {
  const { t } = useTranslation();
  const actions = usePersonActions();
  const groups = useQuery(groupsQuery);
  const inbox = useQuery(inboxQuery);
  const steps = useQuery(latestStepsQuery);

  const unread = new Map(inbox.data?.map((e) => [e.id, e.unread]));
  const stepOf = new Map(steps.data?.map((s) => [s.userId, s]));
  const byName = (a: Person, b: Person) => a.username.localeCompare(b.username);
  const waiting = people.filter((p) => taskOf(p) !== null).sort(byName);

  // The counselor's groups by name, then everyone without one.
  const sections = [
    ...[...(groups.data ?? [])]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((group) => ({
        key: group.id,
        title: group.name,
        members: people.filter((p) => p.groupId === group.id).sort(byName),
      })),
    {
      key: 'none',
      title: t('people.board.ungrouped'),
      members: people.filter((p) => !p.groupId).sort(byName),
    },
  ].filter((section) => section.members.length > 0);

  return (
    <div className="flex flex-col gap-12">
      {waiting.length > 0 && <Waiting people={waiting} actions={actions} />}
      {sections.map((section) => (
        <GroupSection
          key={section.key}
          title={section.title}
          members={section.members}
          unread={unread}
          stepOf={stepOf}
          actions={actions}
        />
      ))}
      {actions.dialogs}
    </div>
  );
}

function Waiting({
  people,
  actions,
}: {
  people: Person[];
  actions: PersonActions;
}) {
  const { t } = useTranslation();
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <h2
        id={headingId}
        className="flex items-baseline gap-2.5 text-xl font-medium tracking-[-0.01em]"
      >
        {t('people.board.waiting')}{' '}
        <span className="text-base font-normal text-muted-foreground tabular-nums">
          {people.length}
        </span>
      </h2>
      <ul className="flex flex-col gap-2">
        {people.map((person) => {
          const task = taskOf(person)!;
          return (
            <li
              key={person.id}
              className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-xl bg-surface-raised px-5 py-4"
            >
              <p className="min-w-0">
                <span className="block text-lg tracking-[-0.01em]">
                  {person.username}
                </span>
                <span className="block text-text-secondary">
                  {t(`people.board.task.${task}`)}
                </span>
              </p>
              {task === 'activate' && (
                <Button
                  variant="outline"
                  className="h-10 rounded-full px-4"
                  onClick={() => actions.activate(person)}
                >
                  {t('people.actions.activate')}
                </Button>
              )}
              {task === 'firstLogin' && (
                <Button
                  variant="outline"
                  className="h-10 rounded-full px-4"
                  onClick={() => actions.ask('reset', person)}
                >
                  {t('people.board.newPassword')}
                </Button>
              )}
              {task === 'noGroup' && (
                <Button
                  asChild
                  variant="outline"
                  className="h-10 rounded-full px-4"
                >
                  <Link to="/psychologist/groups">
                    {t('people.board.addToGroup')}
                  </Link>
                </Button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function GroupSection({
  title,
  members,
  unread,
  stepOf,
  actions,
}: {
  title: string;
  members: Person[];
  unread: Map<string, number>;
  stepOf: Map<string, LatestStep>;
  actions: PersonActions;
}) {
  const { t } = useTranslation();
  const headingId = useId();

  // Where the person is, in one line.
  const where = (person: Person) => {
    if (!person.active) return t('people.status.inactive');
    if (person.mustChangePassword) return t('people.board.noLogin');
    const step = stepOf.get(person.id);
    if (!step) return t('people.board.notStarted');
    return t(`people.board.step.${step.status}`, { module: step.module.title });
  };

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <h2
        id={headingId}
        className="flex items-baseline gap-2.5 text-xl font-medium tracking-[-0.01em]"
      >
        {title}{' '}
        <span className="text-base font-normal text-muted-foreground">
          {t('people.board.members', { count: members.length })}
        </span>
      </h2>
      <ul className="border-t border-border">
        {members.map((person) => {
          const count = unread.get(person.id) ?? 0;
          return (
            <li
              key={person.id}
              // three aligned columns on a wide screen; on a phone the name
              // and where they are stack, the actions stay on the right
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-0.5 border-b border-border py-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)_9.5rem]"
            >
              <span className="text-lg tracking-[-0.01em]">
                {person.username}
              </span>
              <span className="row-start-2 text-sm text-text-secondary sm:col-start-2 sm:row-start-1">
                {where(person)}
              </span>
              <span className="col-start-2 row-span-2 row-start-1 flex items-center justify-end gap-2 sm:col-start-3 sm:row-span-1">
                {count > 0 && (
                  <Link
                    to={`inbox/${person.id}`}
                    aria-label={t('people.board.unread', {
                      count,
                      name: person.username,
                    })}
                    className="flex items-center gap-2 rounded-lg px-2 py-1 text-sm outline-none hover:bg-foreground/5 focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    <span
                      className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-secondary-accent px-1.5 text-xs font-semibold text-background tabular-nums"
                      aria-hidden="true"
                    >
                      {count > 9 ? '9+' : count}
                    </span>
                    {t('people.board.message')}
                  </Link>
                )}
                <PersonMenu person={person} actions={actions} />
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
