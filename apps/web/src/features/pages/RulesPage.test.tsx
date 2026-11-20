import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setLocale } from '@/lib/i18n';
import { renderApp } from '@/test/render';
import { RulesPage } from './RulesPage';

vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
  return { ...actual, api: { ...actual.api, get: vi.fn() } };
});

import { api, ApiError } from '@/lib/api';

describe('RulesPage', () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset();
  });

  it('shows the page text as paragraphs', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      slug: 'general-rules',
      content: 'Birbirinize nazik olun.\n\nYargılamadan dinleyin.',
      updatedAt: '',
    });
    renderApp(<RulesPage />, '/app/rules');
    expect(
      await screen.findByText('Birbirinize nazik olun.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Yargılamadan dinleyin.')).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith('/pages/general-rules?locale=tr');
  });

  it('asks again in the new language after a switch', async () => {
    vi.mocked(api.get).mockImplementation((path: string) =>
      Promise.resolve({
        slug: 'general-rules',
        locale: path.endsWith('=en') ? 'en' : 'tr',
        content: path.endsWith('=en') ? 'Be kind.' : 'Nazik olun.',
        updatedAt: '',
      }),
    );
    renderApp(<RulesPage />, '/app/rules');
    expect(await screen.findByText('Nazik olun.')).toBeInTheDocument();
    await act(() => setLocale('en'));
    expect(await screen.findByText('Be kind.')).toBeInTheDocument();
    expect(api.get).toHaveBeenLastCalledWith('/pages/general-rules?locale=en');
  });

  it('offers a retry when the page cannot be loaded', async () => {
    vi.mocked(api.get)
      .mockRejectedValueOnce(new ApiError(0, 'NETWORK', ''))
      .mockResolvedValueOnce({
        slug: 'general-rules',
        content: 'Kurallar',
        updatedAt: '',
      });
    renderApp(<RulesPage />, '/app/rules');
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Bağlantı kurulamadı.',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Tekrar dene' }));
    expect(await screen.findByText('Kurallar')).toBeInTheDocument();
  });
});
