import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { errorMessage } from '@/lib/errors';
import { CounselorBoard } from './CounselorBoard';
import { CreatePersonDialog } from './CreatePersonDialog';
import { PeopleList } from './PeopleList';
import { peopleQuery } from './usePeople';

type Props = {
  // which accounts this screen is about
  role: 'PSYCHOLOGIST' | 'USER';
  // true for the admin, who sees every participant with its counselor and may delete
  admin?: boolean;
};

// The people screens: the admin's counselors and participants as a quiet
// list with filters, the counselor's own participants as a board of what
// needs them and who is in which group.
export function PeoplePage({ role, admin }: Props) {
  const { t } = useTranslation();
  const people = useQuery(peopleQuery);
  const counselors = people.data?.filter((p) => p.role === 'PSYCHOLOGIST');
  const rows = people.data?.filter((p) => p.role === role) ?? [];
  const participants = role === 'USER';

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="title-page">
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
      {/* a counselor's own participants: what needs them, then by group */}
      {people.data && participants && !admin && rows.length > 0 && (
        <CounselorBoard people={rows} />
      )}
      {people.data && !admin && rows.length === 0 && (
        <p className="text-text-secondary">{t('people.empty.participants')}</p>
      )}
      {people.data && admin && (
        <PeopleList
          people={rows}
          everyone={people.data}
          kind={participants ? 'participants' : 'counselors'}
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
