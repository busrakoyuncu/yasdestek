import { cn } from 'cn';
import type { ReactNode } from 'react';
import { LanguageSwitch } from '@/components/LanguageSwitch';

// The night forest behind the public pages: the image, a dusk gradient over
// sky and grass, and the language switch in the corner. Always the dark theme,
// whatever the device prefers. `backdrop` renders between the image and the
// content (the welcome page puts its firefly canvas there).

// Controls on the forest: firefly-gold outline, firelight text.
const forestControl =
  'h-11 rounded-full px-4 text-sm border-secondary-accent/70 bg-background/40 text-glow backdrop-blur-sm hover:border-secondary-accent hover:bg-secondary-accent/10 hover:text-glow aria-expanded:border-secondary-accent aria-expanded:bg-secondary-accent/10 aria-expanded:text-glow dark:hover:bg-secondary-accent/10';
const forestMenu =
  'dark min-w-40 border border-secondary-accent/70 bg-popover text-glow ring-0 [&_[role=menuitemradio]]:focus:text-glow';

export function ForestPage({
  children,
  backdrop,
  className,
}: {
  children: ReactNode;
  backdrop?: ReactNode;
  className?: string;
}) {
  return (
    <main
      className={cn(
        'dark relative min-h-svh overflow-hidden bg-background text-glow selection:bg-glow/30 selection:text-foreground',
        className,
      )}
    >
      <img
        src="/forest-2752.jpg"
        srcSet="/forest-1280.jpg 1280w, /forest-2752.jpg 2752w"
        sizes="100vw"
        alt=""
        className="absolute inset-0 size-full object-cover"
      />
      <div
        className="absolute inset-0 bg-gradient-to-b from-background/35 via-transparent via-35% to-background/55"
        aria-hidden="true"
      />
      {backdrop}
      <header className="absolute top-4 right-4 z-10">
        <LanguageSwitch className={forestControl} menuClassName={forestMenu} />
      </header>
      {children}
    </main>
  );
}
