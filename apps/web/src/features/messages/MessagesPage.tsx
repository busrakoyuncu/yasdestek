import { useTranslation } from 'react-i18next';
import { useSession } from '@/features/auth/useSession';
import { Thread } from './Thread';

// The participant's one conversation, with their counselor.
export function MessagesPage() {
  const { t } = useTranslation();
  const { user } = useSession();

  return (
    // Exactly one screen tall (minus the top bar, the page padding and, on a
    // phone, the tab bar), so only the messages scroll and the text box stays
    // at the bottom.
    <div className="mx-auto flex h-[calc(100dvh-12rem)] w-full max-w-2xl flex-col gap-4 md:h-[calc(100dvh-7rem)]">
      <h1 className="title-page">{t('messages.myCounselor')}</h1>
      {user?.psychologistId ? (
        <Thread meId={user.id} emptyText={t('messages.emptyParticipant')} />
      ) : (
        <p className="max-w-prose text-text-secondary">
          {t('messages.noCounselor')}
        </p>
      )}
    </div>
  );
}
