import { Route, Routes } from 'react-router';
import { MessagesPage } from '@/features/messages/MessagesPage';
import { ForumListPage } from '@/features/modules/ForumListPage';
import { ForumPage } from '@/features/modules/ForumPage';
import { ModuleListPage } from '@/features/modules/ModuleListPage';
import { ModulePage } from '@/features/modules/ModulePage';
import { RulesPage } from '@/features/pages/RulesPage';

// The participant area, one lazily loaded chunk.
export function Component() {
  return (
    <Routes>
      <Route index element={<ModuleListPage />} />
      <Route path="modules/:moduleId" element={<ModulePage />} />
      <Route path="forums" element={<ForumListPage />} />
      <Route path="forums/:moduleId" element={<ForumPage />} />
      <Route path="messages" element={<MessagesPage />} />
      <Route path="rules" element={<RulesPage />} />
    </Routes>
  );
}
