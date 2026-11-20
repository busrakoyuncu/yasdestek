import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setLocale } from '@/lib/i18n';
import { renderApp } from '@/test/render';
import { RulesPage } from './RulesPage';

vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
  return {
    ...actual,
    api: { ...actual.api, get: vi.fn(), put: vi.fn() },
  };
});

import { api, ApiError } from '@/lib/api';

const texts: Record<string, string> = {
  tr: 'Birbirinize nazik olun.\n\nYargılamadan dinleyin.',
  en: 'Be kind to each other.',
  de: 'Seien Sie freundlich zueinander.',
};

// /auth/me answers the session in the given role, /pages/... the page in
// the asked language.
const answer = (role: string) =>
  vi.mocked(api.get).mockImplementation((path: string) => {
    if (path === '/auth/me') return Promise.resolve({ id: 'u1', role });
    const locale = path.split('locale=')[1];
    return Promise.resolve({
      slug: 'general-rules',
      locale,
      content: texts[locale],
      updatedAt: '',
    });
  });

describe('RulesPage', () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset();
    vi.mocked(api.put).mockReset();
  });

  it('shows the page text as paragraphs', async () => {
    answer('USER');
    renderApp(<RulesPage />, '/app/rules');
    expect(
      await screen.findByText('Birbirinize nazik olun.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Yargılamadan dinleyin.')).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith('/pages/general-rules?locale=tr');
    expect(
      screen.queryByRole('button', { name: 'Düzenle' }),
    ).not.toBeInTheDocument();
  });

  it('asks again in the new language after a switch', async () => {
    answer('USER');
    renderApp(<RulesPage />, '/app/rules');
    expect(
      await screen.findByText('Birbirinize nazik olun.'),
    ).toBeInTheDocument();
    await act(() => setLocale('en'));
    expect(
      await screen.findByText('Be kind to each other.'),
    ).toBeInTheDocument();
    expect(api.get).toHaveBeenLastCalledWith('/pages/general-rules?locale=en');
  });

  it('offers a retry when the page cannot be loaded', async () => {
    answer('USER');
    vi.mocked(api.get).mockImplementationOnce(() =>
      Promise.resolve({ id: 'u1', role: 'USER' }),
    );
    vi.mocked(api.get).mockImplementationOnce(() =>
      Promise.reject(new ApiError(0, 'NETWORK', '')),
    );
    renderApp(<RulesPage />, '/app/rules');
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Bağlantı kurulamadı.',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Tekrar dene' }));
    expect(
      await screen.findByText('Birbirinize nazik olun.'),
    ).toBeInTheDocument();
  });

  describe('for the admin', () => {
    const openEditor = async () => {
      answer('ADMIN');
      renderApp(<RulesPage />, '/admin/rules');
      await userEvent.click(
        await screen.findByRole('button', { name: 'Düzenle' }),
      );
      return screen.findByRole('tab', { name: 'Türkçe' });
    };

    it('edits each language in its own tab and saves only that one', async () => {
      vi.mocked(api.put).mockResolvedValueOnce(undefined);
      const turkish = await openEditor();
      // starts on the interface language
      expect(turkish).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByRole('textbox', { name: 'Türkçe metni' })).toHaveValue(
        texts.tr,
      );

      await userEvent.click(screen.getByRole('tab', { name: 'English' }));
      const english = screen.getByRole('textbox', { name: 'English metni' });
      expect(english).toHaveValue(texts.en);
      const save = screen.getByRole('button', {
        name: 'English metnini kaydet',
      });
      expect(save).toBeDisabled();

      await userEvent.type(english, ' Listen.');
      // the tab says it holds unsaved text
      expect(
        screen.getByRole('tab', { name: /English.*kaydedilmemiş/ }),
      ).toBeInTheDocument();
      await userEvent.click(save);
      await waitFor(() =>
        expect(api.put).toHaveBeenCalledWith('/pages/general-rules?locale=en', {
          content: 'Be kind to each other. Listen.',
        }),
      );
      expect(api.put).toHaveBeenCalledTimes(1);
    });

    it('asks before leaving the editor with unsaved text', async () => {
      await openEditor();
      await userEvent.type(
        screen.getByRole('textbox', { name: 'Türkçe metni' }),
        ' Ek.',
      );
      await userEvent.click(
        screen.getByRole('button', { name: 'Düzenlemeyi bitir' }),
      );
      await userEvent.click(
        await screen.findByRole('button', { name: 'Düzenlemeye devam et' }),
      );
      expect(screen.getByRole('textbox', { name: 'Türkçe metni' })).toHaveValue(
        `${texts.tr} Ek.`,
      );

      await userEvent.click(
        screen.getByRole('button', { name: 'Düzenlemeyi bitir' }),
      );
      await userEvent.click(
        await screen.findByRole('button', { name: 'Kaydetmeden çık' }),
      );
      expect(
        await screen.findByText('Birbirinize nazik olun.'),
      ).toBeInTheDocument();
      expect(api.put).not.toHaveBeenCalled();
    });
  });
});
