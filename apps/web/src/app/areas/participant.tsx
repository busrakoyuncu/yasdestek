import { Route, Routes } from 'react-router';
import { MessagesPage } from '@/features/messages/MessagesPage';
import { ModuleListPage } from '@/features/modules/ModuleListPage';
import { ModulePage } from '@/features/modules/ModulePage';
import { RulesPage } from '@/features/pages/RulesPage';

// The participant area, one lazily loaded chunk.
export function Component() {
  return (
    <Routes>
      <Route index element={<ModuleListPage />} />
      <Route path="modules/:moduleId" element={<ModulePage />} />
      <Route path="messages" element={<MessagesPage />} />
      <Route path="rules" element={<RulesPage />} />
    </Routes>
  );
}
