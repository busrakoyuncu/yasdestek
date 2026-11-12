import { useTranslation } from 'react-i18next';
import { useSession } from '@/features/auth/useSession';
import { Thread } from './Thread';

// The participant's one conversation, with their counselor.
export function MessagesPage() {
  const { t } = useTranslation();
  const { user } = useSession();

  return (
    <div className="flex min-h-[calc(100svh-10rem)] flex-col gap-4 md:min-h-[calc(100svh-7rem)]">
      <h1 className="text-2xl font-semibold tracking-tight">
        {t('messages.myCounselor')}
      </h1>
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
