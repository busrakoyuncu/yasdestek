import { useQuery } from '@tanstack/react-query';
import { ChevronDown } from 'lucide-react';
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from 'cn';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { errorMessage } from '@/lib/errors';
import {
  counselorsOverviewQuery,
  participantProgressQuery,
  type CounselorOverview,
} from './useAnalytics';

// Same colors as the participant's own module list.
const statusStyle = {
  not_started: 'text-muted-foreground',
  in_progress: 'text-secondary-accent',
  completed: 'text-primary',
};

// The admin's overview: one section per counselor with their participants.
// Opening a participant loads where they stand in each of their modules.
export function AnalyticsPage() {
  const { t } = useTranslation();
  const overview = useQuery(counselorsOverviewQuery);

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          {t('nav.analytics')}
        </h1>
        <p className="max-w-prose text-pretty text-text-secondary">
          {t('analytics.intro')}
        </p>
      </div>
      {overview.isPending && <Loading />}
      {overview.isError && (
        <Failed error={overview.error} retry={() => overview.refetch()} />
      )}
      {overview.data?.length === 0 && (
        <p className="text-text-secondary">{t('people.empty.counselors')}</p>
      )}
      {overview.data?.map((counselor) => (
        <CounselorSection key={counselor.id} counselor={counselor} />
      ))}
    </div>
  );
}

function CounselorSection({ counselor }: { counselor: CounselorOverview }) {
  const { t } = useTranslation();
  const headingId = useId();
  const { users } = counselor;

  return (
    <section
      aria-labelledby={headingId}
      className="overflow-hidden rounded-2xl border border-border"
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-5 py-4">
        <h2 id={headingId} className="text-lg font-semibold">
          {counselor.username}
        </h2>
        {!counselor.active && <Inactive />}
        <span className="ml-auto text-sm text-text-secondary tabular-nums">
          {t('analytics.participants', { count: users.length })}
        </span>
      </div>
      {users.length === 0 ? (
        <p className="border-t border-border px-5 py-4 text-text-secondary">
          {t('people.empty.participants')}
        </p>
      ) : (
        <ul className="divide-y divide-border border-t border-border">
          {users.map((user) => (
            <ParticipantRow key={user.id} participant={user} />
          ))}
        </ul>
      )}
    </section>
  );
}

function ParticipantRow({
  participant,
}: {
  participant: CounselorOverview['users'][number];
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const panelId = useId();

  return (
    <li>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(!open)}
        className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 px-5 py-3 text-left outline-none transition-colors hover:bg-surface focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset"
      >
        <span className="font-medium">{participant.username}</span>
        <span className="text-sm text-text-secondary">
          {participant.group?.name ?? t('analytics.noGroup')}
        </span>
        {!participant.active && <Inactive />}
        <ChevronDown
          className={cn(
            'ml-auto size-4 text-muted-foreground transition-transform',
            open && 'rotate-180',
          )}
          aria-hidden="true"
        />
      </button>
      <div id={panelId} hidden={!open} className="px-5 pb-4">
        {open && <Progress id={participant.id} />}
      </div>
    </li>
  );
}

// Loaded only once the row is opened, so the page stays one request long.
function Progress({ id }: { id: string }) {
  const { t } = useTranslation();
  const progress = useQuery(participantProgressQuery(id));

  if (progress.isPending) return <Loading />;
  if (progress.isError) {
    return <Failed error={progress.error} retry={() => progress.refetch()} />;
  }
  const { group, modules } = progress.data;
  if (!group || modules.length === 0) {
    return (
      <p className="text-sm text-text-secondary">
        {t(group ? 'analytics.noModules' : 'analytics.notInGroup')}
      </p>
    );
  }
  return (
    <ol className="flex flex-col gap-2">
      {modules.map((module) => (
        <li
          key={module.id}
          className="flex flex-wrap items-baseline justify-between gap-x-4"
        >
          <span>{module.title}</span>
          <span className={cn('text-sm', statusStyle[module.status])}>
            {t(`analytics.status.${module.status}`)}
          </span>
        </li>
      ))}
    </ol>
  );
}

function Inactive() {
  const { t } = useTranslation();
  return (
    <Badge variant="outline" className="border-border text-muted-foreground">
      {t('people.status.inactive')}
    </Badge>
  );
}

function Loading() {
  const { t } = useTranslation();
  return (
    <p className="text-text-secondary" role="status">
      {t('common.loading')}
    </p>
  );
}

function Failed({ error, retry }: { error: Error; retry: () => unknown }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-start gap-3" role="alert">
      <p className="text-destructive">{errorMessage(error)}</p>
      <Button
        variant="outline"
        className="h-10 rounded-full px-4"
        onClick={() => void retry()}
      >
        {t('common.retry')}
      </Button>
    </div>
  );
}
