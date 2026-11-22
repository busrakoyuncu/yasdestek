import { useSyncExternalStore } from 'react';

// Installing the app to the home screen. Chrome and Edge announce that the
// app can be installed with a `beforeinstallprompt` event, which we keep and
// replay from the account menu. Safari on iPhone and iPad has no such event:
// there the menu explains the Share > "Add to Home Screen" steps instead.

// Chrome's event; not part of the standard DOM types.
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
}

let deferred: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();
const changed = () => listeners.forEach((listener) => listener());

// The event can fire before React has drawn anything, so this listens from
// the moment the module loads (main.tsx imports it first).
window.addEventListener('beforeinstallprompt', (event) => {
  // Keep Chrome's own install banner away; the offer lives in the menu.
  event.preventDefault();
  deferred = event as BeforeInstallPromptEvent;
  changed();
});
window.addEventListener('appinstalled', () => {
  deferred = null;
  changed();
});

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

// Already running from the home screen: nothing to offer.
const standalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as { standalone?: boolean }).standalone === true;

// iPadOS reports itself as a Mac; touch tells them apart.
const apple = () =>
  /iPhone|iPad|iPod/.test(navigator.userAgent) ||
  (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);

// 'prompt': the browser's own install dialog is ready. 'ios': show the
// steps. null: offer nothing (installed, or the browser cannot install).
export type InstallOption = 'prompt' | 'ios' | null;

export function useInstall() {
  const ready = useSyncExternalStore(subscribe, () => deferred !== null);
  const option: InstallOption = standalone()
    ? null
    : ready
      ? 'prompt'
      : apple()
        ? 'ios'
        : null;

  // The event can be used only once; Chrome fires a new one if it is
  // dismissed and still installable later.
  const install = async () => {
    const event = deferred;
    if (!event) return;
    deferred = null;
    changed();
    await event.prompt();
  };

  return { option, install };
}
