import { useTranslation } from 'react-i18next';
import { Route, Routes } from 'react-router';
import { MessagesPage } from '@/features/messages/MessagesPage';
import { RulesPage } from '@/features/pages/RulesPage';

// The participant area, one lazily loaded chunk. Screens arrive in step 14.
function Home() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-3xl font-semibold tracking-tight text-balance">
        {t('app.home.title')}
      </h1>
      <p className="text-lg leading-relaxed text-pretty text-text-secondary">
        {t('app.home.intro')}
      </p>
    </div>
  );
}

export function Component() {
  return (
    <Routes>
      <Route index element={<Home />} />
      <Route path="messages" element={<MessagesPage />} />
      <Route path="rules" element={<RulesPage />} />
    </Routes>
  );
}
