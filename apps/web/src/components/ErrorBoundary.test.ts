import { screen } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { defineComponent, h } from 'vue';
import { renderApp } from '@/test/render';
import ErrorBoundary from './ErrorBoundary.vue';

// Throws on its first render only, like a page that failed once.
let renders = 0;
const Flaky = defineComponent({
  setup() {
    renders += 1;
    if (renders === 1) throw new Error('boom');
    return () => h('p', 'sağlam');
  },
});

describe('ErrorBoundary', () => {
  it('shows a translated message with retry, and remounts the children on retry', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    renderApp(
      defineComponent(
        () => () => h(ErrorBoundary, null, { default: () => h(Flaky) }),
      ),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Bir şeyler ters gitti.',
    );

    await userEvent.click(screen.getByRole('button', { name: 'Yeniden dene' }));
    expect(await screen.findByText('sağlam')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
