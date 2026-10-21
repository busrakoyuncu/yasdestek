import { HomeIcon } from '@lucide/vue';
import { screen, within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { defineComponent, h } from 'vue';
import { sessionQuery } from '@/features/auth/useSession';
import { queryClient } from '@/lib/query';
import { renderApp } from '@/test/render';
import type { CurrentUser } from '@/types/user';
import AppShell from './AppShell.vue';

vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
  return { ...actual, api: { ...actual.api, get: vi.fn(), post: vi.fn() } };
});

const nav = [{ to: '/psychologist', label: 'nav.home', icon: HomeIcon }];

describe('AppShell', () => {
  it('shows the nav twice (sidebar and tab bar) and the user in the menu', async () => {
    renderApp(
      defineComponent(
        () => () => h(AppShell, { nav }, { default: () => h('p', 'içerik') }),
      ),
    );
    queryClient.setQueryData(sessionQuery.queryKey, {
      username: 'dr.ayse',
      role: 'PSYCHOLOGIST',
    } as CurrentUser);

    const menus = screen.getAllByRole('navigation', { name: 'Ana menü' });
    expect(menus).toHaveLength(2);
    for (const menu of menus) {
      expect(
        within(menu).getByRole('link', { name: 'Ana sayfa' }),
      ).toHaveAttribute('href', '/psychologist');
    }
    expect(screen.getByText('içerik')).toBeInTheDocument();

    await userEvent.click(
      await screen.findByRole('button', { name: 'Hesap menüsü' }),
    );
    const menu = await screen.findByRole('menu');
    expect(menu).toHaveTextContent('dr.ayse');
    expect(menu).toHaveTextContent('Danışman');
    expect(
      within(menu).getByRole('menuitem', { name: 'Çıkış yap' }),
    ).toBeInTheDocument();
  });
});
