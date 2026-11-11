import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { errorMessage } from '@/lib/errors';
import { pageQuery } from './usePage';

// The platform-wide "Genel Kurallar" text, the same for every role. Plain
// text from the api; blank lines separate paragraphs.
export function RulesPage() {
  const { t } = useTranslation();
  const page = useQuery(pageQuery('general-rules'));

  return (
    <article className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">
        {t('nav.rules')}
      </h1>
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
    </article>
  );
}
