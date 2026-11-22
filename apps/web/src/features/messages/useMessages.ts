import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import type { SendMessageInput } from '@yasdestek/shared';
import { api } from '@/lib/api';
import type { CurrentUser } from '@/types/user';

export type Message = {
  id: string;
  senderId: string;
  recipientId: string;
  body: string;
  readAt: string | null;
  createdAt: string;
};

export type InboxEntry = {
  id: string;
  username: string;
  active: boolean;
  unread: number;
};

// No polling: the socket (lib/realtime.ts) marks these queries stale when a
// message is sent or read, and the open screens ask again.

// One conversation, oldest first. A participant has exactly one (with their
// counselor) and passes no id; a counselor names the participant.
export const threadQuery = (userId?: string) =>
  queryOptions({
    queryKey: ['messages', userId ?? 'me'],
    queryFn: () =>
      api.get<Message[]>(userId ? `/messages/${userId}` : '/messages'),
  });

// The counselor's participants with unread counts, unread first.
export const inboxQuery = queryOptions({
  queryKey: ['messages', 'inbox'],
  queryFn: () => api.get<InboxEntry[]>('/messages'),
});

// How many messages wait to be read: for a counselor across the inbox, for
// a participant in their thread. Shares the queries the message screens
// use, so the socket keeps it current. Admins have no messages.
export function useUnreadCount(user: CurrentUser) {
  const counselor = user.role === 'PSYCHOLOGIST';
  const participant = user.role === 'USER';
  const inbox = useQuery({ ...inboxQuery, enabled: counselor });
  const thread = useQuery({ ...threadQuery(), enabled: participant });
  if (counselor) {
    return (inbox.data ?? []).reduce((sum, entry) => sum + entry.unread, 0);
  }
  if (participant) {
    return (thread.data ?? []).filter(
      (m) => m.recipientId === user.id && m.readAt === null,
    ).length;
  }
  return 0;
}

export function useMessageActions(userId?: string) {
  const queryClient = useQueryClient();
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ['messages'] });

  const send = useMutation({
    mutationFn: (body: string) =>
      api.post<Message>('/messages', {
        body,
        recipientId: userId,
      } satisfies SendMessageInput),
    onSuccess: refresh,
  });

  // Marks what the other side wrote as read, one message at a time as the
  // api wants it; a message already read is skipped.
  const markRead = useMutation({
    mutationFn: async (messages: Message[]) => {
      await Promise.all(
        messages.map((m) => api.patch<void>(`/messages/${m.id}/read`)),
      );
    },
    onSuccess: refresh,
  });

  return { send, markRead };
}
