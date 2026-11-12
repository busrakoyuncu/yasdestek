import {
  queryOptions,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import type { SendMessageInput } from '@yasdestek/shared';
import { api } from '@/lib/api';

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

// No push channel: open screens ask again every half minute.
const POLL = 30_000;

// One conversation, oldest first. A participant has exactly one (with their
// counselor) and passes no id; a counselor names the participant.
export const threadQuery = (userId?: string) =>
  queryOptions({
    queryKey: ['messages', userId ?? 'me'],
    queryFn: () =>
      api.get<Message[]>(userId ? `/messages/${userId}` : '/messages'),
    refetchInterval: POLL,
  });

// The counselor's participants with unread counts, unread first.
export const inboxQuery = queryOptions({
  queryKey: ['messages', 'inbox'],
  queryFn: () => api.get<InboxEntry[]>('/messages'),
  refetchInterval: POLL,
});

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
