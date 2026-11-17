import { useQuery } from '@tanstack/react-query';
import { fileKind } from '@yasdestek/shared';
import { ChevronDown, ChevronLeft, SendHorizontal } from 'lucide-react';
import { useId, useState, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useSession } from '@/features/auth/useSession';
import { errorMessage } from '@/lib/errors';
import { toastError } from '@/lib/toast';
import { fileUrl } from './useFiles';
import { forumQuery, useAddComment, type ForumPost } from './useForum';
import { moduleQuery } from './useModules';

// What a participant's group shared for one module, each response with the
// comments written under it. Writing happens on the module screen; this one
// is for reading the others, so theirs come first and the reader's own last.
export function ForumPage() {
  const { t } = useTranslation();
  const { moduleId = '' } = useParams();
  const { user } = useSession();
  const groupId = user?.groupId ?? '';
  const module = useQuery(moduleQuery(moduleId));
  const forum = useQuery({
    ...forumQuery(groupId, moduleId),
    enabled: groupId !== '',
  });

  const back = (
    <Link
      to="/app/forums"
      className="inline-flex items-center gap-1 self-start text-sm text-text-secondary hover:text-foreground"
    >
      <ChevronLeft className="size-4" aria-hidden="true" />
      {t('forum.back')}
    </Link>
  );
  const page = 'mx-auto flex w-full max-w-2xl flex-col';

  if (!groupId) {
    return (
      <div className={`${page} gap-6`}>
        {back}
        <p className="text-text-secondary">{t('forum.noGroup')}</p>
      </div>
    );
  }
  if (module.isPending || forum.isPending) {
    return (
      <div className={`${page} gap-6`}>
        {back}
        <p className="text-text-secondary" role="status">
          {t('common.loading')}
        </p>
      </div>
    );
  }
  if (module.isError || forum.isError) {
    return (
      <div className={`${page} items-start gap-6`} role="alert">
        {back}
        <p className="text-destructive">
          {errorMessage(module.error ?? forum.error)}
        </p>
        <Button
          variant="outline"
          className="h-10 rounded-full px-4"
          onClick={() => {
            if (module.isError) void module.refetch();
            if (forum.isError) void forum.refetch();
          }}
        >
          {t('common.retry')}
        </Button>
      </div>
    );
  }

  const forumKey = { groupId, moduleId };
  const others = forum.data.filter((post) => post.user.id !== user?.id);
  const mine = forum.data.find((post) => post.user.id === user?.id);
  // Without a shared response of their own, the way to write one.
  const writeLink = !mine && (
    <p className="text-text-secondary">
      {t('forum.notShared')}{' '}
      <Link
        to={`/app/modules/${moduleId}`}
        className="font-medium text-primary underline-offset-4 hover:underline"
      >
        {t('forum.write')}
      </Link>
    </p>
  );

  return (
    <article className={`${page} gap-8`}>
      {back}
      <header className="flex flex-col gap-3">
        <h1 className="text-3xl font-semibold tracking-tight text-balance">
          {module.data.title}
        </h1>
        <p className="text-lg leading-relaxed text-pretty text-text-secondary">
          {t('forum.lead')}
        </p>
      </header>

      {module.data.questions.length > 0 && (
        <details className="group rounded-2xl border border-border px-5">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 font-medium [&::-webkit-details-marker]:hidden">
            {t('writing.questions')}
            <ChevronDown
              className="size-4 shrink-0 text-text-secondary transition-transform group-open:rotate-180"
              aria-hidden="true"
            />
          </summary>
          <ol className="flex flex-col gap-3 pb-4">
            {module.data.questions.map((question, index) => (
              <li key={index} className="flex gap-3 leading-relaxed">
                <span className="w-5 shrink-0 text-right font-medium text-secondary-accent tabular-nums">
                  {index + 1}
                </span>
                <span className="text-pretty">{question}</span>
              </li>
            ))}
          </ol>
        </details>
      )}

      {others.length === 0 ? (
        <p className="text-text-secondary">{t('forum.empty')}</p>
      ) : (
        <ol className="flex flex-col gap-10">
          {others.map((post) => (
            <li key={post.id}>
              <Post post={post} forum={forumKey} />
            </li>
          ))}
        </ol>
      )}

      {mine ? <Post post={mine} forum={forumKey} own /> : writeLink}
    </article>
  );
}

type ForumKey = { groupId: string; moduleId: string };

// One member's response, then the comments under it and a place to add one.
// The reader's own is named as theirs rather than by username.
function Post({
  post,
  forum,
  own = false,
}: {
  post: ForumPost;
  forum: ForumKey;
  own?: boolean;
}) {
  const { t, i18n } = useTranslation();
  const headingId = useId();
  const when = new Intl.DateTimeFormat(i18n.language, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  const audio = post.files.filter((f) => fileKind(f.mimeType) === 'audio');
  const images = post.files.filter((f) => fileKind(f.mimeType) === 'image');

  return (
    <section
      aria-labelledby={headingId}
      className="flex flex-col gap-4 border-t border-border pt-6"
    >
      <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 id={headingId} className="text-lg font-medium">
          {own ? t('forum.yours') : post.user.username}
        </h2>
        <span className="text-sm text-text-secondary">
          {when.format(new Date(post.updatedAt))}
        </span>
      </header>

      {post.text && (
        <p className="rounded-2xl border border-border bg-surface-raised px-6 py-5 font-body text-[17px] leading-8 whitespace-pre-line dark:bg-surface">
          {post.text}
        </p>
      )}

      {audio.length > 0 && (
        <ul className="flex flex-col gap-2">
          {audio.map((file, index) => (
            <li key={file.id}>
              <audio
                controls
                preload="metadata"
                src={fileUrl(file.id)}
                className="w-full"
                aria-label={t('attachments.recording', { n: index + 1 })}
              />
            </li>
          ))}
        </ul>
      )}

      {images.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {images.map((file, index) => (
            <li key={file.id}>
              <a href={fileUrl(file.id)} target="_blank" rel="noreferrer">
                <img
                  src={fileUrl(file.id)}
                  alt={t('attachments.image', { n: index + 1 })}
                  className="aspect-square w-full rounded-2xl border border-border object-cover"
                />
              </a>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-col gap-4 border-l border-border pl-5">
        {post.comments.length > 0 && (
          <ul aria-label={t('forum.comments')} className="flex flex-col gap-4">
            {post.comments.map((comment) => (
              <li key={comment.id} className="flex flex-col gap-1">
                {comment.author === null ? (
                  <p className="text-sm text-text-secondary italic">
                    {t('forum.removed')}
                  </p>
                ) : (
                  <>
                    <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
                      <span className="font-medium">
                        {comment.author.username}
                      </span>
                      <span className="text-text-secondary">
                        {when.format(new Date(comment.createdAt))}
                      </span>
                    </p>
                    <p className="font-body leading-relaxed text-pretty whitespace-pre-line">
                      {comment.text}
                    </p>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
        <CommentForm responseId={post.id} forum={forum} />
      </div>
    </section>
  );
}

// Writes a comment at the end of a response's thread. Enter sends, Shift and
// Enter starts a new line, as in messages.
function CommentForm({
  responseId,
  forum,
}: {
  responseId: string;
  forum: ForumKey;
}) {
  const { t } = useTranslation();
  const add = useAddComment(forum.groupId, forum.moduleId);
  const [draft, setDraft] = useState('');

  const submit = () => {
    const text = draft.trim();
    if (!text || add.isPending) return;
    add.mutate(
      { responseId, text },
      { onSuccess: () => setDraft(''), onError: toastError },
    );
  };
  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  };

  return (
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
        placeholder={t('forum.comment.placeholder')}
        aria-label={t('forum.comment.label')}
        className="max-h-40 min-h-11 flex-1 resize-none rounded-2xl font-body text-base"
      />
      <Button
        type="submit"
        size="icon"
        className="size-11 shrink-0 rounded-full"
        disabled={!draft.trim() || add.isPending}
        aria-busy={add.isPending}
        aria-label={t('forum.comment.send')}
      >
        <SendHorizontal className="size-5" />
      </Button>
    </form>
  );
}
