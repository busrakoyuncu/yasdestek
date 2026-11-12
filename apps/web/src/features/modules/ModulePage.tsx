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
import { moduleQuery } from './useModules';
import { myResponseQuery, useSaveResponse } from './useMyResponse';

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
  const dirty = draft !== saved;

  // Leaving with unsaved words asks first, both inside the app and on close.
  const blocker = useBlocker(dirty);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

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

  const when = new Intl.DateTimeFormat(i18n.language, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  const published = mine.data?.published ?? false;

  return (
    <article className="flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        <Link
          to="/app"
          className="inline-flex items-center gap-1 self-start text-sm text-text-secondary hover:text-foreground"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
          {t('writing.back')}
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight text-balance">
          {module.data.title}
        </h1>
        <p className="max-w-prose text-lg leading-relaxed text-pretty whitespace-pre-line text-text-secondary">
          {module.data.description}
        </p>
      </div>

      {/* the module's own rules, set apart as the PRD asks */}
      <section
        aria-labelledby="module-rules"
        className="flex max-w-prose flex-col gap-2 rounded-2xl bg-surface px-5 py-4"
      >
        <h2
          id="module-rules"
          className="text-sm font-medium tracking-wide text-text-secondary uppercase"
        >
          {t('writing.rules')}
        </h2>
        <p className="leading-relaxed whitespace-pre-line">
          {module.data.rules}
        </p>
      </section>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start">
        {/* the page they write on; what people write is set in the body face */}
        <section
          aria-labelledby="module-response"
          className="flex flex-col gap-4"
        >
          <h2 id="module-response" className="text-xl font-medium">
            {t('writing.yourResponse')}
          </h2>
          <Textarea
            value={draft}
            onChange={(event) => setText(event.target.value)}
            rows={14}
            maxLength={50_000}
            placeholder={t('writing.placeholder')}
            aria-label={t('writing.yourResponse')}
            className="min-h-80 max-w-prose resize-y rounded-2xl p-4 font-body text-base leading-7"
          />
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
          <p className="max-w-prose text-sm text-text-secondary">
            {t(published ? 'writing.sharedNote' : 'writing.shareNote')}
          </p>
        </section>

        <aside
          aria-labelledby="module-questions"
          className="flex flex-col gap-3 lg:order-none order-first"
        >
          <h2
            id="module-questions"
            className="text-sm font-medium tracking-wide text-text-secondary uppercase"
          >
            {t('writing.questions')}
          </h2>
          <ol className="flex flex-col gap-3">
            {module.data.questions.map((question, index) => (
              <li key={index} className="flex gap-3 leading-relaxed">
                <span className="w-5 shrink-0 text-right text-text-secondary tabular-nums">
                  {index + 1}
                </span>
                <span className="text-pretty">{question}</span>
              </li>
            ))}
          </ol>
        </aside>
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
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </article>
  );
}
