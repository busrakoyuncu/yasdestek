import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderApp } from '@/test/render';
import { ModuleListPage } from './ModuleListPage';
import { ModulePage } from './ModulePage';

vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
  return { ...actual, api: { ...actual.api, get: vi.fn(), put: vi.fn() } };
});

import { api, ApiError } from '@/lib/api';

const module = (id: string, title: string, responses?: unknown[]) => ({
  id,
  title,
  description: 'Bu modülde kaybınızı anlatın.',
  rules: 'Destekleyici olun.',
  questions: ['Haberi nasıl aldınız?', 'Sonraki günler nasıldı?'],
  order: 0,
  isBase: true,
  createdById: null,
  createdBy: null,
  responses,
  createdAt: '',
  updatedAt: '',
});
const draft = {
  id: 'r1',
  moduleId: 'm1',
  text: 'Bir salı sabahıydı.',
  published: false,
  createdAt: '2026-11-10T10:00:00Z',
  updatedAt: '2026-11-10T10:00:00Z',
  files: [],
};

const openModule = (mine: typeof draft | null) => {
  vi.mocked(api.get).mockImplementation((path: string) => {
    if (path === '/modules/m1')
      return Promise.resolve(module('m1', 'Sözcüklerin Gücü'));
    return mine
      ? Promise.resolve(mine)
      : Promise.reject(new ApiError(404, 'NOT_FOUND', ''));
  });
  return renderApp(
    <ModulePage />,
    '/app/modules/:moduleId',
    undefined,
    '/app/modules/m1',
  );
};

describe('participant modules', () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset();
    vi.mocked(api.put).mockReset();
  });

  it('lists the modules with where the participant stands', async () => {
    vi.mocked(api.get).mockResolvedValue([
      module('m1', 'Sözcüklerin Gücü', [{ published: true, updatedAt: '' }]),
      module('m2', 'Mektup Yazma', [{ published: false, updatedAt: '' }]),
      module('m3', 'Gelecek', []),
    ]);
    renderApp(<ModuleListPage />, '/app');
    const links = await screen.findAllByRole('link');
    expect(links[0]).toHaveTextContent('Paylaşıldı');
    expect(links[1]).toHaveTextContent('Taslak');
    expect(links[2]).toHaveTextContent('Başlamadınız');
    expect(links[1]).toHaveAttribute('href', '/app/modules/m2');
  });

  it('shows the module, starts from an empty page and saves a draft', async () => {
    vi.mocked(api.put).mockResolvedValueOnce({ ...draft, text: 'Bir salı' });
    openModule(null);
    expect(
      await screen.findByRole('heading', { name: 'Sözcüklerin Gücü' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Destekleyici olun.')).toBeInTheDocument();
    expect(screen.getByText('Haberi nasıl aldınız?')).toBeInTheDocument();
    const page = screen.getByRole('textbox', { name: 'Yanıtınız' });
    expect(page).toHaveValue('');
    expect(screen.getByText('Henüz kaydedilmedi.')).toBeInTheDocument();
    await userEvent.type(page, 'Bir salı');
    await userEvent.click(
      screen.getByRole('button', { name: 'Taslağı kaydet' }),
    );
    await waitFor(() =>
      expect(api.put).toHaveBeenCalledWith('/modules/m1/response', {
        text: 'Bir salı',
        published: false,
      }),
    );
    expect(await screen.findByText(/Taslak .* kaydedildi/)).toBeInTheDocument();
  });

  it('shares a saved draft with the group', async () => {
    vi.mocked(api.put).mockResolvedValueOnce({ ...draft, published: true });
    openModule(draft);
    const page = await screen.findByRole('textbox', { name: 'Yanıtınız' });
    expect(page).toHaveValue('Bir salı sabahıydı.');
    await userEvent.click(
      screen.getByRole('button', { name: 'Grupla paylaş' }),
    );
    await waitFor(() =>
      expect(api.put).toHaveBeenCalledWith('/modules/m1/response', {
        text: 'Bir salı sabahıydı.',
        published: true,
      }),
    );
    expect(
      await screen.findByText(/tarihinde grubunuzla paylaşıldı/),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Taslağı kaydet' })).toBeNull();
  });
});
