import { Route, Routes } from 'react-router';
import { RulesPage } from '@/features/pages/RulesPage';
import { GroupsPage } from '@/features/groups/GroupsPage';
import { InboxPage } from '@/features/messages/InboxPage';
import { ModulesPage } from '@/features/modules/ModulesPage';
import { PeoplePage } from '@/features/people/PeoplePage';

// The counselor area, one lazily loaded chunk. Screens arrive in step 13.
export function Component() {
  return (
    <Routes>
      <Route index element={<PeoplePage role="USER" />} />
      <Route path="groups" element={<GroupsPage />} />
      <Route path="modules" element={<ModulesPage />} />
      <Route path="inbox" element={<InboxPage />} />
      <Route path="inbox/:userId" element={<InboxPage />} />
      <Route path="rules" element={<RulesPage />} />
    </Routes>
  );
}
