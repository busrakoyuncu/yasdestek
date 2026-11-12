import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { errorMessage } from '@/lib/errors';
import { CreatePersonDialog } from './CreatePersonDialog';
import { PeopleTable } from './PeopleTable';
import { peopleQuery } from './usePeople';

type Props = {
  // which accounts this screen is about
  role: 'PSYCHOLOGIST' | 'USER';
  // true for the admin, who sees every participant with its counselor and may delete
  admin?: boolean;
};

// The people screens: the admin's counselors and participants, the
// counselor's own participants. Same list, same table, filtered by role.
export function PeoplePage({ role, admin }: Props) {
  const { t } = useTranslation();
  const people = useQuery(peopleQuery);
  const counselors = people.data?.filter((p) => p.role === 'PSYCHOLOGIST');
  const rows = people.data?.filter((p) => p.role === role) ?? [];
  const participants = role === 'USER';

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">
          {t(participants ? 'nav.participants' : 'nav.counselors')}
        </h1>
        <CreatePersonDialog
          role={role}
          counselors={admin && participants ? counselors : undefined}
        />
      </div>
      {people.isPending && (
        <p className="text-text-secondary" role="status">
          {t('common.loading')}
        </p>
      )}
      {people.isError && (
        <div className="flex flex-col items-start gap-3" role="alert">
          <p className="text-destructive">{errorMessage(people.error)}</p>
          <Button
            variant="outline"
            className="h-10 rounded-full px-4"
            onClick={() => void people.refetch()}
          >
            {t('common.retry')}
          </Button>
        </div>
      )}
      {people.data && (
        <PeopleTable
          people={rows}
          counselors={admin && participants ? counselors : undefined}
          canDelete={admin && participants}
          emptyMessage={t(
            participants
              ? 'people.empty.participants'
              : 'people.empty.counselors',
          )}
        />
      )}
    </div>
  );
}
