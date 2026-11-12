import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderApp } from '@/test/render';
import { InboxPage } from './InboxPage';
import { MessagesPage } from './MessagesPage';

vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
  return {
    ...actual,
    api: { ...actual.api, get: vi.fn(), post: vi.fn(), patch: vi.fn() },
  };
});

import { api } from '@/lib/api';

const participant = {
  id: 'u1',
  role: 'USER',
  username: 'elif',
  active: true,
  mustChangePassword: false,
  psychologistId: 'p1',
  groupId: 'g1',
};
const counselor = {
  ...participant,
  id: 'p1',
  role: 'PSYCHOLOGIST',
  username: 'ayse',
  psychologistId: null,
};

const thread = [
  {
    id: 'm1',
    senderId: 'u1',
    recipientId: 'p1',
    body: 'Takıldım.',
    readAt: '2026-11-10T10:05:00Z',
    createdAt: '2026-11-10T10:00:00Z',
  },
  {
    id: 'm2',
    senderId: 'p1',
    recipientId: 'u1',
    body: 'Çok doğal.',
    readAt: null,
    createdAt: '2026-11-11T09:00:00Z',
  },
];

const answer = (me: unknown, routes: Record<string, unknown>) =>
  vi
    .mocked(api.get)
    .mockImplementation((path: string) =>
      Promise.resolve(path === '/auth/me' ? me : routes[path]),
    );

describe('messages', () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset();
    vi.mocked(api.post).mockReset();
    vi.mocked(api.patch).mockReset().mockResolvedValue(undefined);
  });

  it('shows the participant their thread and marks the counselor message read', async () => {
    answer(participant, { '/messages': thread });
    renderApp(<MessagesPage />, '/app/messages');
    expect(await screen.findByText('Çok doğal.')).toBeInTheDocument();
    expect(screen.getByText('Takıldım.')).toBeInTheDocument();
    await waitFor(() =>
      expect(api.patch).toHaveBeenCalledWith('/messages/m2/read'),
    );
    expect(api.patch).toHaveBeenCalledTimes(1); // the one already read is left alone
  });

  it('sends what the participant typed, without naming a recipient', async () => {
    answer(participant, { '/messages': [] });
    vi.mocked(api.post).mockResolvedValueOnce({});
    renderApp(<MessagesPage />, '/app/messages');
    const box = await screen.findByRole('textbox', { name: 'Mesaj' });
    expect(screen.getByRole('button', { name: 'Gönder' })).toBeDisabled();
    await userEvent.type(box, 'Merhaba{Enter}');
    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith('/messages', {
        body: 'Merhaba',
        recipientId: undefined,
      }),
    );
    await waitFor(() => expect(box).toHaveValue(''));
  });

  it('lists the inbox with unread counts and opens a thread with the participant named', async () => {
    answer(counselor, {
      '/messages': [
        { id: 'u1', username: 'elif', active: true, unread: 2 },
        { id: 'u2', username: 'can', active: true, unread: 0 },
      ],
      '/messages/u1': thread,
    });
    vi.mocked(api.post).mockResolvedValueOnce({});
    const { router } = renderApp(
      <InboxPage />,
      '/psychologist/inbox',
      undefined,
    );
    const elif = await screen.findByRole('link', { name: /elif/ });
    expect(within(elif).getByLabelText('2 okunmamış')).toBeInTheDocument();
    expect(
      within(screen.getByRole('link', { name: /can/ })).queryByText('0'),
    ).toBeNull();
    await userEvent.click(elif);
    await waitFor(() =>
      expect(router.state.location.pathname).toBe('/psychologist/inbox/u1'),
    );
  });
});
