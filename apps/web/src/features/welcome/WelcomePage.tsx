import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { ForestPage } from '@/components/ForestPage';
import { Button } from '@/components/ui/button';
import { createFireflies } from './fireflies.js';

// Landing page: the night forest with live fireflies that gather around the
// pointer. The canvas ignores clicks, so the button underneath stays usable.
export function WelcomePage() {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const fireflies = createFireflies(canvasRef.current);
    return () => fireflies.destroy();
  }, []);

  return (
    <ForestPage
      className="grid place-items-center"
      backdrop={
        <canvas
          ref={canvasRef}
          className="pointer-events-none absolute inset-0 size-full"
          aria-hidden="true"
        />
      }
    >
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
    </ForestPage>
  );
}
