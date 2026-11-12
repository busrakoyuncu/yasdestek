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
const data: Record<string, unknown> = {
  '/groups': [
    {
      id: 'g1',
      name: 'Salı grubu',
      psychologistId: 'me',
      createdAt: '',
      members: [
        { id: 'u1', username: 'elif', active: true },
        { id: 'u2', username: 'can', active: false },
      ],
      modules: [{ module: { id: 'm1', title: 'Sözcüklerin Gücü', order: 0 } }],
    },
  ],
  '/users': [
    person('u1', 'elif', 'g1'),
    person('u2', 'can', 'g1'),
    person('u3', 'deniz', null),
  ],
  '/modules': [mod('m1', 'Sözcüklerin Gücü', 0), mod('m2', 'Mektup Yazma', 2)],
};

describe('GroupsPage', () => {
  beforeEach(() => {
    vi.mocked(api.get)
      .mockReset()
      .mockImplementation((path: string) => Promise.resolve(data[path]));
    vi.mocked(api.post).mockReset().mockResolvedValue(undefined);
    vi.mocked(api.delete).mockReset().mockResolvedValue(undefined);
  });

  it('shows each group with its members and assigned modules', async () => {
    renderApp(<GroupsPage />, '/psychologist/groups');
    const group = await screen.findByRole('region', { name: 'Salı grubu' });
    expect(within(group).getByText('elif')).toBeInTheDocument();
    expect(within(group).getByText('can')).toBeInTheDocument();
    expect(
      within(group).getByText('etkin değil', { exact: false }),
    ).toBeInTheDocument();
    expect(within(group).getByText('Sözcüklerin Gücü')).toBeInTheDocument();
  });

  it('offers only free participants and adds the chosen one', async () => {
    renderApp(<GroupsPage />, '/psychologist/groups');
    await userEvent.click(
      await screen.findByRole('combobox', { name: 'Üye ekle' }),
    );
    expect(screen.queryByRole('option', { name: 'elif' })).toBeNull();
    await userEvent.click(await screen.findByRole('option', { name: 'deniz' }));
    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith('/groups/g1/members', {
        userId: 'u3',
      }),
    );
  });

  it('offers only modules not yet assigned and assigns the chosen one', async () => {
    renderApp(<GroupsPage />, '/psychologist/groups');
    await userEvent.click(
      await screen.findByRole('combobox', { name: 'Modül ata' }),
    );
    expect(
      screen.queryByRole('option', { name: 'Sözcüklerin Gücü' }),
    ).toBeNull();
    await userEvent.click(
      await screen.findByRole('option', { name: 'Mektup Yazma' }),
    );
    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith('/groups/g1/modules', {
        moduleId: 'm2',
      }),
    );
  });

  it('asks before deleting a group and says members keep their writing', async () => {
    renderApp(<GroupsPage />, '/psychologist/groups');
    await userEvent.click(
      await screen.findByRole('button', { name: 'Grubu sil: Salı grubu' }),
    );
    const dialog = await screen.findByRole('alertdialog');
    expect(dialog).toHaveTextContent('yazdıkları kalır');
    expect(api.delete).not.toHaveBeenCalled();
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Grubu sil' }),
    );
    await waitFor(() => expect(api.delete).toHaveBeenCalledWith('/groups/g1'));
  });
});
