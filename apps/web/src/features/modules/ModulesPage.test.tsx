import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderApp } from '@/test/render';
import { ModulesPage } from './ModulesPage';

vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
  return {
    ...actual,
    api: {
      ...actual.api,
      get: vi.fn(),
      post: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
    },
  };
});

import { api } from '@/lib/api';

const me = (role: string) => ({
  id: 'me',
  role,
  username: 'ben',
  active: true,
  mustChangePassword: false,
  psychologistId: null,
  groupId: null,
});
const module = (over: Partial<Record<string, unknown>>) => ({
  id: 'm',
  title: 'Modül',
  description: 'Açıklama',
  rules: 'Kurallar',
  questions: ['Soru 1', 'Soru 2'],
  order: 0,
  isBase: false,
  createdById: null,
  createdBy: null,
  createdAt: '',
  updatedAt: '',
  ...over,
});
const modules = [
  module({ id: 'm1', title: 'Sözcüklerin Gücü', isBase: true }),
  module({
    id: 'm2',
    title: 'Genel modül',
    createdById: 'a1',
    createdBy: { username: 'admin', role: 'ADMIN' },
  }),
  module({
    id: 'm3',
    title: 'Kendi modülüm',
    createdById: 'me',
    createdBy: { username: 'ben', role: 'PSYCHOLOGIST' },
  }),
];

// /auth/me answers the session, /modules the list
const answer = (role: string) =>
  vi
    .mocked(api.get)
    .mockImplementation((path: string) =>
      Promise.resolve(path === '/auth/me' ? me(role) : modules),
    );

describe('ModulesPage', () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset();
    vi.mocked(api.post).mockReset();
    vi.mocked(api.delete).mockReset();
  });

  it('shows every module with its scope and lets the admin edit all but delete only global ones', async () => {
    answer('ADMIN');
    renderApp(<ModulesPage />, '/admin/modules');
    const items = await screen.findAllByRole('listitem');
    expect(items).toHaveLength(3);
    expect(within(items[0]).getByText('Temel')).toBeInTheDocument();
    expect(within(items[1]).getByText('Genel')).toBeInTheDocument();
    expect(
      within(items[2]).getByText('Kendi modülüm', { selector: 'span' }),
    ).toBeInTheDocument();
    expect(
      within(items[0]).getByRole('button', {
        name: 'Düzenle: Sözcüklerin Gücü',
      }),
    ).toBeInTheDocument();
    expect(within(items[0]).queryByRole('button', { name: /^Sil/ })).toBeNull();
    expect(
      within(items[1]).getByRole('button', { name: 'Sil: Genel modül' }),
    ).toBeInTheDocument();
    expect(
      within(items[2]).queryByRole('button', { name: /^Düzenle/ }),
    ).toBeNull();
  });

  it('lets a counselor change only their own module', async () => {
    answer('PSYCHOLOGIST');
    renderApp(<ModulesPage />, '/psychologist/modules');
    const items = await screen.findAllByRole('listitem');
    expect(within(items[0]).queryByRole('button')).toBeNull();
    expect(
      within(items[2]).getByRole('button', { name: 'Düzenle: Kendi modülüm' }),
    ).toBeInTheDocument();
    expect(
      within(items[2]).getByRole('button', { name: 'Sil: Kendi modülüm' }),
    ).toBeInTheDocument();
  });

  it('refuses a module without rules or questions, then creates one', async () => {
    answer('ADMIN');
    vi.mocked(api.post).mockResolvedValueOnce(module({ id: 'm4' }));
    renderApp(<ModulesPage />, '/admin/modules');
    await userEvent.click(
      await screen.findByRole('button', { name: 'Yeni modül' }),
    );
    const dialog = await screen.findByRole('dialog');
    await userEvent.type(within(dialog).getByLabelText('Başlık'), 'Yeni');
    await userEvent.type(
      within(dialog).getByLabelText(/Açıklama/),
      'Hoş geldiniz',
    );
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Oluştur' }),
    );
    expect(await within(dialog).findAllByText('Bu alan gerekli.')).toHaveLength(
      2,
    );
    expect(api.post).not.toHaveBeenCalled();
    await userEvent.type(
      within(dialog).getByLabelText(/Kurallar/),
      'Nazik olun',
    );
    await userEvent.type(
      within(dialog).getByLabelText('1. soru'),
      'Ne hissettiniz?',
    );
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Soru ekle' }),
    );
    await userEvent.type(
      within(dialog).getByLabelText('2. soru'),
      'Sonra ne oldu?',
    );
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Oluştur' }),
    );
    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith('/modules', {
        title: 'Yeni',
        description: 'Hoş geldiniz',
        rules: 'Nazik olun',
        questions: ['Ne hissettiniz?', 'Sonra ne oldu?'],
      }),
    );
  });

  it('asks before deleting and then calls the api', async () => {
    answer('ADMIN');
    vi.mocked(api.delete).mockResolvedValueOnce(undefined);
    renderApp(<ModulesPage />, '/admin/modules');
    await userEvent.click(
      await screen.findByRole('button', { name: 'Sil: Genel modül' }),
    );
    expect(await screen.findByRole('alertdialog')).toHaveTextContent(
      'Genel modül silinsin mi?',
    );
    expect(api.delete).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Sil' }));
    await waitFor(() => expect(api.delete).toHaveBeenCalledWith('/modules/m2'));
  });
});
