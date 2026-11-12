import { Check, Copy } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';

// The generated password, shown exactly once: after creating an account and
// after a reset. Nothing stores it; the person reading this screen has to
// pass it on and the api forces a change at first sign-in.
export function OneTimePassword({
  username,
  password,
}: {
  username: string;
  password: string;
}) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
    } catch {
      // clipboard refused (insecure context, permissions): the text stays selectable
      window
        .getSelection()
        ?.selectAllChildren(document.getElementById('one-time-password')!);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-base">
        <dt className="text-text-secondary">{t('people.columns.username')}</dt>
        <dd className="font-medium">{username}</dd>
        <dt className="text-text-secondary">{t('people.password.title')}</dt>
        <dd className="flex items-center gap-2">
          <code
            id="one-time-password"
            className="rounded-lg bg-surface px-2 py-1 font-mono text-lg tracking-wide select-all"
          >
            {password}
          </code>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-9 rounded-full px-3"
            onClick={() => void copy()}
          >
            {copied ? (
              <Check className="size-4" aria-hidden="true" />
            ) : (
              <Copy className="size-4" aria-hidden="true" />
            )}
            {t(copied ? 'people.password.copied' : 'people.password.copy')}
          </Button>
        </dd>
      </dl>
      <p className="text-sm leading-6 text-pretty text-text-secondary">
        {t('people.password.note')}
      </p>
    </div>
  );
}
