import { screen, within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderApp } from '@/test/render';
import PsychologistsPage from './PsychologistsPage.vue';

vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
  return { ...actual, api: { ...actual.api, get: vi.fn(), post: vi.fn() } };
});

import { api } from '@/lib/api';

const row = (over: object) => ({
  id: 'x',
  role: 'PSYCHOLOGIST',
  username: 'dr.ayse',
  active: true,
  mustChangePassword: false,
  psychologistId: null,
  groupId: null,
  createdAt: '2026-10-01T10:00:00.000Z',
  ...over,
});

describe('PsychologistsPage', () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset();
    vi.mocked(api.post).mockReset();
  });

  it('lists psychologists only, with their status', async () => {
    vi.mocked(api.get).mockResolvedValue([
      row({ id: 'p1', username: 'dr.ayse' }),
      row({ id: 'p2', username: 'dr.can', active: false }),
      row({ id: 'u1', username: 'elif', role: 'USER' }),
    ]);
    renderApp(PsychologistsPage);
    const rows = await screen.findAllByRole('row');
    expect(rows).toHaveLength(3); // header + 2
    expect(within(rows[1]!).getByText('Etkin')).toBeInTheDocument();
    expect(within(rows[2]!).getByText('Etkin değil')).toBeInTheDocument();
    expect(screen.queryByText('elif')).toBeNull();
  });

  it('creates a psychologist and shows the one-time password once', async () => {
    vi.mocked(api.get).mockResolvedValue([]);
    vi.mocked(api.post).mockResolvedValueOnce({
      user: row({ id: 'p9', username: 'dr.yeni', active: false }),
      password: 'Tmp7kQ2x9RwZ',
    });
    renderApp(PsychologistsPage);
    await userEvent.click(
      await screen.findByRole('button', { name: 'Danışman ekle' }),
    );
    await userEvent.type(
      await screen.findByLabelText('Kullanıcı adı'),
      'dr.yeni',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Oluştur' }));

    const dialog = await screen.findByRole('dialog', { name: 'Geçici şifre' });
    expect(dialog).toHaveTextContent('Tmp7kQ2x9RwZ');
    expect(api.post).toHaveBeenCalledWith('/users', {
      role: 'PSYCHOLOGIST',
      username: 'dr.yeni',
      psychologistId: undefined,
    });
  });
});
