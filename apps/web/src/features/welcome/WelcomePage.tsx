import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { LanguageSwitch } from '@/components/LanguageSwitch';
import { Button } from '@/components/ui/button';
import { createFireflies } from './fireflies.js';

// Landing page: the night forest with live fireflies that gather around the
// pointer. Always rendered in the dark theme, whose tokens are this image's
// colors. The canvas ignores clicks, so the button underneath stays usable.
export function WelcomePage() {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const fireflies = createFireflies(canvasRef.current);
    return () => fireflies.destroy();
  }, []);

  return (
    <main className="dark relative grid min-h-svh place-items-center overflow-hidden bg-background text-glow selection:bg-glow/30 selection:text-foreground">
      <img
        src="/forest-2752.jpg"
        srcSet="/forest-1280.jpg 1280w, /forest-2752.jpg 2752w"
        sizes="100vw"
        alt=""
        className="absolute inset-0 size-full object-cover"
      />
      {/* darkens the sky and the grass a little so the text reads */}
      <div
        className="absolute inset-0 bg-gradient-to-b from-background/35 via-transparent via-35% to-background/55"
        aria-hidden="true"
      />
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 size-full"
        aria-hidden="true"
      />
      <header className="absolute top-4 right-4 z-10">
        <LanguageSwitch
          className="rounded-full border-secondary-accent/70 bg-background/40 text-glow backdrop-blur-sm hover:border-secondary-accent hover:bg-secondary-accent/10 hover:text-glow aria-expanded:border-secondary-accent aria-expanded:bg-secondary-accent/10 aria-expanded:text-glow dark:hover:bg-secondary-accent/10"
          menuClassName="dark min-w-40 border border-secondary-accent/70 bg-popover text-glow ring-0 [&_[role=menuitemradio]]:focus:text-glow"
        />
      </header>

      <div className="relative isolate -mt-[12vh] flex flex-col items-center gap-8 px-4 text-center">
        {/* a pool of dusk behind the words, so firelight text reads over the fog */}
        <div
          className="absolute -inset-x-40 -inset-y-32 -z-10 bg-radial from-background/55 via-background/20 via-40% to-transparent to-70%"
          aria-hidden="true"
        />
        <h1 className="text-5xl font-medium tracking-tight text-balance md:text-7xl">
          {t('welcome.title')}
        </h1>
        <Button
          asChild
          size="lg"
          variant="outline"
          // the outline variant sets its own dark: border and background; override those too
          className="rounded-full border-secondary-accent/70 bg-background/40 px-6 text-glow backdrop-blur-sm hover:border-secondary-accent hover:bg-secondary-accent/10 hover:text-glow dark:border-secondary-accent/70 dark:bg-background/40 dark:hover:border-secondary-accent dark:hover:bg-secondary-accent/10"
        >
          <Link to="/login">{t('welcome.continue')}</Link>
        </Button>
      </div>
    </main>
  );
}
