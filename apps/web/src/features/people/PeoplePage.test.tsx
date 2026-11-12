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
  person({ id: 'u3', username: 'deniz' }),
];

describe('PeoplePage', () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset().mockResolvedValue(people);
    vi.mocked(api.post).mockReset();
    vi.mocked(api.delete).mockReset();
  });

  it('lists the participants with their status and counselor', async () => {
    renderApp(<PeoplePage role="USER" admin />, '/admin/participants');
    const rows = await screen.findAllByRole('row');
    expect(rows).toHaveLength(4); // header + 3 participants, no counselor row
    expect(within(rows[1]).getByText('Etkin değil')).toBeInTheDocument();
    expect(
      within(rows[2]).getByText('İlk girişini bekliyor'),
    ).toBeInTheDocument();
    expect(within(rows[3]).getByText('Aktif')).toBeInTheDocument();
    expect(within(rows[3]).getByText('ayse')).toBeInTheDocument();
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
