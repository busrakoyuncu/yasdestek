import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderApp } from '@/test/render';
import { AppShell } from './AppShell';
import { RequireAuth } from './RequireAuth';

vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
  return { ...actual, api: { ...actual.api, get: vi.fn(), post: vi.fn() } };
});

import { api } from '@/lib/api';

const participant = {
  id: 'u1',
  role: 'USER',
  username: 'elif',
  active: true,
  mustChangePassword: false,
  psychologistId: 'p1',
  groupId: 'g1',
};

// The shell sits under the guard, as in the router, so the user is known.
const area = [
  {
    element: <AppShell role="USER" />,
    children: [
      { index: true, element: <p>Modül listesi</p> },
      { path: 'messages', element: <p>Mesaj listesi</p> },
    ],
  },
];
const mount = () => renderApp(<RequireAuth role="USER" />, '/app', area);

describe('AppShell', () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset().mockResolvedValue(participant);
    vi.mocked(api.post).mockReset();
    localStorage.clear();
    document.documentElement.classList.remove('dark');
  });

  it('navigates between the area screens from the menu', async () => {
    mount();
    expect(await screen.findByText('Modül listesi')).toBeInTheDocument();
    // two navigations are rendered (sidebar and tab bar); either link works
    await userEvent.click(screen.getAllByRole('link', { name: 'Mesajlar' })[0]);
    expect(await screen.findByText('Mesaj listesi')).toBeInTheDocument();
    expect(
      screen.getAllByRole('link', { name: 'Mesajlar' })[0],
    ).toHaveAttribute('aria-current', 'page');
  });

  it('is night by default and remembers a switch to light', async () => {
    mount();
    await userEvent.click(
      await screen.findByRole('button', { name: 'Hesap menüsü' }),
    );
    expect(document.documentElement).toHaveClass('dark');
    await userEvent.click(
      await screen.findByRole('menuitemradio', { name: 'Açık' }),
    );
    expect(document.documentElement).not.toHaveClass('dark');
    expect(localStorage.getItem('theme:u1')).toBe('light');
  });

  it('signs out through the api and returns to login', async () => {
    vi.mocked(api.post).mockResolvedValueOnce(undefined);
    const { router } = mount();
    await userEvent.click(
      await screen.findByRole('button', { name: 'Hesap menüsü' }),
    );
    await userEvent.click(
      await screen.findByRole('menuitem', { name: 'Çıkış yap' }),
    );
    await waitFor(() => expect(router.state.location.pathname).toBe('/login'));
    expect(api.post).toHaveBeenCalledWith('/auth/logout');
  });
});
