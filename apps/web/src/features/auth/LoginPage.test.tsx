import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderApp } from '@/test/render';
import { LoginPage } from './LoginPage';

vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
  return { ...actual, api: { ...actual.api, post: vi.fn(), get: vi.fn() } };
});

import { api, ApiError } from '@/lib/api';

const user = {
  id: 'u1',
  role: 'USER',
  username: 'elif',
  active: true,
  mustChangePassword: false,
  psychologistId: 'p1',
  groupId: 'g1',
};

describe('LoginPage', () => {
  beforeEach(() => vi.mocked(api.post).mockReset());

  it('refuses an empty form without calling the api', async () => {
    renderApp(<LoginPage />, '/login');
    await userEvent.click(screen.getByRole('button', { name: 'Giriş yap' }));
    await waitFor(() =>
      expect(screen.getAllByText('Bu alan gerekli.')).toHaveLength(2),
    );
    expect(api.post).not.toHaveBeenCalled();
  });

  it('signs in and sends the participant to their area', async () => {
    vi.mocked(api.post).mockResolvedValueOnce(user);
    const { router } = renderApp(<LoginPage />, '/login');
    await userEvent.type(screen.getByLabelText('Kullanıcı adı'), 'elif');
    await userEvent.type(screen.getByLabelText('Şifre'), 'secret-1');
    await userEvent.click(screen.getByRole('button', { name: 'Giriş yap' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/app'));
    expect(api.post).toHaveBeenCalledWith('/auth/login', {
      username: 'elif',
      password: 'secret-1',
    });
  });

  it('reveals the password on request', async () => {
    renderApp(<LoginPage />, '/login');
    const password = screen.getByLabelText('Şifre');
    expect(password).toHaveAttribute('type', 'password');
    await userEvent.click(
      screen.getByRole('button', { name: 'Şifreyi göster' }),
    );
    expect(password).toHaveAttribute('type', 'text');
    expect(
      screen.getByRole('button', { name: 'Şifreyi gizle' }),
    ).toBeInTheDocument();
  });

  it('shows a translated message for a wrong password', async () => {
    vi.mocked(api.post).mockRejectedValueOnce(
      new ApiError(401, 'INVALID_CREDENTIALS', 'nope'),
    );
    renderApp(<LoginPage />, '/login');
    await userEvent.type(screen.getByLabelText('Kullanıcı adı'), 'elif');
    await userEvent.type(screen.getByLabelText('Şifre'), 'wrong');
    await userEvent.click(screen.getByRole('button', { name: 'Giriş yap' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Kullanıcı adı veya şifre hatalı.',
    );
  });
});
