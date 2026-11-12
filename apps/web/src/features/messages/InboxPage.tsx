import { useQuery } from '@tanstack/react-query';
import { ChevronLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, NavLink, useParams } from 'react-router';
import { cn } from 'cn';
import { Button } from '@/components/ui/button';
import { errorMessage } from '@/lib/errors';
import { useSession } from '@/features/auth/useSession';
import { Thread } from './Thread';
import { inboxQuery } from './useMessages';

// The counselor's conversations: participants with unread counts, and the
// chosen thread beside them on desktop or as its own screen on a phone.
export function InboxPage() {
  const { t } = useTranslation();
  const { user } = useSession();
  const { userId } = useParams();
  const inbox = useQuery(inboxQuery);
  const open = inbox.data?.find((p) => p.id === userId);

  return (
    <div className="flex min-h-[calc(100svh-7rem)] flex-col gap-4">
      <div className="flex items-center gap-2">
        {userId && (
          <Button
            asChild
            variant="ghost"
            size="icon"
            className="size-9 rounded-full md:hidden"
          >
            <Link to=".." relative="path" aria-label={t('messages.back')}>
              <ChevronLeft className="size-5" />
            </Link>
          </Button>
        )}
        {/* on a phone the thread is its own screen, so it is titled by the person */}
        <h1 className="text-2xl font-semibold tracking-tight">
          {open && <span className="md:hidden">{open.username}</span>}
          <span className={cn(open && 'hidden md:inline')}>
            {t('nav.inbox')}
          </span>
        </h1>
      </div>

      <div className="grid min-h-0 flex-1 gap-6 md:grid-cols-[16rem_1fr]">
        <nav
          aria-label={t('nav.inbox')}
          className={cn('flex flex-col gap-1', userId && 'hidden md:flex')}
        >
          {inbox.isPending && (
            <p className="text-text-secondary" role="status">
              {t('common.loading')}
            </p>
          )}
          {inbox.isError && (
            <div className="flex flex-col items-start gap-3" role="alert">
              <p className="text-destructive">{errorMessage(inbox.error)}</p>
              <Button
                variant="outline"
                className="h-10 rounded-full px-4"
                onClick={() => void inbox.refetch()}
              >
                {t('common.retry')}
              </Button>
            </div>
          )}
          {inbox.data?.length === 0 && (
            <p className="text-text-secondary">{t('messages.emptyInbox')}</p>
          )}
          {inbox.data?.map((p) => (
            <NavLink
              key={p.id}
              to={userId ? `../${p.id}` : p.id}
              relative="path"
              className={({ isActive }) =>
                cn(
                  'flex h-12 items-center gap-3 rounded-full border border-transparent px-4 text-base outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                  isActive
                    ? 'border-foreground/60 font-medium dark:border-secondary-accent/70'
                    : 'text-foreground/80 hover:bg-foreground/5 dark:hover:bg-secondary-accent/10',
                )
              }
            >
              <span className="min-w-0 flex-1 truncate">{p.username}</span>
              {p.unread > 0 && (
                <span
                  className="rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground"
                  aria-label={t('messages.unread', { count: p.unread })}
                >
                  {p.unread}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {userId && user ? (
          <Thread
            key={userId}
            userId={userId}
            meId={user.id}
            emptyText={t('messages.emptyThread', {
              name: open?.username ?? '',
            })}
          />
        ) : (
          <p className="hidden self-center text-center text-text-secondary md:block">
            {t('messages.pick')}
          </p>
        )}
      </div>
    </div>
  );
}
