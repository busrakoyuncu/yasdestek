import { useQuery } from '@tanstack/react-query';
import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from 'cn';
import { Button } from '@/components/ui/button';
import { errorMessage } from '@/lib/errors';
import {
  counselorsOverviewQuery,
  type CounselorOverview,
  type ModuleStatus,
} from './useAnalytics';

type Participant = CounselorOverview['users'][number];

// The admin's overview: for each counselor, one small table per group with
// the people down the side and the group's modules across the top.
export function AnalyticsPage() {
  const { t } = useTranslation();
  const overview = useQuery(counselorsOverviewQuery);

  return (
    <div className="flex max-w-4xl flex-col gap-8">
      <div className="flex flex-col gap-3">
        <h1 className="title-page">{t('nav.analytics')}</h1>
        <p className="max-w-prose text-pretty text-text-secondary">
          {t('analytics.intro')}
        </p>
        {/* the cells name their own state; this only teaches the marks */}
        <div
          aria-hidden="true"
          className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-muted-foreground"
        >
          {(['completed', 'in_progress', 'not_started'] as const).map(
            (status) => (
              <span key={status} className="inline-flex items-center gap-2">
                <Mark status={status} />
                {t(`analytics.status.${status}`)}
              </span>
            ),
          )}
        </div>
      </div>
      {overview.isPending && (
        <p className="text-text-secondary" role="status">
          {t('common.loading')}
        </p>
      )}
      {overview.isError && (
        <div className="flex flex-col items-start gap-3" role="alert">
          <p className="text-destructive">{errorMessage(overview.error)}</p>
          <Button
            variant="outline"
            className="h-10 rounded-full px-4"
            onClick={() => void overview.refetch()}
          >
            {t('common.retry')}
          </Button>
        </div>
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
  const { t, i18n } = useTranslation();
  const headingId = useId();
  const { users } = counselor;

  // The counselor's groups, by name, each with its members. A group is known
  // here only through the people in it.
  const groups = new Map<string, { name: string; members: Participant[] }>();
  for (const user of users) {
    if (!user.group) continue;
    const group = groups.get(user.group.id) ?? {
      name: user.group.name,
      members: [],
    };
    group.members.push(user);
    groups.set(user.group.id, group);
  }
  const sorted = [...groups.entries()].sort(([, a], [, b]) =>
    a.name.localeCompare(b.name, i18n.language),
  );
  const ungrouped = users.filter((user) => !user.group);

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-5">
      <h2
        id={headingId}
        className="flex flex-wrap items-baseline gap-x-2.5 border-b border-border pb-3 text-xl font-medium tracking-[-0.01em]"
      >
        {counselor.username}{' '}
        <span className="text-base font-normal text-muted-foreground">
          {t('people.list.counselorOf', {
            people: t('analytics.participants', { count: users.length }),
            groups: t('people.list.groups', { count: groups.size }),
          })}
          {!counselor.active && `, ${t('people.status.inactive')}`}
        </span>
      </h2>
      {users.length === 0 && (
        <p className="text-text-secondary">{t('people.empty.participants')}</p>
      )}
      {sorted.map(([id, group]) => (
        <GroupTable key={id} name={group.name} members={group.members} />
      ))}
      {ungrouped.length > 0 && (
        <p className="text-text-secondary">
          {t('analytics.ungrouped', {
            names: ungrouped.map((user) => user.username).join(', '),
          })}
        </p>
      )}
    </section>
  );
}

function GroupTable({
  name,
  members,
}: {
  name: string;
  members: Participant[];
}) {
  const { t } = useTranslation();
  const headingId = useId();
  // Everyone in a group has the same modules, in the same order.
  const modules = members[0].modules;

  return (
    <div className="flex flex-col gap-2">
      <h3 id={headingId} className="font-medium text-text-secondary">
        {name}
      </h3>
      {modules.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {t('analytics.noModules', {
            names: members.map((user) => user.username).join(', '),
          })}
        </p>
      ) : (
        <>
          {/* a group with many modules scrolls sideways on a phone */}
          <div className="overflow-x-auto">
            <table
              aria-labelledby={headingId}
              // full width on a phone; on a wide screen fixed columns, so
              // M1, M2... sit at the same place in every table
              className="w-full min-w-[20rem] border-collapse md:w-auto"
            >
              <thead>
                <tr className="border-b border-border text-sm text-muted-foreground">
                  <th
                    scope="col"
                    className="py-2 pr-3 text-left font-normal md:w-64"
                  >
                    <span className="sr-only">
                      {t('analytics.participant')}
                    </span>
                  </th>
                  {modules.map((module, index) => (
                    <th
                      key={module.id}
                      scope="col"
                      title={module.title}
                      className="px-1.5 py-2 font-medium md:w-16"
                    >
                      <span aria-hidden="true">
                        {t('analytics.moduleShort', { n: index + 1 })}
                      </span>
                      <span className="sr-only">{module.title}</span>
                    </th>
                  ))}
                  <th
                    scope="col"
                    className="py-2 pl-3 text-right font-normal md:w-20"
                  >
                    <span className="sr-only">{t('analytics.shared')}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {members.map((user) => (
                  <tr key={user.id} className="border-b border-border">
                    <th
                      scope="row"
                      className={cn(
                        'py-3 pr-3 text-left text-[1.05rem] font-normal tracking-[-0.01em]',
                        !user.active && 'text-muted-foreground',
                      )}
                    >
                      {user.username}
                      {!user.active && (
                        <span className="ml-2 text-sm">
                          {t('people.status.inactive')}
                        </span>
                      )}
                    </th>
                    {user.modules.map((module) => (
                      <td key={module.id} className="px-1.5 py-3 text-center">
                        <Mark status={module.status} label />
                      </td>
                    ))}
                    <td className="py-3 pl-3 text-right text-sm whitespace-nowrap text-muted-foreground tabular-nums">
                      {
                        user.modules.filter((m) => m.status === 'completed')
                          .length
                      }{' '}
                      / {user.modules.length}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* what each column is, for screens with no hover */}
          <p aria-hidden="true" className="text-sm text-muted-foreground">
            {modules
              .map(
                (module, index) =>
                  `${t('analytics.moduleShort', { n: index + 1 })} ${module.title}`,
              )
              .join(' · ')}
          </p>
        </>
      )}
    </div>
  );
}

// Filled for shared, a ring for a draft, dashed for not started: the shape
// carries the state, not only the color.
function Mark({ status, label }: { status: ModuleStatus; label?: boolean }) {
  const { t } = useTranslation();
  return (
    <span
      role={label ? 'img' : undefined}
      aria-label={label ? t(`analytics.status.${status}`) : undefined}
      className={cn(
        'inline-block size-3.5 shrink-0 rounded-full align-middle',
        status === 'completed' && 'bg-primary',
        status === 'in_progress' && 'border-2 border-primary',
        status === 'not_started' &&
          'border-[1.5px] border-dashed border-muted-foreground/60',
      )}
    />
  );
}
