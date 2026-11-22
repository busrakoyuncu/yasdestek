import { useQueryClient, type QueryKey } from '@tanstack/react-query';
import { useEffect } from 'react';
import { io } from 'socket.io-client';

// What each server event makes stale. The socket carries no data: an event
// only says "this changed", and the queries ask the api again.
const stale: Record<string, QueryKey> = {
  messages: ['messages'],
};

// One live connection while someone is signed in (mounted by the app
// shell). The session cookie goes along with the handshake, like any
// request to /api. The server closes it on logout, deactivation, or a
// password change elsewhere; it is not reopened until the next sign-in.
export function useRealtime(userId: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const socket = io({
      path: `${import.meta.env.VITE_API_URL}/socket.io`,
    });
    const refresh = (key: QueryKey) =>
      void queryClient.invalidateQueries({ queryKey: key });

    for (const [event, key] of Object.entries(stale)) {
      socket.on(event, () => refresh(key));
    }
    // Back after a dropped connection (network, a phone asleep): whatever
    // changed meanwhile was not announced, so ask for all of it once.
    socket.io.on('reconnect', () => Object.values(stale).forEach(refresh));

    return () => {
      socket.close();
    };
  }, [queryClient, userId]);
}
