import { vi } from 'vitest';

// Stands in for a socket.io-client connection in every test (mocked in
// setup.ts). It remembers what the app listens for, so a test can play the
// server: `serverSends('messages')`, or `reconnects()` after a dropped line.
export function createFakeSocket() {
  const events: Record<string, () => void> = {};
  const manager: Record<string, () => void> = {};
  const socket = {
    on: vi.fn((event: string, handler: () => void) => {
      events[event] = handler;
      return socket;
    }),
    io: {
      on: vi.fn((event: string, handler: () => void) => {
        manager[event] = handler;
      }),
    },
    close: vi.fn(),
    serverSends: (event: string) => events[event]?.(),
    reconnects: () => manager.reconnect?.(),
  };
  return socket;
}

export type FakeSocket = ReturnType<typeof createFakeSocket>;
