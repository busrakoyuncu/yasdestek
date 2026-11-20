import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderApp } from '@/test/render';
import { AnalyticsPage } from './AnalyticsPage';

vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
  return { ...actual, api: { ...actual.api, get: vi.fn() } };
});

import { api } from '@/lib/api';

const group = { id: 'g1', name: 'Pazartesi grubu' };

const answers: Record<string, unknown> = {
  '/analytics/psychologists': [
    {
      id: 'p1',
      username: 'dr.deniz',
      active: true,
      users: [
        { id: 'u1', username: 'ayse', active: true, group },
        { id: 'u2', username: 'mehmet', active: false, group: null },
      ],
    },
    { id: 'p2', username: 'dr.ece', active: false, users: [] },
  ],
  '/analytics/users/u1': {
    id: 'u1',
    username: 'ayse',
    group,
    modules: [
      { id: 'm1', title: 'Sözcüklerin Gücü', order: 1, status: 'completed' },
      { id: 'm2', title: 'Anılar', order: 2, status: 'in_progress' },
      { id: 'm3', title: 'Veda', order: 3, status: 'not_started' },
    ],
  },
  '/analytics/users/u2': {
    id: 'u2',
    username: 'mehmet',
    group: null,
    modules: [],
  },
};

describe('AnalyticsPage', () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset();
    vi.mocked(api.get).mockImplementation((path: string) =>
      Promise.resolve(answers[path]),
    );
  });

  it('lists each counselor with their participants', async () => {
    renderApp(<AnalyticsPage />, '/admin/analytics');
    const deniz = await screen.findByRole('region', { name: 'dr.deniz' });
    expect(within(deniz).getByText('2 katılımcı')).toBeInTheDocument();
    expect(
      within(deniz).getByRole('button', { name: /ayse.*Pazartesi grubu/ }),
    ).toHaveAttribute('aria-expanded', 'false');
    expect(
      within(deniz).getByRole('button', {
        name: /mehmet.*Grupsuz.*Etkin değil/,
      }),
    ).toBeInTheDocument();

    const ece = screen.getByRole('region', { name: 'dr.ece' });
    expect(within(ece).getByText('Etkin değil')).toBeInTheDocument();
    expect(within(ece).getByText('Henüz katılımcı yok.')).toBeInTheDocument();
    // progress loads only for the rows that are opened
    expect(api.get).toHaveBeenCalledTimes(1);
  });

  it('shows where a participant stands in each module once opened', async () => {
    renderApp(<AnalyticsPage />, '/admin/analytics');
    const row = await screen.findByRole('button', { name: /ayse/ });
    await userEvent.click(row);
    expect(row).toHaveAttribute('aria-expanded', 'true');

    const first = await screen.findByText('Sözcüklerin Gücü');
    const modules = first.closest('ol') as HTMLElement;
    expect(
      within(modules)
        .getAllByRole('listitem')
        .map((li) => li.textContent),
    ).toEqual(['Sözcüklerin GücüPaylaştı', 'AnılarTaslak', 'VedaBaşlamadı']);
    expect(api.get).toHaveBeenCalledWith('/analytics/users/u1');
  });

  it('says so when the participant is in no group', async () => {
    renderApp(<AnalyticsPage />, '/admin/analytics');
    await userEvent.click(
      await screen.findByRole('button', { name: /mehmet/ }),
    );
    expect(
      await screen.findByText('Henüz bir gruba eklenmedi.'),
    ).toBeInTheDocument();
  });
});
