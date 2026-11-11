import { screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderApp } from '@/test/render';
import { RequireAuth } from './RequireAuth';

vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
  return { ...actual, api: { ...actual.api, get: vi.fn(), post: vi.fn() } };
});

import { api, ApiError } from '@/lib/api';

const participant = {
  id: 'u1',
  role: 'USER',
  username: 'elif',
  active: true,
  mustChangePassword: false,
  psychologistId: 'p1',
  groupId: 'g1',
};

const area = [{ index: true, element: <p>Katılımcı alanı</p> }];

describe('RequireAuth', () => {
  // braces matter: a hook that returns a function makes vitest call it as cleanup
  beforeEach(() => {
    vi.mocked(api.get).mockReset();
  });

  it('sends a visitor to login and remembers where they were going', async () => {
    vi.mocked(api.get).mockRejectedValue(new ApiError(401, 'UNAUTHORIZED', ''));
    const { router } = renderApp(<RequireAuth role="USER" />, '/app', area);
    await waitFor(() =>
      expect(
        router.state.location.pathname + router.state.location.search,
      ).toBe('/login?redirect=%2Fapp'),
    );
  });

  it('sends a pending password change to that screen first', async () => {
    vi.mocked(api.get).mockResolvedValue({
      ...participant,
      mustChangePassword: true,
    });
    const { router } = renderApp(<RequireAuth role="USER" />, '/app', area);
    await waitFor(() =>
      expect(router.state.location.pathname).toBe('/change-password'),
    );
  });

  it('sends the wrong role to its own area', async () => {
    vi.mocked(api.get).mockResolvedValue({
      ...participant,
      role: 'PSYCHOLOGIST',
    });
    const { router } = renderApp(<RequireAuth role="USER" />, '/app', area);
    await waitFor(() =>
      expect(router.state.location.pathname).toBe('/psychologist'),
    );
  });

  it('lets the right role through to the area', async () => {
    vi.mocked(api.get).mockResolvedValue(participant);
    renderApp(<RequireAuth role="USER" />, '/app', area);
    expect(await screen.findByText('Katılımcı alanı')).toBeInTheDocument();
  });
});
