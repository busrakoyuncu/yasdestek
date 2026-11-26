import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router';
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
  allowImages: false,
  allowAudio: false,
  createdById: null,
  createdBy: null,
  createdAt: '',
  updatedAt: '',
  ...over,
});
// a base module, one the admin added for everyone, and a counselor's own
const modules = [
  module({
    id: 'm1',
    title: 'Sözcüklerin Gücü',
    isBase: true,
    description: 'Kaybınızı kendi sözcüklerinizle anlatın.',
    rules: 'İstediğiniz uzunlukta yazın.',
    questions: ['Önceki günler nasıldı?', 'Haberi nasıl aldınız?'],
  }),
  module({
    id: 'm2',
    title: 'Genel modül',
    allowAudio: true,
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

// The page under the same four addresses the app gives it.
const mount = (area: 'admin' | 'psychologist', at = `/${area}/modules`) =>
  renderApp(
    <Routes>
      <Route index element={<ModulesPage />} />
      <Route path="new" element={<ModulesPage mode="new" />} />
      <Route path=":moduleId" element={<ModulesPage />} />
      <Route path=":moduleId/edit" element={<ModulesPage mode="edit" />} />
    </Routes>,
    `/${area}/modules/*`,
    undefined,
    at,
  );

const shown = (title: string) => screen.findByRole('article', { name: title });

describe('ModulesPage', () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset();
    vi.mocked(api.post).mockReset();
    vi.mocked(api.patch).mockReset();
    vi.mocked(api.delete).mockReset().mockResolvedValue(undefined);
  });

  it('lists every module with where it comes from and opens the first', async () => {
    answer('ADMIN');
    mount('admin');
    const list = await screen.findByRole('navigation', { name: 'Modüller' });
    expect(
      within(list)
        .getAllByRole('link')
        .map((link) => link.textContent),
    ).toEqual([
      '1Sözcüklerin GücüTemel · 2 soru',
      '2Genel modülGenel · 2 soru',
      // the admin sees a counselor's module by who made it
      '3Kendi modülümben ekledi · 2 soru',
    ]);
    expect(within(list).getAllByRole('link')[1]).toHaveAttribute(
      'href',
      '/admin/modules/m2',
    );
    expect(await shown('Sözcüklerin Gücü')).toBeInTheDocument();
  });

  it('shows a module the way participants meet it', async () => {
    answer('PSYCHOLOGIST');
    const { unmount } = mount('psychologist', '/psychologist/modules/m1');
    const view = await shown('Sözcüklerin Gücü');
    expect(view).toHaveTextContent('Temel · 2 soru · Yalnızca yazı');
    expect(
      within(view).getByText('Kaybınızı kendi sözcüklerinizle anlatın.'),
    ).toBeInTheDocument();
    expect(
      within(view).getByRole('heading', { name: 'Bu modülün kuralları' }),
    ).toBeInTheDocument();
    expect(
      within(view)
        .getAllByRole('listitem')
        .map((li) => li.textContent),
    ).toEqual(['1Önceki günler nasıldı?', '2Haberi nasıl aldınız?']);
    unmount();

    mount('psychologist', '/psychologist/modules/m2');
    expect(await shown('Genel modül')).toHaveTextContent('Yazı ve ses kaydı');
  });

  it('says so when the module in the address is not there', async () => {
    answer('PSYCHOLOGIST');
    mount('psychologist', '/psychologist/modules/gone');
    expect(
      await screen.findByText('Bu modül bulunamadı. Listeden bir modül seçin.'),
    ).toBeInTheDocument();
  });

  it('lets the admin edit all but their counselors’ modules and delete only global ones', async () => {
    answer('ADMIN');
    const at = async (id: string, title: string) => {
      const { unmount } = mount('admin', `/admin/modules/${id}`);
      const view = await shown(title);
      const can = {
        edit: within(view).queryByRole('link', { name: /^Düzenle/ }) !== null,
        menu:
          within(view).queryByRole('button', { name: /^İşlemler/ }) !== null,
      };
      unmount();
      return can;
    };
    expect(await at('m1', 'Sözcüklerin Gücü')).toEqual({
      edit: true,
      menu: false,
    });
    expect(await at('m2', 'Genel modül')).toEqual({ edit: true, menu: true });
    expect(await at('m3', 'Kendi modülüm')).toEqual({
      edit: false,
      menu: false,
    });
  });

  it('edits a shared module in place and opens the counselor’s new copy', async () => {
    answer('PSYCHOLOGIST');
    vi.mocked(api.patch).mockResolvedValueOnce(
      module({ id: 'm9', title: 'Sözcüklerin Gücü (benim)' }),
    );
    const { router } = mount('psychologist', '/psychologist/modules/m1');
    await userEvent.click(
      within(await shown('Sözcüklerin Gücü')).getByRole('link', {
        name: 'Düzenle: Sözcüklerin Gücü',
      }),
    );
    expect(router.state.location.pathname).toBe(
      '/psychologist/modules/m1/edit',
    );
    const form = await screen.findByRole('form', { name: 'Modülü düzenle' });
    // editing a shared module says it makes the counselor's own version
    expect(form).toHaveTextContent(/size ait bir sürüm oluşur/);
    const title = within(form).getByLabelText('Başlık');
    expect(title).toHaveValue('Sözcüklerin Gücü');
    await userEvent.type(title, ' (benim)');
    await userEvent.click(within(form).getByRole('button', { name: 'Kaydet' }));
    await waitFor(() =>
      expect(api.patch).toHaveBeenCalledWith(
        '/modules/m1',
        expect.objectContaining({
          title: 'Sözcüklerin Gücü (benim)',
          questions: ['Önceki günler nasıldı?', 'Haberi nasıl aldınız?'],
        }),
      ),
    );
    await waitFor(() =>
      expect(router.state.location.pathname).toBe('/psychologist/modules/m9'),
    );
  });

  it('edits their own module with no copy note, and Vazgeç goes back', async () => {
    answer('PSYCHOLOGIST');
    const { router } = mount('psychologist', '/psychologist/modules/m3/edit');
    const form = await screen.findByRole('form', { name: 'Modülü düzenle' });
    expect(form).not.toHaveTextContent(/size ait bir sürüm/);
    await userEvent.click(within(form).getByRole('button', { name: 'Vazgeç' }));
    expect(router.state.location.pathname).toBe('/psychologist/modules/m3');
    expect(api.patch).not.toHaveBeenCalled();
  });

  it('asks before taking a shared module off a counselor’s list', async () => {
    answer('PSYCHOLOGIST');
    const { router } = mount('psychologist', '/psychologist/modules/m2');
    await userEvent.click(
      within(await shown('Genel modül')).getByRole('button', {
        name: 'İşlemler: Genel modül',
      }),
    );
    await userEvent.click(
      await screen.findByRole('menuitem', { name: 'Listemden kaldır' }),
    );
    const confirm = await screen.findByRole('alertdialog');
    expect(confirm).toHaveTextContent(
      'Genel modül listenizden kaldırılsın mı?',
    );
    expect(api.delete).not.toHaveBeenCalled();
    await userEvent.click(
      within(confirm).getByRole('button', { name: 'Kaldır' }),
    );
    await waitFor(() => expect(api.delete).toHaveBeenCalledWith('/modules/m2'));
    await waitFor(() =>
      expect(router.state.location.pathname).toBe('/psychologist/modules'),
    );
  });

  it('asks the admin before deleting a global module', async () => {
    answer('ADMIN');
    mount('admin', '/admin/modules/m2');
    await userEvent.click(
      within(await shown('Genel modül')).getByRole('button', {
        name: 'İşlemler: Genel modül',
      }),
    );
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Sil' }));
    const confirm = await screen.findByRole('alertdialog');
    expect(confirm).toHaveTextContent('Genel modül silinsin mi?');
    expect(api.delete).not.toHaveBeenCalled();
    await userEvent.click(within(confirm).getByRole('button', { name: 'Sil' }));
    await waitFor(() => expect(api.delete).toHaveBeenCalledWith('/modules/m2'));
  });

  it('refuses a module without rules or questions, then creates and opens it', async () => {
    answer('ADMIN');
    vi.mocked(api.post).mockResolvedValueOnce(module({ id: 'm4' }));
    const { router } = mount('admin');
    await userEvent.click(
      await screen.findByRole('link', { name: 'Yeni modül' }),
    );
    expect(router.state.location.pathname).toBe('/admin/modules/new');
    const form = await screen.findByRole('form', { name: 'Yeni modül' });
    await userEvent.type(within(form).getByLabelText('Başlık'), 'Yeni');
    await userEvent.type(
      within(form).getByLabelText(/Açıklama/),
      'Hoş geldiniz',
    );
    await userEvent.click(
      within(form).getByRole('button', { name: 'Oluştur' }),
    );
    expect(await within(form).findAllByText('Bu alan gerekli.')).toHaveLength(
      2,
    );
    expect(api.post).not.toHaveBeenCalled();
    await userEvent.type(within(form).getByLabelText(/Kurallar/), 'Nazik olun');
    await userEvent.type(
      within(form).getByLabelText('1. soru'),
      'Ne hissettiniz?',
    );
    await userEvent.click(
      within(form).getByRole('button', { name: 'Soru ekle' }),
    );
    await userEvent.type(
      within(form).getByLabelText('2. soru'),
      'Sonra ne oldu?',
    );
    await userEvent.click(
      within(form).getByRole('checkbox', {
        name: 'Katılımcılar görsel ekleyebilsin',
      }),
    );
    await userEvent.click(
      within(form).getByRole('button', { name: 'Oluştur' }),
    );
    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith('/modules', {
        title: 'Yeni',
        description: 'Hoş geldiniz',
        rules: 'Nazik olun',
        questions: ['Ne hissettiniz?', 'Sonra ne oldu?'],
        allowImages: true,
        allowAudio: false,
      }),
    );
    await waitFor(() =>
      expect(router.state.location.pathname).toBe('/admin/modules/m4'),
    );
  });
});
