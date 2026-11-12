import { SendHorizontal } from 'lucide-react';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { cn } from 'cn';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { errorMessage } from '@/lib/errors';
import { toastError } from '@/lib/toast';
import { threadQuery, useMessageActions, type Message } from './useMessages';

type Props = {
  // the participant a counselor is talking to; a participant passes nothing
  userId?: string;
  meId: string;
  emptyText: string;
};

// One conversation: the messages by day, then the composer. Opening it marks
// what the other side wrote as read. Shared by the participant's single
// thread and the counselor's inbox.
export function Thread({ userId, meId, emptyText }: Props) {
  const { t, i18n } = useTranslation();
  const thread = useQuery(threadQuery(userId));
  const { send, markRead } = useMessageActions(userId);
  const [draft, setDraft] = useState('');
  const end = useRef<HTMLDivElement>(null);
  const marked = useRef(new Set<string>());

  const messages = useMemo(() => thread.data ?? [], [thread.data]);

  // Unread messages addressed to me become read once they are on screen.
  useEffect(() => {
    const unread = messages.filter(
      (m) =>
        m.recipientId === meId &&
        m.readAt === null &&
        !marked.current.has(m.id),
    );
    if (unread.length === 0) return;
    unread.forEach((m) => marked.current.add(m.id));
    markRead.mutate(unread);
  }, [messages, meId, markRead]);

  useEffect(() => {
    end.current?.scrollIntoView({ block: 'end' });
  }, [messages.length]);

  const submit = () => {
    const body = draft.trim();
    if (!body || send.isPending) return;
    send.mutate(body, { onSuccess: () => setDraft(''), onError: toastError });
  };
  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  };

  const day = new Intl.DateTimeFormat(i18n.language, { dateStyle: 'long' });
  const time = new Intl.DateTimeFormat(i18n.language, { timeStyle: 'short' });

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div
        className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto"
        aria-live="polite"
      >
        {thread.isPending && (
          <p className="text-text-secondary" role="status">
            {t('common.loading')}
          </p>
        )}
        {thread.isError && (
          <div className="flex flex-col items-start gap-3" role="alert">
            <p className="text-destructive">{errorMessage(thread.error)}</p>
            <Button
              variant="outline"
              className="h-10 rounded-full px-4"
              onClick={() => void thread.refetch()}
            >
              {t('common.retry')}
            </Button>
          </div>
        )}
        {thread.data?.length === 0 && (
          <p className="max-w-prose text-text-secondary">{emptyText}</p>
        )}
        {groupByDay(messages).map(({ date, items }) => (
          <section
            key={date}
            aria-label={day.format(new Date(date))}
            className="flex flex-col gap-2"
          >
            <p className="py-2 text-center text-xs tracking-wide text-muted-foreground uppercase">
              {day.format(new Date(date))}
            </p>
            {items.map((m) => {
              const mine = m.senderId === meId;
              return (
                <div
                  key={m.id}
                  className={cn('flex', mine ? 'justify-end' : 'justify-start')}
                >
                  <div
                    className={cn(
                      'max-w-[85%] rounded-2xl px-4 py-2.5 text-base leading-relaxed whitespace-pre-line md:max-w-[70%]',
                      mine
                        ? 'rounded-br-md bg-primary text-primary-foreground'
                        : 'rounded-bl-md bg-surface text-foreground',
                    )}
                  >
                    {m.body}
                    <time
                      dateTime={m.createdAt}
                      className={cn(
                        'mt-1 block text-right text-xs',
                        mine
                          ? 'text-primary-foreground/70'
                          : 'text-muted-foreground',
                      )}
                    >
                      {time.format(new Date(m.createdAt))}
                    </time>
                  </div>
                </div>
              );
            })}
          </section>
        ))}
        <div ref={end} />
      </div>

      <form
        className="flex items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <Textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={onKeyDown}
          rows={1}
          maxLength={5000}
          placeholder={t('messages.placeholder')}
          aria-label={t('messages.compose')}
          className="max-h-40 min-h-11 flex-1 resize-none rounded-2xl text-base"
        />
        <Button
          type="submit"
          size="icon"
          className="size-11 shrink-0 rounded-full"
          disabled={!draft.trim() || send.isPending}
          aria-busy={send.isPending}
          aria-label={t('messages.send')}
        >
          <SendHorizontal className="size-5" />
        </Button>
      </form>
    </div>
  );
}

// Messages in order, cut where the calendar day changes.
function groupByDay(messages: Message[]) {
  const groups: { date: string; items: Message[] }[] = [];
  for (const m of messages) {
    const date = m.createdAt.slice(0, 10);
    const last = groups[groups.length - 1];
    if (last && last.date === date) last.items.push(m);
    else groups.push({ date, items: [m] });
  }
  return groups;
}
