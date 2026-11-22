import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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
    // /auth/me answers the session, /modules the participant's modules
    vi.mocked(api.get)
      .mockReset()
      .mockImplementation((path: string) =>
        Promise.resolve(
          path === '/modules'
            ? [
                { id: 'm1', title: 'Sözcüklerin Gücü' },
                { id: 'm2', title: 'Mektup Yazma' },
              ]
            : participant,
        ),
      );
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

  it('lists each module under Modüller and Forumlar, and folds them away', async () => {
    mount();
    const forums = await screen.findByRole('button', { name: 'Forumlar' });
    // home stays one click away through the wordmark
    expect(
      screen.getAllByRole('link', { name: 'Yasdestek' })[0],
    ).toHaveAttribute('href', '/app');
    expect(forums).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: 'Modüller' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    // the same module, once to write and once to read the group
    const links = await screen.findAllByRole('link', {
      name: /Sözcüklerin Gücü/,
    });
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/app/modules/m1',
      '/app/forums/m1',
    ]);

    await userEvent.click(forums);
    expect(forums).toHaveAttribute('aria-expanded', 'false');
    expect(
      screen.getAllByRole('link', { name: /Sözcüklerin Gücü/ }),
    ).toHaveLength(1);
  });

  it("lists a counselor's group forums under Forumlar", async () => {
    vi.mocked(api.get).mockImplementation((path: string) =>
      Promise.resolve(
        path === '/groups'
          ? [
              {
                id: 'g1',
                name: 'Salı grubu',
                modules: [{ module: { id: 'm1', title: 'Sözcüklerin Gücü' } }],
              },
              { id: 'g2', name: 'Boş grup', modules: [] },
            ]
          : { ...participant, role: 'PSYCHOLOGIST', groupId: null },
      ),
    );
    renderApp(<RequireAuth role="PSYCHOLOGIST" />, '/psychologist', [
      {
        element: <AppShell role="PSYCHOLOGIST" />,
        children: [{ index: true, element: <p>Katılımcı listesi</p> }],
      },
    ]);
    const forums = await screen.findByRole('button', { name: 'Forumlar' });
    expect(forums).toHaveAttribute('aria-expanded', 'true');
    // the group's name, then its modules; a group with none is left out
    expect(await screen.findByText('Salı grubu')).toBeInTheDocument();
    expect(screen.queryByText('Boş grup')).not.toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Sözcüklerin Gücü' }),
    ).toHaveAttribute('href', '/psychologist/forums/g1/m1');
  });

  it('is night by default and remembers a switch to light', async () => {
    const bar = document.createElement('meta');
    bar.name = 'theme-color';
    document.head.append(bar);
    mount();
    await userEvent.click(
      await screen.findByRole('button', { name: 'Hesap menüsü' }),
    );
    expect(document.documentElement).toHaveClass('dark');
    expect(bar).toHaveAttribute('content', '#0B1530');
    await userEvent.click(
      await screen.findByRole('menuitemradio', { name: 'Açık' }),
    );
    expect(document.documentElement).not.toHaveClass('dark');
    expect(bar).toHaveAttribute('content', '#F3F2EC');
    expect(localStorage.getItem('theme:u1')).toBe('light');
    bar.remove();
  });

  describe('install', () => {
    const openMenu = async () =>
      userEvent.click(
        await screen.findByRole('button', { name: 'Hesap menüsü' }),
      );
    const installItem = () =>
      screen.queryByRole('menuitem', { name: 'Uygulamayı yükle' });

    beforeEach(() => {
      // forget an install offer left over from another test
      window.dispatchEvent(new Event('appinstalled'));
    });
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('offers nothing when the browser cannot install', async () => {
      mount();
      await openMenu();
      expect(
        await screen.findByRole('menuitem', { name: 'Çıkış yap' }),
      ).toBeInTheDocument();
      expect(installItem()).not.toBeInTheDocument();
    });

    it("opens the browser's install dialog once it is offered", async () => {
      const prompt = vi.fn().mockResolvedValue(undefined);
      const offer = Object.assign(
        new Event('beforeinstallprompt', { cancelable: true }),
        {
          prompt,
        },
      );
      mount();
      act(() => {
        window.dispatchEvent(offer);
      });
      expect(offer.defaultPrevented).toBe(true);
      await openMenu();
      await userEvent.click(installItem()!);
      expect(prompt).toHaveBeenCalledTimes(1);
      // the offer is used up
      await openMenu();
      expect(installItem()).not.toBeInTheDocument();
    });

    it('shows the Safari steps on an iPhone', async () => {
      vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)',
      );
      mount();
      await openMenu();
      await userEvent.click(installItem()!);
      const steps = await screen.findByRole('dialog', {
        name: 'Ana ekrana ekleyin',
      });
      expect(steps).toHaveTextContent('“Ana Ekrana Ekle”yi seçin.');
    });

    it('offers nothing once it runs from the home screen', async () => {
      vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)',
      );
      vi.spyOn(window, 'matchMedia').mockImplementation(
        (query: string) =>
          ({
            matches: query === '(display-mode: standalone)',
            media: query,
            addEventListener() {},
            removeEventListener() {},
          }) as unknown as MediaQueryList,
      );
      mount();
      await openMenu();
      expect(
        await screen.findByRole('menuitem', { name: 'Çıkış yap' }),
      ).toBeInTheDocument();
      expect(installItem()).not.toBeInTheDocument();
    });
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
