import { useTranslation } from 'react-i18next';
import { Route, Routes } from 'react-router';
import { ComingSoon } from '@/components/ComingSoon';
import { RulesPage } from '@/features/pages/RulesPage';
import { PeoplePage } from '@/features/people/PeoplePage';

// The admin area, one lazily loaded chunk. Screens arrive in step 13.
export function Component() {
  const { t } = useTranslation();
  return (
    <Routes>
      <Route index element={<PeoplePage role="PSYCHOLOGIST" admin />} />
      <Route path="participants" element={<PeoplePage role="USER" admin />} />
      <Route path="modules" element={<ComingSoon title={t('nav.modules')} />} />
      <Route
        path="analytics"
        element={<ComingSoon title={t('nav.analytics')} />}
      />
      <Route path="rules" element={<RulesPage />} />
    </Routes>
  );
}
