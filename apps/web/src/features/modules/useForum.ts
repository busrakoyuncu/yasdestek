import { queryOptions } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { MediaFile } from './useMyResponse';

type Author = { id: string; username: string };

// A removed comment keeps its place with no text and no author, so the
// forum can show a placeholder where it was.
export type ForumComment =
  | {
      id: string;
      text: string;
      author: Author;
      createdAt: string;
      deletedAt: null;
    }
  | {
      id: string;
      text: null;
      author: null;
      createdAt: string;
      deletedAt: string;
    };

// A member's shared response with its files and comments, oldest first.
export type ForumPost = {
  id: string;
  text: string;
  user: Author;
  createdAt: string;
  updatedAt: string;
  files: MediaFile[];
  comments: ForumComment[];
};

// One group's forum for one module: what its members shared.
export const forumQuery = (groupId: string, moduleId: string) =>
  queryOptions({
    queryKey: ['forum', groupId, moduleId],
    queryFn: () => api.get<ForumPost[]>(`/groups/${groupId}/forum/${moduleId}`),
  });
