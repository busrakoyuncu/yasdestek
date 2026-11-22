import { QueryClientProvider, type QueryKey } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { io } from 'socket.io-client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { queryClient } from '@/lib/query';
import type { FakeSocket } from '@/test/fakeSocket';
import { useRealtime } from './realtime';

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);
const mount = (userId = 'u1') =>
  renderHook(({ id }) => useRealtime(id), {
    wrapper,
    initialProps: { id: userId },
  });
const socket = (n = -1) =>
  vi.mocked(io).mock.results.at(n)!.value as FakeSocket;

// Cached screens: the inbox, a thread, and something unrelated.
const inbox = ['messages', 'inbox'];
const thread = ['messages', 'me'];
const modules = ['modules'];
const stale = (key: QueryKey) =>
  queryClient.getQueryState(key)?.isInvalidated ?? false;

describe('useRealtime', () => {
  beforeEach(() => {
    vi.mocked(io).mockClear();
    queryClient.clear();
    for (const key of [inbox, thread, modules]) {
      queryClient.setQueryData(key, []);
    }
  });

  it('opens one connection on the api path', () => {
    mount();
    expect(io).toHaveBeenCalledTimes(1);
    expect(io).toHaveBeenCalledWith({ path: '/api/socket.io' });
  });

  it('a messages event makes every message query stale, nothing else', () => {
    mount();
    expect(stale(inbox)).toBe(false);
    act(() => socket().serverSends('messages'));
    expect(stale(inbox)).toBe(true);
    expect(stale(thread)).toBe(true);
    expect(stale(modules)).toBe(false);
  });

  it('asks again once after a dropped connection comes back', () => {
    mount();
    act(() => socket().reconnects());
    expect(stale(inbox)).toBe(true);
    expect(stale(thread)).toBe(true);
    expect(stale(modules)).toBe(false);
  });

  it('closes the connection when the shell goes away', () => {
    const { unmount } = mount();
    expect(socket().close).not.toHaveBeenCalled();
    unmount();
    expect(socket().close).toHaveBeenCalledTimes(1);
  });

  it('opens a new connection for a different user', () => {
    const { rerender } = mount('u1');
    rerender({ id: 'u2' });
    expect(io).toHaveBeenCalledTimes(2);
    expect(socket(0).close).toHaveBeenCalledTimes(1);
    expect(socket(1).close).not.toHaveBeenCalled();
  });
});
