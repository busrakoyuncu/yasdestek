import { describe, expect, it, vi } from 'vitest';
import { queryClient } from '@/lib/query';
import type { CurrentUser } from '@/types/user';

vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
  return { ...actual, api: { ...actual.api, get: vi.fn(), post: vi.fn() } };
});

import { api, ApiError } from '@/lib/api';
import { router } from './router';

const participant = {
  id: 'u1',
  role: 'USER',
  username: 'elif',
  mustChangePassword: false,
} as CurrentUser;

// The guard reads the session once per page load; clearing the cache
// simulates a fresh load for every case.
async function visit(path: string, user: CurrentUser | null) {
  queryClient.clear();
  vi.mocked(api.get).mockReset();
  if (user) vi.mocked(api.get).mockResolvedValue(user);
  else
    vi.mocked(api.get).mockRejectedValue(
      new ApiError(401, 'UNAUTHORIZED', 'no'),
    );
  // leave wherever the previous case ended, so pushing `path` is a real navigation;
  // change-password is reachable by every signed-in user, pending or not
  await router.replace('/change-password');
  await router.push(path);
  return router.currentRoute.value.fullPath;
}

describe('router guard', () => {
  it('sends signed-out visitors to login and remembers where they were going', async () => {
    expect(await visit('/app/rules', null)).toBe('/login?redirect=/app/rules');
  });

  it('keeps signed-in users off the login page', async () => {
    expect(await visit('/login', participant)).toBe('/app');
  });

  it('keeps a participant out of the admin area', async () => {
    expect(await visit('/admin', participant)).toBe('/app');
  });

  it('allows nothing but the password change while one is pending', async () => {
    const pending = { ...participant, mustChangePassword: true };
    expect(await visit('/app', pending)).toBe('/change-password');
    expect(await visit('/change-password', pending)).toBe('/change-password');
  });

  it('lets a participant into their own area', async () => {
    expect(await visit('/app/rules', participant)).toBe('/app/rules');
  });
});
