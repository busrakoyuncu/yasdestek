import { screen } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderApp } from '@/test/render';
import GeneralRulesPage from './GeneralRulesPage.vue';

vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
  return { ...actual, api: { ...actual.api, get: vi.fn() } };
});

import { api, ApiError } from '@/lib/api';

describe('GeneralRulesPage', () => {
  beforeEach(() => vi.mocked(api.get).mockReset());

  it('shows the page content as written', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      id: '1',
      slug: 'general-rules',
      content: 'Genel Kurallar\n\n- Nazik olun.',
      updatedAt: '',
    });
    renderApp(GeneralRulesPage);
    expect(await screen.findByText(/Nazik olun/)).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith('/pages/general-rules');
  });

  it('shows an inline error with retry when loading fails', async () => {
    vi.mocked(api.get)
      .mockRejectedValueOnce(new ApiError(0, 'NETWORK', 'down'))
      .mockResolvedValueOnce({
        id: '1',
        slug: 'general-rules',
        content: 'Geldi',
        updatedAt: '',
      });
    renderApp(GeneralRulesPage);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Bağlantı kurulamadı.',
    );

    await userEvent.click(screen.getByRole('button', { name: 'Yeniden dene' }));
    expect(await screen.findByText('Geldi')).toBeInTheDocument();
  });
});
