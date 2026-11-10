import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderApp } from '@/test/render';
import { LanguageSwitch } from './LanguageSwitch';

describe('LanguageSwitch', () => {
  it('switches the language and remembers it', async () => {
    renderApp(<LanguageSwitch />);
    await userEvent.click(screen.getByRole('button', { name: 'Dil' }));
    await userEvent.click(
      await screen.findByRole('menuitemradio', { name: 'English' }),
    );
    expect(
      await screen.findByRole('button', { name: 'Language' }),
    ).toHaveTextContent('English');
    expect(document.documentElement.lang).toBe('en');
    expect(localStorage.getItem('locale')).toBe('en');
  });
});
