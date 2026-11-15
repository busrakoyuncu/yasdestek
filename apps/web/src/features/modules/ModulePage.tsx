import { useQuery } from '@tanstack/react-query';
import { ChevronLeft } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useBlocker, useParams } from 'react-router';
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
import { Textarea } from '@/components/ui/textarea';
import { errorMessage } from '@/lib/errors';
import { toastError, toastSuccess } from '@/lib/toast';
import { Attachments } from './Attachments';
import { moduleQuery } from './useModules';
import { myResponseQuery, useSaveResponse } from './useMyResponse';

// How long the typing must rest before a draft saves itself.
const AUTOSAVE_DELAY = 1500;

// One module for a participant: what it asks, then the page they write on.
// Text only for now; audio and images join beside it next.
export function ModulePage() {
  const { t, i18n } = useTranslation();
  const { moduleId = '' } = useParams();
  const module = useQuery(moduleQuery(moduleId));
  const mine = useQuery(myResponseQuery(moduleId));
  const save = useSaveResponse(moduleId);
  const [text, setText] = useState<string | null>(null);

  // The draft starts from what is saved; typing takes over from there.
  const saved = mine.data?.text ?? '';
  const draft = text ?? saved;
  // The api trims what it stores, so spaces at the ends are not a change.
  const dirty = draft.trim() !== saved;
  const published = mine.data?.published ?? false;

  // A private draft saves itself once the typing rests. Shared text never
  // does: what the group reads changes only when the writer says so. A draft
  // that failed to save waits for the next change instead of retrying.
  const [failed, setFailed] = useState<string | null>(null);
  const { mutate: saveResponse, isPending: saving } = save;
  useEffect(() => {
    if (!dirty || published || saving || draft === failed) return;
    const timer = setTimeout(
      () =>
        saveResponse(
          { text: draft, published: false },
          { onError: () => setFailed(draft) },
        ),
      AUTOSAVE_DELAY,
    );
    return () => clearTimeout(timer);
  }, [draft, dirty, published, saving, failed, saveResponse]);

  // Leaving with unsaved words asks first, both inside the app and on close.
  const blocker = useBlocker(dirty);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  // The kind way out of the leave dialog for a private draft: keep the words,
  // then go. A failed save stays on the page so nothing is lost.
  const saveAndLeave = () =>
    save.mutate(
      { text: draft, published: false },
      { onSuccess: () => blocker.proceed?.(), onError: toastError },
    );

  const persist = (published: boolean) =>
    save.mutate(
      { text: draft, published },
      {
        onSuccess: () => {
          setText(null);
          toastSuccess(t(published ? 'writing.shared' : 'writing.draftSaved'));
        },
        onError: toastError,
      },
    );

  if (module.isPending || mine.isPending) {
    return (
      <p className="text-text-secondary" role="status">
        {t('common.loading')}
      </p>
    );
  }
  if (module.isError || mine.isError) {
    return (
      <div className="flex flex-col items-start gap-3" role="alert">
        <p className="text-destructive">
          {errorMessage(module.error ?? mine.error)}
        </p>
        <Button asChild variant="outline" className="h-10 rounded-full px-4">
          <Link to="/app">{t('writing.back')}</Link>
        </Button>
      </div>
    );
  }

  const files = mine.data?.files ?? [];
  const when = new Intl.DateTimeFormat(i18n.language, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  return (
    <article className="flex flex-col gap-8">
      <Link
        to="/app"
        className="inline-flex items-center gap-1 self-start text-sm text-text-secondary hover:text-foreground"
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
        {t('writing.back')}
      </Link>

      {/* Like a desk: the brief on the left, the page on the right. On a phone
          the brief is read first, then the page. */}
      <div className="grid gap-10 xl:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] xl:gap-16">
        <div className="flex flex-col gap-7 xl:sticky xl:top-8 xl:self-start">
          <header className="flex flex-col gap-4">
            <h1 className="text-3xl font-semibold tracking-tight text-balance md:text-4xl">
              {module.data.title}
            </h1>
            <p className="text-lg leading-relaxed text-pretty whitespace-pre-line text-text-secondary">
              {module.data.description}
            </p>
          </header>

          <section
            aria-labelledby="module-rules"
            className="flex flex-col gap-2 border-t border-border pt-5"
          >
            <h2 id="module-rules" className="font-medium">
              {t('writing.rules')}
            </h2>
            <p className="leading-relaxed text-pretty whitespace-pre-line text-text-secondary">
              {module.data.rules}
            </p>
          </section>

          <section
            aria-labelledby="module-questions"
            className="flex flex-col gap-3 border-t border-border pt-5"
          >
            <h2 id="module-questions" className="font-medium">
              {t('writing.questions')}
            </h2>
            <ol className="flex flex-col gap-3">
              {module.data.questions.map((question, index) => (
                <li key={index} className="flex gap-3 leading-relaxed">
                  <span className="w-5 shrink-0 text-right font-medium text-secondary-accent tabular-nums">
                    {index + 1}
                  </span>
                  <span className="text-pretty">{question}</span>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <div className="flex min-w-0 max-w-[70ch] flex-col gap-8">
          {/* what people write is set in the body face, on a raised page */}
          <section
            aria-labelledby="module-response"
            className="flex flex-col gap-3"
          >
            <h2 id="module-response" className="text-xl font-medium">
              {t('writing.yourResponse')}
            </h2>
            <Textarea
              value={draft}
              onChange={(event) => setText(event.target.value)}
              rows={10}
              maxLength={50_000}
              placeholder={t('writing.placeholder')}
              aria-label={t('writing.yourResponse')}
              className="min-h-64 w-full resize-y rounded-2xl border-border bg-surface-raised px-6 py-5 font-body text-[17px] leading-8 dark:bg-surface"
            />
            {!published && (
              <p
                className="min-h-5 text-sm text-text-secondary"
                aria-live="polite"
              >
                {saving
                  ? t('writing.autosave.saving')
                  : dirty
                    ? draft === failed && t('writing.autosave.failed')
                    : mine.data && t('writing.autosave.saved')}
              </p>
            )}
          </section>

          {(module.data.allowImages ||
            module.data.allowAudio ||
            files.length > 0) && (
            <Attachments
              moduleId={moduleId}
              files={files}
              allowImages={module.data.allowImages}
              allowAudio={module.data.allowAudio}
            />
          )}

          {/* the way out of the page: where it stands, then what to do with it */}
          <footer className="flex flex-col gap-4 border-t border-border pt-6">
            <p className="text-sm text-text-secondary" aria-live="polite">
              {published
                ? t('writing.sharedAt', {
                    when: when.format(new Date(mine.data!.updatedAt)),
                  })
                : mine.data
                  ? t('writing.savedAt', {
                      when: when.format(new Date(mine.data.updatedAt)),
                    })
                  : t('writing.nothingSaved')}
              {dirty && ` · ${t('writing.unsaved')}`}
            </p>
            <div className="flex flex-wrap gap-3">
              {!published && (
                <Button
                  variant="outline"
                  className="h-11 rounded-full px-5 text-base"
                  disabled={save.isPending || !dirty}
                  onClick={() => persist(false)}
                >
                  {t('writing.saveDraft')}
                </Button>
              )}
              <Button
                className="h-11 rounded-full px-5 text-base"
                disabled={
                  save.isPending || (published && !dirty) || draft.trim() === ''
                }
                aria-busy={save.isPending}
                onClick={() => persist(true)}
              >
                {t(published ? 'writing.saveShared' : 'writing.share')}
              </Button>
            </div>
            <p className="text-sm text-pretty text-text-secondary">
              {t(published ? 'writing.sharedNote' : 'writing.shareNote')}
            </p>
          </footer>
        </div>
      </div>

      <AlertDialog open={blocker.state === 'blocked'}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('writing.leave.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('writing.leave.body')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="h-10 rounded-full px-4"
              onClick={() => blocker.reset?.()}
            >
              {t('writing.leave.stay')}
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              className="h-10 rounded-full px-4"
              onClick={() => blocker.proceed?.()}
            >
              {t('writing.leave.discard')}
            </AlertDialogAction>
            {!published && (
              <Button
                className="h-10 rounded-full px-4"
                disabled={save.isPending}
                aria-busy={save.isPending}
                onClick={saveAndLeave}
              >
                {t(
                  save.isPending
                    ? 'writing.autosave.saving'
                    : 'writing.leave.saveAndLeave',
                )}
              </Button>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </article>
  );
}
