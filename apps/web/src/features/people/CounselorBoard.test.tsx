import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderApp } from '@/test/render';
import { PeoplePage } from './PeoplePage';

vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
  return { ...actual, api: { ...actual.api, get: vi.fn(), post: vi.fn() } };
});

import { api } from '@/lib/api';

const person = (over: Partial<Record<string, unknown>>) => ({
  id: 'x',
  role: 'USER',
  username: 'x',
  active: true,
  mustChangePassword: false,
  psychologistId: 'p1',
  groupId: 'g1',
  createdAt: '2026-11-01T10:00:00.000Z',
  updatedAt: '2026-11-01T10:00:00.000Z',
  ...over,
});

// A counselor's world: two groups, people in every state, unread messages
// and module steps.
const answers: Record<string, unknown> = {
  '/users': [
    person({ id: 'u1', username: 'ayse' }),
    person({ id: 'u2', username: 'can' }),
    person({ id: 'u3', username: 'mert', mustChangePassword: true }),
    person({ id: 'u4', username: 'elif', groupId: 'g2' }),
    person({ id: 'u5', username: 'zeynep', groupId: null }),
    person({ id: 'u6', username: 'deniz', groupId: null, active: false }),
  ],
  '/groups': [
    { id: 'g2', name: 'Salı grubu', members: [], modules: [] },
    { id: 'g1', name: 'Pazartesi grubu', members: [], modules: [] },
  ],
  '/messages': [
    { id: 'u1', username: 'ayse', active: true, unread: 2 },
    { id: 'u2', username: 'can', active: true, unread: 0 },
  ],
  '/analytics/participants': [
    {
      userId: 'u1',
      module: { id: 'm2', title: 'Anılar' },
      status: 'completed',
    },
    {
      userId: 'u2',
      module: { id: 'm1', title: 'Sözcükler' },
      status: 'in_progress',
    },
  ],
};

const mount = () =>
  renderApp(<PeoplePage role="USER" />, '/psychologist', [
    { path: 'inbox/:userId', element: <p>Konuşma</p> },
  ]);

describe('CounselorBoard', () => {
  beforeEach(() => {
    vi.mocked(api.get)
      .mockReset()
      .mockImplementation((path: string) => Promise.resolve(answers[path]));
    vi.mocked(api.post).mockReset();
  });

  it('puts the people who need the counselor first, with one action each', async () => {
    mount();
    const waiting = await screen.findByRole('region', {
      name: 'Sizi bekleyenler 3',
    });
    const items = within(waiting).getAllByRole('listitem');
    expect(items.map((item) => item.textContent)).toEqual([
      expect.stringContaining('Hesabı hazır, henüz etkinleştirilmedi.'),
      expect.stringContaining('Geçici şifresiyle henüz giriş yapmadı.'),
      expect.stringContaining('Henüz bir gruba eklenmedi.'),
    ]);

    vi.mocked(api.post).mockResolvedValueOnce(undefined);
    await userEvent.click(
      within(items[0]).getByRole('button', { name: 'Etkinleştir' }),
    );
    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith('/users/u6/activate'),
    );
    expect(
      within(items[2]).getByRole('link', { name: 'Gruba ekle' }),
    ).toHaveAttribute('href', '/psychologist/groups');
    // a new temporary password asks first
    await userEvent.click(
      within(items[1]).getByRole('button', { name: 'Yeni geçici şifre' }),
    );
    expect(
      await screen.findByRole('alertdialog', { name: /mert/ }),
    ).toBeInTheDocument();
  });

  it('lists everyone by group, with where they are and unread messages', async () => {
    mount();
    const monday = await screen.findByRole('region', {
      name: 'Pazartesi grubu 3 kişi',
    });
    const rows = within(monday).getAllByRole('listitem');
    expect(rows.map((row) => row.firstChild?.textContent)).toEqual([
      'ayse',
      'can',
      'mert',
    ]);
    expect(rows[0]).toHaveTextContent('Anılar: paylaşıldı');
    expect(rows[1]).toHaveTextContent('Sözcükler: taslak');
    expect(rows[2]).toHaveTextContent('Henüz giriş yapmadı');
    expect(
      within(rows[0]).getByRole('link', {
        name: 'ayse: 2 okunmamış mesaj',
      }),
    ).toHaveAttribute('href', '/psychologist/inbox/u1');
    expect(within(rows[1]).queryByRole('link')).not.toBeInTheDocument();

    // groups by name, then the people without one
    const headings = screen
      .getAllByRole('heading', { level: 2 })
      .map((h) => h.textContent);
    expect(headings).toEqual([
      'Sizi bekleyenler 3',
      'Pazartesi grubu 3 kişi',
      'Salı grubu 1 kişi',
      'Grupsuz 2 kişi',
    ]);
    const none = screen.getByRole('region', { name: 'Grupsuz 2 kişi' });
    expect(within(none).getByText('Etkin değil')).toBeInTheDocument();
    expect(
      within(none).getByText('Henüz yazmaya başlamadı'),
    ).toBeInTheDocument();
  });

  it('leaves out the waiting part when nobody needs anything', async () => {
    answers['/users'] = [person({ id: 'u1', username: 'ayse' })];
    mount();
    expect(
      await screen.findByRole('region', { name: 'Pazartesi grubu 1 kişi' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('region', { name: /Sizi bekleyenler/ }),
    ).not.toBeInTheDocument();
  });
});
