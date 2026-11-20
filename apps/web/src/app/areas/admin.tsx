import { Route, Routes } from 'react-router';
import { AnalyticsPage } from '@/features/analytics/AnalyticsPage';
import { RulesPage } from '@/features/pages/RulesPage';
import { ModulesPage } from '@/features/modules/ModulesPage';
import { PeoplePage } from '@/features/people/PeoplePage';

// The admin area, one lazily loaded chunk.
export function Component() {
  return (
    <Routes>
      <Route index element={<PeoplePage role="PSYCHOLOGIST" admin />} />
      <Route path="participants" element={<PeoplePage role="USER" admin />} />
      <Route path="modules" element={<ModulesPage />} />
      <Route path="analytics" element={<AnalyticsPage />} />
      <Route path="rules" element={<RulesPage />} />
    </Routes>
  );
}
