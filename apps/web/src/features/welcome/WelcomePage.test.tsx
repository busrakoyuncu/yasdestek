import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderApp } from '@/test/render';
import { WelcomePage } from './WelcomePage';

// jsdom has no 2D canvas or ResizeObserver; the animation is not under test.
vi.mock('./fireflies.js', () => ({
  createFireflies: () => ({ destroy: () => {} }),
}));

describe('WelcomePage', () => {
  it('welcomes and continues to the login page', async () => {
    const { router } = renderApp(<WelcomePage />, '/');
    expect(
      screen.getByRole('heading', { name: "Yasdestek'e Hoşgeldiniz" }),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole('link', { name: 'Devam et' }));
    expect(router.state.location.pathname).toBe('/login');
  });
});
