import { screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderApp } from '@/test/render';
import { AnalyticsPage } from './AnalyticsPage';

vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
  return { ...actual, api: { ...actual.api, get: vi.fn() } };
});

import { api } from '@/lib/api';

type Status = 'completed' | 'in_progress' | 'not_started';
const monday = { id: 'g1', name: 'Pazartesi grubu' };
const thursday = { id: 'g2', name: 'Perşembe grubu' };
const steps = (...statuses: Status[]) =>
  statuses.map((status, i) => ({
    id: `m${i + 1}`,
    title: ['Sözcüklerin Gücü', 'Anılar', 'Veda'][i],
    order: i + 1,
    status,
  }));

// dr.deniz has two groups (one without modules yet) and a groupless
// participant; dr.ece is inactive and has nobody.
const answers: Record<string, unknown> = {
  '/analytics/psychologists': [
    {
      id: 'p1',
      username: 'dr.deniz',
      active: true,
      users: [
        {
          id: 'u1',
          username: 'ayse',
          active: true,
          group: monday,
          modules: steps('completed', 'in_progress', 'not_started'),
        },
        {
          id: 'u2',
          username: 'can',
          active: false,
          group: monday,
          modules: steps('completed', 'completed', 'not_started'),
        },
        {
          id: 'u3',
          username: 'elif',
          active: true,
          group: thursday,
          modules: [],
        },
        {
          id: 'u4',
          username: 'zeynep',
          active: true,
          group: null,
          modules: [],
        },
      ],
    },
    { id: 'p2', username: 'dr.ece', active: false, users: [] },
  ],
};

describe('AnalyticsPage', () => {
  beforeEach(() => {
    vi.mocked(api.get)
      .mockReset()
      .mockImplementation((path: string) => Promise.resolve(answers[path]));
  });

  it("shows one table per group, with each person's state per module", async () => {
    renderApp(<AnalyticsPage />, '/admin/analytics');
    const table = await screen.findByRole('table', { name: 'Pazartesi grubu' });

    // the modules across the top, named in full for screen readers
    const headers = within(table)
      .getAllByRole('columnheader')
      .map((th) => th.textContent);
    expect(headers).toEqual([
      'Katılımcı',
      'M1Sözcüklerin Gücü',
      'M2Anılar',
      'M3Veda',
      'Paylaşılan',
    ]);

    const [, ayse, can] = within(table).getAllByRole('row');
    expect(
      within(ayse)
        .getAllByRole('img')
        .map((mark) => mark.getAttribute('aria-label')),
    ).toEqual(['Paylaştı', 'Taslak', 'Başlamadı']);
    expect(ayse).toHaveTextContent('1 / 3');
    expect(within(can).getByRole('rowheader')).toHaveTextContent(
      'canEtkin değil',
    );
    expect(can).toHaveTextContent('2 / 3');
    // only one request for the whole page
    expect(api.get).toHaveBeenCalledTimes(1);
  });

  it('names groups without modules and people without a group', async () => {
    renderApp(<AnalyticsPage />, '/admin/analytics');
    const deniz = await screen.findByRole('region', { name: /dr\.deniz/ });
    expect(within(deniz).getByRole('heading', { level: 2 })).toHaveTextContent(
      'dr.deniz 4 katılımcı, 2 grup',
    );
    expect(
      within(deniz).getByText('Henüz modül atanmadı: elif'),
    ).toBeInTheDocument();
    expect(within(deniz).getAllByRole('table')).toHaveLength(1);
    expect(within(deniz).getByText('Grupsuz: zeynep')).toBeInTheDocument();
  });

  it('says so when a counselor has nobody yet', async () => {
    renderApp(<AnalyticsPage />, '/admin/analytics');
    const ece = await screen.findByRole('region', { name: /dr\.ece/ });
    expect(within(ece).getByRole('heading', { level: 2 })).toHaveTextContent(
      'dr.ece 0 katılımcı, 0 grup, Etkin değil',
    );
    expect(within(ece).getByText('Henüz katılımcı yok.')).toBeInTheDocument();
  });
});
