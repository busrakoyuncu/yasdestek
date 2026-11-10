import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
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
    <main className="dark relative grid min-h-svh place-items-center overflow-hidden bg-background text-foreground">
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

      <div className="relative -mt-[12vh] flex flex-col items-center gap-8 px-4 text-center">
        <h1 className="text-5xl font-medium text-balance drop-shadow-[0_2px_24px_var(--background)] md:text-7xl">
          {t('welcome.title')}
        </h1>
        <Button
          asChild
          size="lg"
          variant="outline"
          className="rounded-full border-foreground/60 bg-background/40 px-6 text-foreground backdrop-blur-sm hover:bg-foreground/10 hover:text-foreground"
        >
          <Link to="/login">{t('welcome.continue')}</Link>
        </Button>
      </div>
    </main>
  );
}
