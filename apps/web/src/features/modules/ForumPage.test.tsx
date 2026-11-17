import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderApp } from '@/test/render';
import { ForumPage } from './ForumPage';

vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
  return {
    ...actual,
    api: { ...actual.api, get: vi.fn(), post: vi.fn() },
  };
});

import { api, ApiError } from '@/lib/api';

const participant = (groupId: string | null) => ({
  id: 'u1',
  role: 'USER',
  username: 'elif',
  active: true,
  mustChangePassword: false,
  psychologistId: 'p1',
  groupId,
  createdAt: '',
  updatedAt: '',
});

const post = {
  id: 'r2',
  text: 'Babamı bir kış sabahı kaybettim.',
  user: { id: 'u2', username: 'kerem' },
  createdAt: '2026-11-10T10:00:00Z',
  updatedAt: '2026-11-10T10:00:00Z',
  files: [
    { id: 'f1', mimeType: 'image/jpeg', size: 1, createdAt: '' },
    { id: 'f2', mimeType: 'audio/webm', size: 1, createdAt: '' },
  ],
  comments: [
    {
      id: 'c1',
      text: 'Paylaştığın için teşekkürler.',
      author: { id: 'u1', username: 'elif' },
      createdAt: '2026-11-11T10:00:00Z',
      deletedAt: null,
    },
    {
      id: 'c2',
      text: null,
      author: null,
      createdAt: '2026-11-11T11:00:00Z',
      deletedAt: '2026-11-12T10:00:00Z',
    },
  ],
};

const openForum = (
  groupId: string | null,
  posts: unknown[] | null = [post],
) => {
  vi.mocked(api.get).mockImplementation((path: string) => {
    if (path === '/auth/me') return Promise.resolve(participant(groupId));
    if (path === '/modules/m1')
      return Promise.resolve({
        id: 'm1',
        title: 'Sözcüklerin Gücü',
        questions: ['Haberi nasıl aldınız?'],
      });
    if (path === '/groups/g1/forum/m1')
      return posts
        ? Promise.resolve(posts)
        : Promise.reject(new ApiError(500, 'UNKNOWN', ''));
    return Promise.reject(new Error(`unexpected ${path}`));
  });
  return renderApp(
    <ForumPage />,
    '/app/forums/:moduleId',
    undefined,
    '/app/forums/m1',
  );
};

describe('group forum', () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset();
    vi.mocked(api.post).mockReset();
  });

  it('shows each shared response with its files and comments', async () => {
    openForum('g1');
    const kerem = await screen.findByRole('region', { name: 'kerem' });
    expect(
      screen.getByRole('heading', { level: 1, name: 'Sözcüklerin Gücü' }),
    ).toBeInTheDocument();
    expect(
      within(kerem).getByText('Babamı bir kış sabahı kaybettim.'),
    ).toBeInTheDocument();
    expect(within(kerem).getByRole('img')).toHaveAttribute(
      'src',
      '/api/files/f1',
    );
    expect(within(kerem).getByLabelText('1. ses kaydı')).toHaveAttribute(
      'src',
      '/api/files/f2',
    );

    const comments = within(kerem).getByRole('list', { name: 'Yorumlar' });
    expect(
      within(comments).getByText('Paylaştığın için teşekkürler.'),
    ).toBeInTheDocument();
    expect(within(comments).getByText('elif')).toBeInTheDocument();
    expect(
      within(comments).getByText('Bu yorum kaldırıldı.'),
    ).toBeInTheDocument();
  });

  it('keeps the questions at hand, folded away', async () => {
    openForum('g1');
    const strip = await screen.findByText('Yönlendirici sorular', {
      selector: 'summary',
    });
    expect(strip.closest('details')).not.toHaveAttribute('open');
    expect(screen.getByText('Haberi nasıl aldınız?')).toBeInTheDocument();
  });

  it("puts the reader's own response last, named as theirs", async () => {
    const mine = {
      ...post,
      id: 'r1',
      text: 'Annemi bir salı kaybettim.',
      user: { id: 'u1', username: 'elif' },
      files: [],
      comments: [],
    };
    openForum('g1', [mine, post]);
    await screen.findByRole('region', { name: 'kerem' });
    const regions = screen.getAllByRole('region');
    expect(regions).toHaveLength(2);
    expect(regions[1]).toHaveAccessibleName('Sizin paylaşımınız');
    expect(
      within(regions[1]).getByText('Annemi bir salı kaybettim.'),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: 'Yazmaya başlayın' }),
    ).not.toBeInTheDocument();
  });

  it('says so when no one has shared yet, and offers to write', async () => {
    openForum('g1', []);
    expect(
      await screen.findByText(
        'Grup arkadaşlarınızdan bu modülü henüz kimse paylaşmadı.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Yazmaya başlayın' }),
    ).toHaveAttribute('href', '/app/modules/m1');
  });

  it('offers a retry when the forum could not load', async () => {
    openForum('g1', null);
    await screen.findByRole('alert');
    vi.mocked(api.get).mockImplementation((path: string) =>
      Promise.resolve(
        path === '/auth/me'
          ? participant('g1')
          : path === '/modules/m1'
            ? { id: 'm1', title: 'Sözcüklerin Gücü', questions: [] }
            : [post],
      ),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Tekrar dene' }));
    expect(
      await screen.findByRole('region', { name: 'kerem' }),
    ).toBeInTheDocument();
  });

  it('explains the empty page to a participant without a group', async () => {
    openForum(null);
    expect(
      await screen.findByText(/Henüz bir gruba eklenmediniz/),
    ).toBeInTheDocument();
    expect(api.get).not.toHaveBeenCalledWith(
      expect.stringContaining('/forum/'),
    );
  });

  it('leads back to the forum list', async () => {
    openForum('g1');
    expect(
      await screen.findByRole('link', { name: 'Forumlara dön' }),
    ).toHaveAttribute('href', '/app/forums');
  });

  it('adds a comment under a response and shows the forum again', async () => {
    vi.mocked(api.post).mockResolvedValueOnce({});
    openForum('g1');
    const kerem = await screen.findByRole('region', { name: 'kerem' });
    const send = within(kerem).getByRole('button', { name: 'Yorumu gönder' });
    expect(send).toBeDisabled();

    const box = within(kerem).getByRole('textbox', { name: 'Yorumunuz' });
    await userEvent.type(box, ' Yanındayım. ');
    await userEvent.click(send);
    expect(api.post).toHaveBeenCalledWith('/responses/r2/comments', {
      text: 'Yanındayım.',
    });
    await waitFor(() => expect(box).toHaveValue(''));
    // fetched once on open, once more after the comment
    expect(
      vi
        .mocked(api.get)
        .mock.calls.filter(([path]) => path.includes('/forum/')),
    ).toHaveLength(2);
  });

  it('sends with Enter and starts a new line with Shift and Enter', async () => {
    vi.mocked(api.post).mockResolvedValueOnce({});
    openForum('g1');
    const box = await screen.findByRole('textbox', { name: 'Yorumunuz' });
    await userEvent.type(box, 'Bir{Shift>}{Enter}{/Shift}iki');
    expect(box).toHaveValue('Bir\niki');
    expect(api.post).not.toHaveBeenCalled();
    await userEvent.type(box, '{Enter}');
    expect(api.post).toHaveBeenCalledWith('/responses/r2/comments', {
      text: 'Bir\niki',
    });
  });

  it('keeps the comment when it could not be sent', async () => {
    vi.mocked(api.post).mockRejectedValueOnce(new ApiError(0, 'NETWORK', ''));
    openForum('g1');
    const box = await screen.findByRole('textbox', { name: 'Yorumunuz' });
    await userEvent.type(box, 'Yanındayım.{Enter}');
    await waitFor(() => expect(api.post).toHaveBeenCalled());
    expect(box).toHaveValue('Yanındayım.');
  });
});
