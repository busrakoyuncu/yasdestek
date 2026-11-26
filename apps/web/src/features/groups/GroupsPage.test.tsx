import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderApp } from '@/test/render';
import { GroupsPage } from './GroupsPage';

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

const person = (id: string, username: string, groupId: string | null) => ({
  id,
  role: 'USER',
  username,
  active: true,
  mustChangePassword: false,
  psychologistId: 'me',
  groupId,
  createdAt: '',
  updatedAt: '',
});
const mod = (id: string, title: string, order: number) => ({
  id,
  title,
  description: '',
  rules: '',
  questions: ['?'],
  order,
  isBase: true,
  createdById: null,
  createdBy: null,
  createdAt: '',
  updatedAt: '',
});
const group = (id: string, name: string, extra = {}) => ({
  id,
  name,
  psychologistId: 'me',
  createdAt: '',
  members: [],
  modules: [],
  ...extra,
});

// Salı grubu with two members (one inactive) and one module; an empty Yeni
// grup; deniz is in no group.
const data: Record<string, unknown> = {
  '/groups': [
    group('g1', 'Salı grubu', {
      members: [
        { id: 'u1', username: 'elif', active: true },
        { id: 'u2', username: 'can', active: false },
      ],
      modules: [{ module: { id: 'm1', title: 'Sözcüklerin Gücü', order: 0 } }],
    }),
    group('g2', 'Yeni grup'),
  ],
  '/users': [
    person('u1', 'elif', 'g1'),
    person('u2', 'can', 'g1'),
    person('u3', 'deniz', null),
  ],
  '/modules': [mod('m1', 'Sözcüklerin Gücü', 0), mod('m2', 'Mektup Yazma', 2)],
};

// The page at its own address, with or without a group in it.
const mount = (at = '/psychologist/groups') =>
  renderApp(<GroupsPage />, '/psychologist/groups/:groupId?', undefined, at);

const salı = () =>
  screen.findByRole('region', { name: 'Salı grubu 2 kişi, 1 modül' });

describe('GroupsPage', () => {
  beforeEach(() => {
    vi.mocked(api.get)
      .mockReset()
      .mockImplementation((path: string) => Promise.resolve(data[path]));
    vi.mocked(api.post).mockReset().mockResolvedValue(undefined);
    vi.mocked(api.patch).mockReset().mockResolvedValue(undefined);
    vi.mocked(api.delete).mockReset().mockResolvedValue(undefined);
  });

  it('lists the groups with counts and opens the first one', async () => {
    mount();
    const list = await screen.findByRole('navigation', { name: 'Gruplar' });
    const links = within(list).getAllByRole('link');
    expect(links.map((link) => link.textContent)).toEqual([
      'Salı grubu2 kişi, 1 modül',
      'Yeni grupHenüz boş',
    ]);
    expect(links[1]).toHaveAttribute('href', '/psychologist/groups/g2');
    expect(await salı()).toBeInTheDocument();
    // the people still to be placed are named above the groups
    expect(await screen.findByText('Grubu olmayanlar')).toBeInTheDocument();
    expect(screen.getByText('deniz')).toBeInTheDocument();
  });

  it('opens the group in the address, and says so when there is none', async () => {
    const { unmount } = mount('/psychologist/groups/g2');
    expect(
      await screen.findByRole('region', { name: 'Yeni grup Henüz boş' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^Yeni grup/ })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByText('Henüz üye yok.')).toBeInTheDocument();
    unmount();

    mount('/psychologist/groups/gone');
    expect(
      await screen.findByText('Bu grup bulunamadı. Listeden bir grup seçin.'),
    ).toBeInTheDocument();
  });

  it('shows the members and the modules with their forum', async () => {
    mount('/psychologist/groups/g1');
    const group = await salı();
    const [members, modules] = within(group).getAllByRole('list');
    expect(
      within(members)
        .getAllByRole('listitem')
        .map((row) => row.textContent),
    ).toEqual(['elifÇıkar', 'canEtkin değilÇıkar']);
    expect(within(modules).getByText('Sözcüklerin Gücü')).toBeInTheDocument();
    expect(
      within(modules).getByRole('link', {
        name: 'Sözcüklerin Gücü forumunu aç',
      }),
    ).toHaveAttribute('href', '/psychologist/forums/g1/m1');
  });

  it('adds a member from the people in no group', async () => {
    mount('/psychologist/groups/g1');
    await userEvent.click(
      within(await salı()).getByRole('button', { name: 'Üye ekle' }),
    );
    // the picker opens at once and offers only free participants
    expect(
      await screen.findByRole('option', { name: 'deniz' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'elif' })).toBeNull();
    await userEvent.click(screen.getByRole('option', { name: 'deniz' }));
    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith('/groups/g1/members', {
        userId: 'u3',
      }),
    );
  });

  it('assigns a module not yet in the group', async () => {
    mount('/psychologist/groups/g1');
    await userEvent.click(
      within(await salı()).getByRole('button', { name: 'Modül ata' }),
    );
    expect(
      await screen.findByRole('option', { name: 'Mektup Yazma' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('option', { name: 'Sözcüklerin Gücü' }),
    ).toBeNull();
    await userEvent.click(screen.getByRole('option', { name: 'Mektup Yazma' }));
    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith('/groups/g1/modules', {
        moduleId: 'm2',
      }),
    );
  });

  it('asks before taking a member out of the group', async () => {
    mount('/psychologist/groups/g1');
    const leave = within(await salı()).getByRole('button', {
      name: 'elif üyelikten çıkar',
    });

    // "Vazgeç" changes nothing
    await userEvent.click(leave);
    let dialog = await screen.findByRole('alertdialog', {
      name: 'elif gruptan çıkarılsın mı?',
    });
    expect(dialog).toHaveTextContent('Yazdıkları silinmez.');
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Vazgeç' }),
    );
    expect(api.delete).not.toHaveBeenCalled();

    await userEvent.click(leave);
    dialog = await screen.findByRole('alertdialog');
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Gruptan çıkar' }),
    );
    await waitFor(() =>
      expect(api.delete).toHaveBeenCalledWith('/groups/g1/members/u1'),
    );
  });

  it('asks before taking a module off the group', async () => {
    mount('/psychologist/groups/g1');
    await userEvent.click(
      within(await salı()).getByRole('button', {
        name: 'Sözcüklerin Gücü modülünü kaldır',
      }),
    );
    const dialog = await screen.findByRole('alertdialog', {
      name: 'Sözcüklerin Gücü bu gruptan kaldırılsın mı?',
    });
    expect(dialog).toHaveTextContent('forumu silinmez');
    expect(api.delete).not.toHaveBeenCalled();
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Modülü kaldır' }),
    );
    await waitFor(() =>
      expect(api.delete).toHaveBeenCalledWith('/groups/g1/modules/m1'),
    );
  });

  it('renames a group from its menu', async () => {
    mount('/psychologist/groups/g1');
    await userEvent.click(
      within(await salı()).getByRole('button', {
        name: 'İşlemler: Salı grubu',
      }),
    );
    await userEvent.click(
      await screen.findByRole('menuitem', { name: 'Adı değiştir' }),
    );
    const name = await screen.findByLabelText('Grup adı');
    expect(name).toHaveValue('Salı grubu');
    await userEvent.clear(name);
    await userEvent.type(name, 'Salı akşam grubu');
    await userEvent.click(screen.getByRole('button', { name: 'Kaydet' }));
    await waitFor(() =>
      expect(api.patch).toHaveBeenCalledWith('/groups/g1', {
        name: 'Salı akşam grubu',
      }),
    );
  });

  it('asks before deleting a group, then goes back to the list', async () => {
    const { router } = mount('/psychologist/groups/g1');
    await userEvent.click(
      within(await salı()).getByRole('button', {
        name: 'İşlemler: Salı grubu',
      }),
    );
    await userEvent.click(
      await screen.findByRole('menuitem', { name: 'Grubu sil' }),
    );
    const dialog = await screen.findByRole('alertdialog');
    expect(dialog).toHaveTextContent('yazdıkları kalır');
    expect(api.delete).not.toHaveBeenCalled();
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Grubu sil' }),
    );
    await waitFor(() => expect(api.delete).toHaveBeenCalledWith('/groups/g1'));
    await waitFor(() =>
      expect(router.state.location.pathname).toBe('/psychologist/groups'),
    );
  });

  it('opens a new group once it is made', async () => {
    vi.mocked(api.post).mockResolvedValueOnce(group('g9', 'Cuma grubu'));
    const { router } = mount();
    await userEvent.click(
      await screen.findByRole('button', { name: 'Yeni grup' }),
    );
    await userEvent.type(
      await screen.findByLabelText('Grup adı'),
      'Cuma grubu',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Oluştur' }));
    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith('/groups', { name: 'Cuma grubu' }),
    );
    await waitFor(() =>
      expect(router.state.location.pathname).toBe('/psychologist/groups/g9'),
    );
  });
});
