import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/vue';
import { afterEach, beforeEach } from 'vitest';
import { setLocale } from '@/lib/i18n';

// jsdom reports English; tests assert the Turkish default.
beforeEach(() => setLocale('tr'));
// Without vitest globals, Testing Library does not unmount between tests on its own.
afterEach(cleanup);
