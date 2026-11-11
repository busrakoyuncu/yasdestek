import { useTranslation } from 'react-i18next';
import { Route, Routes } from 'react-router';
import { ComingSoon } from '@/components/ComingSoon';
import { RulesPage } from '@/features/pages/RulesPage';

// The admin area, one lazily loaded chunk. Screens arrive in step 13.
export function Component() {
  const { t } = useTranslation();
  return (
    <Routes>
      <Route index element={<ComingSoon title={t('nav.counselors')} />} />
      <Route
        path="participants"
        element={<ComingSoon title={t('nav.participants')} />}
      />
      <Route path="modules" element={<ComingSoon title={t('nav.modules')} />} />
      <Route
        path="analytics"
        element={<ComingSoon title={t('nav.analytics')} />}
      />
      <Route path="rules" element={<RulesPage />} />
    </Routes>
  );
}
