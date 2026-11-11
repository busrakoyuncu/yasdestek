import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderApp } from '@/test/render';
import { ChangePasswordPage } from './ChangePasswordPage';

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
  mustChangePassword: true,
  psychologistId: 'p1',
  groupId: 'g1',
};

const fill = async (current: string, next: string) => {
  await userEvent.type(await screen.findByLabelText('Mevcut şifre'), current);
  await userEvent.type(screen.getByLabelText('Yeni şifre'), next);
  await userEvent.click(
    screen.getByRole('button', { name: 'Şifreyi değiştir' }),
  );
};

describe('ChangePasswordPage', () => {
  beforeEach(() => {
    vi.mocked(api.post).mockReset();
    vi.mocked(api.get).mockReset().mockResolvedValue(user);
  });

  it('refuses a short new password without calling the api', async () => {
    renderApp(<ChangePasswordPage />, '/change-password');
    await fill('handed-out', 'abc');
    expect(
      await screen.findByText('En az 8 karakter olmalı.'),
    ).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('asks for an uppercase and a lowercase letter', async () => {
    renderApp(<ChangePasswordPage />, '/change-password');
    await fill('handed-out', 'all-lowercase');
    expect(
      await screen.findByText('Büyük ve küçük harf içermeli.'),
    ).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('changes the password and sends the participant home', async () => {
    vi.mocked(api.post).mockResolvedValueOnce(undefined);
    const { router } = renderApp(<ChangePasswordPage />, '/change-password');
    await fill('handed-out', 'Only-mine-now');
    await waitFor(() => expect(router.state.location.pathname).toBe('/app'));
    expect(api.post).toHaveBeenCalledWith('/auth/change-password', {
      currentPassword: 'handed-out',
      newPassword: 'Only-mine-now',
    });
  });

  it('shows a translated message for a wrong current password', async () => {
    vi.mocked(api.post).mockRejectedValueOnce(
      new ApiError(400, 'WRONG_PASSWORD', 'nope'),
    );
    renderApp(<ChangePasswordPage />, '/change-password');
    await fill('not-it', 'Only-mine-now');
    expect(
      await screen.findByText('Mevcut şifre hatalı. Tekrar deneyin.'),
    ).toBeInTheDocument();
  });

  it('sends someone who already changed it straight home', async () => {
    vi.mocked(api.get).mockResolvedValue({
      ...user,
      mustChangePassword: false,
    });
    const { router } = renderApp(<ChangePasswordPage />, '/change-password');
    await waitFor(() => expect(router.state.location.pathname).toBe('/app'));
  });
});
