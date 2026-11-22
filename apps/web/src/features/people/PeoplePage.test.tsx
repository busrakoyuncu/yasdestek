import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderApp } from '@/test/render';
import { PeoplePage } from './PeoplePage';

vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
  return {
    ...actual,
    api: { ...actual.api, get: vi.fn(), post: vi.fn(), delete: vi.fn() },
  };
});

import { api, ApiError } from '@/lib/api';

// the shared schema wants a real uuid for the counselor
const P1 = 'c0ffee00-0000-4000-8000-000000000001';

const person = (over: Partial<Record<string, unknown>>) => ({
  id: 'x',
  role: 'USER',
  username: 'x',
  active: true,
  mustChangePassword: false,
  psychologistId: P1,
  groupId: null,
  createdAt: '2026-11-01T10:00:00.000Z',
  updatedAt: '2026-11-01T10:00:00.000Z',
  ...over,
});
const people = [
  person({
    id: P1,
    role: 'PSYCHOLOGIST',
    username: 'ayse',
    psychologistId: null,
  }),
  person({ id: 'u1', username: 'elif', active: false }),
  person({ id: 'u2', username: 'can', mustChangePassword: true }),
  person({ id: 'u3', username: 'deniz', groupId: 'g1' }),
  person({
    id: 'p2',
    role: 'PSYCHOLOGIST',
    username: 'mert',
    psychologistId: null,
    active: false,
  }),
  person({ id: 'u4', username: 'selin', psychologistId: 'p2' }),
];
const groups = [
  {
    id: 'g1',
    name: 'Salı grubu',
    psychologistId: P1,
    members: [],
    modules: [],
  },
];

describe('PeoplePage', () => {
  beforeEach(() => {
    vi.mocked(api.get)
      .mockReset()
      .mockImplementation((path: string) =>
        Promise.resolve(path === '/groups' ? groups : people),
      );
    vi.mocked(api.post).mockReset();
    vi.mocked(api.delete).mockReset();
  });

  // the rows of the list: each person's name, then the rest of the row
  const rows = async () =>
    within(
      await screen.findByRole('list', { name: 'Katılımcılar' }),
    ).getAllByRole('listitem');

  it('lists the participants with their counselor, group and status', async () => {
    renderApp(<PeoplePage role="USER" admin />, '/admin/participants');
    // the group names arrive with the second request
    await screen.findByText('ayse, Salı grubu');
    const items = await rows();
    // by name; no counselor rows
    expect(items.map((li) => li.querySelector('p')?.textContent)).toEqual([
      'can',
      'deniz',
      'elif',
      'selin',
    ]);
    expect(items[1]).toHaveTextContent('ayse, Salı grubu');
    expect(items[1]).toHaveTextContent('Etkin');
    expect(items[0]).toHaveTextContent('ayse, Grupsuz');
    expect(items[0]).toHaveTextContent('İlk girişini bekliyor');
    expect(items[2]).toHaveTextContent('Etkin değil');
    expect(items[3]).toHaveTextContent('mert, Grupsuz');
    // the likely next action sits on the row
    expect(
      within(items[2]).getByRole('button', { name: 'Etkinleştir' }),
    ).toBeInTheDocument();
    expect(
      within(items[0]).getByRole('button', { name: 'Yeni geçici şifre' }),
    ).toBeInTheDocument();
    expect(
      within(items[1]).queryByRole('button', { name: /Etkinleştir|şifre/ }),
    ).toBeNull();
  });

  it('filters by state, name and counselor, with counts', async () => {
    renderApp(<PeoplePage role="USER" admin />, '/admin/participants');
    await rows();
    const waiting = screen.getByRole('button', {
      name: 'İlk girişini bekliyor 1',
    });
    expect(screen.getByRole('button', { name: 'Tümü 4' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await userEvent.click(waiting);
    expect(
      (await rows()).map((li) => li.querySelector('p')?.textContent),
    ).toEqual(['can']);

    await userEvent.click(screen.getByRole('button', { name: 'Tümü 4' }));
    await userEvent.type(
      screen.getByRole('searchbox', { name: 'Ada göre ara' }),
      'elif',
    );
    expect(
      (await rows()).map((li) => li.querySelector('p')?.textContent),
    ).toEqual(['elif']);
    // the counts follow the search
    expect(screen.getByRole('button', { name: 'Tümü 1' })).toBeInTheDocument();

    await userEvent.clear(
      screen.getByRole('searchbox', { name: 'Ada göre ara' }),
    );
    await userEvent.click(
      screen.getByRole('combobox', { name: 'Danışmana göre' }),
    );
    await userEvent.click(await screen.findByRole('option', { name: 'mert' }));
    expect(
      (await rows()).map((li) => li.querySelector('p')?.textContent),
    ).toEqual(['selin']);

    await userEvent.click(
      screen.getByRole('button', { name: 'Etkin değil 0' }),
    );
    expect(screen.getByText('Bu seçime uyan kimse yok.')).toBeInTheDocument();
  });

  it('shows each counselor with their participants and groups', async () => {
    renderApp(<PeoplePage role="PSYCHOLOGIST" admin />, '/admin');
    await screen.findByText('3 katılımcı, 1 grup');
    const list = screen.getByRole('list', { name: 'Danışmanlar' });
    const items = within(list).getAllByRole('listitem');
    expect(items[0]).toHaveTextContent('ayse');
    expect(items[0]).toHaveTextContent('3 katılımcı, 1 grup');
    expect(items[1]).toHaveTextContent('mert');
    expect(items[1]).toHaveTextContent('1 katılımcı, 0 grup');
    // counselors cannot be deleted
    await userEvent.click(
      within(items[0]).getByRole('button', { name: 'İşlemler: ayse' }),
    );
    expect(
      await screen.findByRole('menuitem', { name: 'Şifreyi sıfırla' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('menuitem', { name: 'Kalıcı olarak sil' }),
    ).toBeNull();
  });

  it('asks before deactivating and then calls the api', async () => {
    vi.mocked(api.post).mockResolvedValueOnce(undefined);
    renderApp(<PeoplePage role="USER" admin />, '/admin/participants');
    await userEvent.click(
      await screen.findByRole('button', { name: 'İşlemler: deniz' }),
    );
    await userEvent.click(
      await screen.findByRole('menuitem', { name: 'Devre dışı bırak' }),
    );
    expect(await screen.findByRole('alertdialog')).toHaveTextContent(
      'deniz devre dışı bırakılsın mı?',
    );
    expect(api.post).not.toHaveBeenCalled();
    await userEvent.click(
      screen.getByRole('button', { name: 'Devre dışı bırak' }),
    );
    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith('/users/u3/deactivate'),
    );
  });

  it('creates a participant and shows the one-time password once', async () => {
    vi.mocked(api.post).mockResolvedValueOnce({
      user: person({ id: 'u4', username: 'mert' }),
      password: 'Temp-pass-99',
    });
    renderApp(<PeoplePage role="USER" admin />, '/admin/participants');
    await userEvent.click(
      await screen.findByRole('button', { name: 'Yeni katılımcı' }),
    );
    const dialog = await screen.findByRole('dialog');
    await userEvent.type(
      within(dialog).getByLabelText('Kullanıcı adı'),
      'mert',
    );
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Oluştur' }),
    );
    // the counselor is required for an admin: nothing was sent yet
    expect(
      await within(dialog).findByText('Bu alan gerekli.'),
    ).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
    await userEvent.click(within(dialog).getByRole('combobox'));
    await userEvent.click(await screen.findByRole('option', { name: 'ayse' }));
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Oluştur' }),
    );
    expect(await screen.findByText('Temp-pass-99')).toBeInTheDocument();
    expect(api.post).toHaveBeenCalledWith('/users', {
      role: 'USER',
      username: 'mert',
      psychologistId: P1,
    });
  });

  it('shows a taken username as a translated message', async () => {
    vi.mocked(api.post).mockRejectedValueOnce(
      new ApiError(409, 'USERNAME_TAKEN', ''),
    );
    renderApp(<PeoplePage role="PSYCHOLOGIST" admin />, '/admin');
    await userEvent.click(
      await screen.findByRole('button', { name: 'Yeni danışman' }),
    );
    const dialog = await screen.findByRole('dialog');
    await userEvent.type(
      within(dialog).getByLabelText('Kullanıcı adı'),
      'ayse',
    );
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Oluştur' }),
    );
    expect(
      await within(dialog).findByText(
        'Bu kullanıcı adı kullanımda. Başka bir ad seçin.',
      ),
    ).toBeInTheDocument();
  });
});
