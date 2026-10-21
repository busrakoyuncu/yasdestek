import { screen, within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderApp } from '@/test/render';
import ParticipantsPage from './ParticipantsPage.vue';

vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
  return { ...actual, api: { ...actual.api, get: vi.fn(), post: vi.fn() } };
});

import { api } from '@/lib/api';

const P1 = '11111111-1111-7111-8111-111111111111';

const row = (over: object) => ({
  id: 'x',
  role: 'USER',
  username: 'elif',
  active: true,
  mustChangePassword: false,
  psychologistId: P1,
  groupId: null,
  createdAt: '2026-10-01T10:00:00.000Z',
  ...over,
});

describe('ParticipantsPage', () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset();
    vi.mocked(api.post).mockReset();
    vi.mocked(api.get).mockResolvedValue([
      row({
        id: P1,
        role: 'PSYCHOLOGIST',
        username: 'dr.ayse',
        psychologistId: null,
      }),
      row({ id: 'u1', username: 'elif' }),
    ]);
  });

  it('lists participants with their psychologist', async () => {
    renderApp(ParticipantsPage);
    const rows = await screen.findAllByRole('row');
    expect(rows).toHaveLength(2);
    expect(within(rows[1]!).getByText('elif')).toBeInTheDocument();
    expect(within(rows[1]!).getByText('dr.ayse')).toBeInTheDocument();
  });

  it('requires a psychologist when creating, then sends it', async () => {
    vi.mocked(api.post).mockResolvedValueOnce({
      user: row({ id: 'u2', username: 'kerem', active: false }),
      password: 'Tmp7kQ2x9RwZ',
    });
    renderApp(ParticipantsPage);
    await userEvent.click(
      await screen.findByRole('button', { name: 'Katılımcı ekle' }),
    );
    await userEvent.type(
      await screen.findByLabelText('Kullanıcı adı'),
      'kerem',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Oluştur' }));
    expect(await screen.findAllByText('Bu alan gerekli.')).toHaveLength(1);
    expect(api.post).not.toHaveBeenCalled();

    await userEvent.selectOptions(screen.getByLabelText('Danışman'), P1);
    await userEvent.click(screen.getByRole('button', { name: 'Oluştur' }));
    expect(
      await screen.findByRole('dialog', { name: 'Geçici şifre' }),
    ).toHaveTextContent('Tmp7kQ2x9RwZ');
    expect(api.post).toHaveBeenCalledWith('/users', {
      role: 'USER',
      username: 'kerem',
      psychologistId: P1,
    });
  });
});
