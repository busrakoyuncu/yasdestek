import { VueQueryPlugin } from '@tanstack/vue-query';
import { render, type RenderOptions } from '@testing-library/vue';
import type { Component } from 'vue';
import { createMemoryHistory, createRouter, type Router } from 'vue-router';
import { i18n } from '@/lib/i18n';
import { queryClient } from '@/lib/query';

// Mounts a component with the same plugins the app uses, and a memory
// router with catch-all routes so navigation can be asserted.
export function renderApp(
  component: Component,
  options: RenderOptions<Component> = {},
) {
  const router: Router = createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/:pathMatch(.*)*',
        name: 'any',
        component: { template: '<div />' },
      },
    ],
  });
  queryClient.clear();
  const result = render(component, {
    ...options,
    global: { plugins: [i18n, [VueQueryPlugin, { queryClient }], router] },
  });
  return { ...result, router };
}
