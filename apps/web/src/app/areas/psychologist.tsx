import { useTranslation } from 'react-i18next';
import { Route, Routes } from 'react-router';
import { ComingSoon } from '@/components/ComingSoon';
import { RulesPage } from '@/features/pages/RulesPage';
import { PeoplePage } from '@/features/people/PeoplePage';

// The counselor area, one lazily loaded chunk. Screens arrive in step 13.
export function Component() {
  const { t } = useTranslation();
  return (
    <Routes>
      <Route index element={<PeoplePage role="USER" />} />
      <Route path="groups" element={<ComingSoon title={t('nav.groups')} />} />
      <Route path="modules" element={<ComingSoon title={t('nav.modules')} />} />
      <Route path="inbox" element={<ComingSoon title={t('nav.inbox')} />} />
      <Route path="rules" element={<RulesPage />} />
    </Routes>
  );
}
