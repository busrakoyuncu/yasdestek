import { useQueries, useQuery } from '@tanstack/react-query';
import { Pencil } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useBlocker } from 'react-router';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useSession } from '@/features/auth/useSession';
import { errorMessage } from '@/lib/errors';
import { LOCALE_NAMES, LOCALES, type Locale } from '@/lib/i18n';
import { toastError, toastSuccess } from '@/lib/toast';
import { pageQuery, useSavePage } from './usePage';

const SLUG = 'general-rules';

// The platform-wide "Genel Kurallar" text, the same for every role, in the
// interface language. Plain text from the api; blank lines separate paragraphs.
// Admins can switch the page into an editor for all three languages.
export function RulesPage() {
  const { t, i18n } = useTranslation();
  const { user } = useSession();
  const page = useQuery(pageQuery(SLUG, i18n.language));
  const [editing, setEditing] = useState(false);
  const admin = user?.role === 'ADMIN';

  return (
    <article className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">
          {t('nav.rules')}
        </h1>
        {admin && !editing && (
          <Button
            variant="outline"
            className="h-10 rounded-full px-4"
            onClick={() => setEditing(true)}
          >
            <Pencil className="size-4" aria-hidden="true" />
            {t('pages.edit')}
          </Button>
        )}
      </div>

      {editing ? (
        <RulesEditor
          initial={i18n.language as Locale}
          onDone={() => setEditing(false)}
        />
      ) : (
        <>
          {page.isPending && (
            <p className="text-text-secondary" role="status">
              {t('common.loading')}
            </p>
          )}
          {page.isError && (
            <div className="flex flex-col items-start gap-3" role="alert">
              <p className="text-destructive">{errorMessage(page.error)}</p>
              <Button
                variant="outline"
                className="h-10 rounded-full px-4"
                onClick={() => void page.refetch()}
              >
                {t('common.retry')}
              </Button>
            </div>
          )}
          {page.data && (
            <div className="flex max-w-prose flex-col gap-4 text-base leading-7">
              {page.data.content.split(/\n\s*\n/).map((paragraph, i) => (
                <p key={i} className="whitespace-pre-line text-pretty">
                  {paragraph.trim()}
                </p>
              ))}
            </div>
          )}
        </>
      )}
    </article>
  );
}

// One tab per language, each with its own text and its own save. Unsaved
// text is kept per tab while switching between them, and leaving the editor
// or the page with any of it asks first.
function RulesEditor({
  initial,
  onDone,
}: {
  initial: Locale;
  onDone: () => void;
}) {
  const { t } = useTranslation();
  const pages = useQueries({
    queries: LOCALES.map((locale) => pageQuery(SLUG, locale)),
  });
  const save = useSavePage(SLUG);
  const [drafts, setDrafts] = useState<Partial<Record<Locale, string>>>({});
  const [confirmClose, setConfirmClose] = useState(false);

  const saved = (locale: Locale) =>
    pages[LOCALES.indexOf(locale)].data?.content ?? '';
  const dirty = (locale: Locale) =>
    drafts[locale] !== undefined && drafts[locale].trim() !== saved(locale);
  const anyDirty = LOCALES.some(dirty);

  const blocker = useBlocker(anyDirty);
  useEffect(() => {
    if (!anyDirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [anyDirty]);

  const persist = (locale: Locale) => {
    const content = drafts[locale];
    if (content === undefined) return;
    save.mutate(
      { locale, content },
      {
        onSuccess: () => {
          setDrafts((current) => {
            const next = { ...current };
            delete next[locale];
            return next;
          });
          toastSuccess(t('pages.saved', { language: LOCALE_NAMES[locale] }));
        },
        onError: toastError,
      },
    );
  };

  const failed = pages.find((p) => p.isError);
  if (failed) {
    return (
      <div className="flex flex-col items-start gap-3" role="alert">
        <p className="text-destructive">{errorMessage(failed.error)}</p>
        <Button
          variant="outline"
          className="h-10 rounded-full px-4"
          onClick={() => pages.forEach((p) => p.isError && void p.refetch())}
        >
          {t('common.retry')}
        </Button>
      </div>
    );
  }
  if (pages.some((p) => p.isPending)) {
    return (
      <p className="text-text-secondary" role="status">
        {t('common.loading')}
      </p>
    );
  }

  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <p className="text-sm text-pretty text-text-secondary">
        {t('pages.hint')}
      </p>
      <Tabs defaultValue={initial}>
        <TabsList className="h-11 rounded-full p-1">
          {LOCALES.map((locale) => (
            <TabsTrigger
              key={locale}
              value={locale}
              className="h-9 rounded-full px-4 text-sm"
            >
              {LOCALE_NAMES[locale]}
              {dirty(locale) && (
                <>
                  <span
                    className="size-1.5 rounded-full bg-secondary-accent"
                    aria-hidden="true"
                  />
                  <span className="sr-only">{t('pages.unsaved')}</span>
                </>
              )}
            </TabsTrigger>
          ))}
        </TabsList>
        {LOCALES.map((locale) => {
          const text = drafts[locale] ?? saved(locale);
          return (
            <TabsContent
              key={locale}
              value={locale}
              className="flex flex-col gap-3 pt-2"
            >
              <Textarea
                value={text}
                onChange={(event) =>
                  setDrafts((current) => ({
                    ...current,
                    [locale]: event.target.value,
                  }))
                }
                rows={16}
                maxLength={20_000}
                aria-label={t('pages.label', {
                  language: LOCALE_NAMES[locale],
                })}
                className="min-h-80 w-full resize-y rounded-2xl px-5 py-4 text-base leading-7 md:text-base"
              />
              <div className="flex flex-wrap gap-3">
                <Button
                  className="h-11 rounded-full px-5 text-base"
                  disabled={!dirty(locale) || !text.trim() || save.isPending}
                  aria-busy={save.isPending}
                  onClick={() => persist(locale)}
                >
                  {t('pages.save', { language: LOCALE_NAMES[locale] })}
                </Button>
              </div>
            </TabsContent>
          );
        })}
      </Tabs>
      <Button
        variant="outline"
        className="h-11 self-start rounded-full px-5 text-base"
        onClick={() => (anyDirty ? setConfirmClose(true) : onDone())}
      >
        {t('pages.done')}
      </Button>

      <AlertDialog open={confirmClose || blocker.state === 'blocked'}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('pages.leave.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('pages.leave.body')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col">
            <AlertDialogCancel
              className="h-10 rounded-full px-4"
              onClick={() => {
                setConfirmClose(false);
                blocker.reset?.();
              }}
            >
              {t('pages.leave.stay')}
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              className="h-10 rounded-full px-4"
              onClick={() => {
                if (blocker.state === 'blocked') blocker.proceed?.();
                else onDone();
              }}
            >
              {t('pages.leave.discard')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
