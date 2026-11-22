import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from 'cn';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { groupsQuery } from '@/features/groups/useGroups';
import { PersonMenu } from './PersonMenu';
import type { Person } from './usePeople';
import { usePersonActions } from './usePersonActions';

// Where an account is in its life: inactive until activated, then waiting
// for its first sign-in, then active.
type State = 'active' | 'pending' | 'inactive';
const stateOf = (person: Person): State =>
  !person.active
    ? 'inactive'
    : person.mustChangePassword
      ? 'pending'
      : 'active';
const STATES: State[] = ['active', 'pending', 'inactive'];

type Props = {
  people: Person[];
  // Everyone the admin sees, to count a counselor's participants and to name
  // a participant's counselor.
  everyone: Person[];
  kind: 'counselors' | 'participants';
  emptyMessage: string;
};

// The admin's accounts as a quiet list: filters with counts and a search,
// one line of context under each name, the likely next action on the row
// and the rest in its menu.
export function PeopleList({ people, everyone, kind, emptyMessage }: Props) {
  const { t, i18n } = useTranslation();
  const actions = usePersonActions();
  const groups = useQuery(groupsQuery);
  const [state, setState] = useState<State | 'all'>('all');
  const [query, setQuery] = useState('');
  const [counselor, setCounselor] = useState('all');

  const participants = kind === 'participants';
  const counselors = everyone.filter((p) => p.role === 'PSYCHOLOGIST');
  const date = new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium' });
  const locale = i18n.language;

  // One line of context under the name. The groups arrive in their own
  // request: until then the line leaves them out rather than guess.
  const context = (person: Person) => {
    if (participants) {
      const owner =
        counselors.find((c) => c.id === person.psychologistId)?.username ?? '';
      if (!groups.data) return owner;
      const group = groups.data.find((g) => g.id === person.groupId);
      return t('people.list.participantOf', {
        counselor: owner,
        group: group?.name ?? t('people.board.ungrouped'),
      });
    }
    const people = t('people.list.participants', {
      count: everyone.filter((p) => p.psychologistId === person.id).length,
    });
    if (!groups.data) return people;
    return t('people.list.counselorOf', {
      people,
      groups: t('people.list.groups', {
        count: groups.data.filter((g) => g.psychologistId === person.id).length,
      }),
    });
  };

  if (people.length === 0) {
    return <p className="text-text-secondary">{emptyMessage}</p>;
  }

  // The filters other than state, so each state button can count what it
  // would show.
  const matching = people.filter(
    (p) =>
      p.username
        .toLocaleLowerCase(locale)
        .includes(query.trim().toLocaleLowerCase(locale)) &&
      (counselor === 'all' || p.psychologistId === counselor),
  );
  const shown = matching
    .filter((p) => state === 'all' || stateOf(p) === state)
    .sort((a, b) => a.username.localeCompare(b.username, locale));

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 border-b border-border md:flex-row md:items-end md:justify-between">
        <div
          role="group"
          aria-label={t('people.list.show')}
          // one row; on a narrow phone it scrolls sideways instead of wrapping
          className="-mb-px flex gap-x-1 overflow-x-auto [scrollbar-width:none]"
        >
          {(['all', ...STATES] as const).map((option) => {
            const count =
              option === 'all'
                ? matching.length
                : matching.filter((p) => stateOf(p) === option).length;
            return (
              <button
                key={option}
                type="button"
                aria-pressed={state === option}
                onClick={() => setState(option)}
                className={cn(
                  'flex shrink-0 items-baseline gap-1.5 border-b-2 px-3 py-2.5 whitespace-nowrap text-[0.95rem] outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50',
                  state === option
                    ? 'border-foreground font-medium text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground',
                )}
              >
                {option === 'all'
                  ? t('people.list.all')
                  : t(`people.status.${option}`)}{' '}
                <span className="font-normal text-muted-foreground tabular-nums">
                  {count}
                </span>
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-2 pb-2">
          {participants && (
            <Select value={counselor} onValueChange={setCounselor}>
              <SelectTrigger
                className="h-10 w-full rounded-lg sm:w-48"
                aria-label={t('people.list.counselor')}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {t('people.list.allCounselors')}
                </SelectItem>
                {counselors.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.username}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <label className="relative w-full sm:w-56">
            <span className="sr-only">{t('people.list.search')}</span>
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('people.list.search')}
              className="h-10 rounded-lg pl-9 text-base md:text-sm"
            />
          </label>
        </div>
      </div>

      {shown.length === 0 ? (
        <p className="text-text-secondary">{t('people.list.noMatch')}</p>
      ) : (
        <ul
          aria-label={t(participants ? 'nav.participants' : 'nav.counselors')}
        >
          {shown.map((person) => {
            const current = stateOf(person);
            return (
              <li
                key={person.id}
                // four aligned columns on a wide screen; on a phone the name,
                // its context and the state stack, the actions on the right
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-0.5 border-b border-border py-3.5 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,0.9fr)_12rem]"
              >
                <div className="min-w-0">
                  <p className="truncate text-lg tracking-[-0.01em]">
                    {person.username}
                  </p>
                  <p className="truncate text-sm text-muted-foreground">
                    {context(person)}
                  </p>
                </div>
                <p
                  className={cn(
                    'row-start-2 text-sm md:col-start-2 md:row-start-1 md:text-[0.95rem]',
                    current === 'inactive'
                      ? 'text-muted-foreground'
                      : 'text-text-secondary',
                  )}
                >
                  {t(`people.status.${current}`)}
                </p>
                <p className="hidden text-sm text-muted-foreground tabular-nums md:col-start-3 md:row-start-1 md:block">
                  {t('people.list.created', {
                    date: date.format(new Date(person.createdAt)),
                  })}
                </p>
                <div className="col-start-2 row-span-2 row-start-1 flex items-center justify-end gap-2 md:col-start-4 md:row-span-1">
                  {current === 'inactive' && (
                    <Button
                      variant="outline"
                      className="h-9 rounded-full px-3.5"
                      onClick={() => actions.activate(person)}
                    >
                      {t('people.actions.activate')}
                    </Button>
                  )}
                  {current === 'pending' && (
                    <Button
                      variant="outline"
                      className="h-9 rounded-full px-3.5"
                      onClick={() => actions.ask('reset', person)}
                    >
                      {t('people.board.newPassword')}
                    </Button>
                  )}
                  <PersonMenu
                    person={person}
                    actions={actions}
                    canDelete={participants}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {actions.dialogs}
    </div>
  );
}
