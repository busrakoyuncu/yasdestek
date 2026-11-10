import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginInput } from '@yasdestek/shared';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Navigate, useNavigate, useSearchParams } from 'react-router';
import { LanguageSwitch } from '@/components/LanguageSwitch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { errorMessage } from '@/lib/errors';
import { homeFor, useSession } from './useSession';

export function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { user, login } = useSession();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: '', password: '' },
  });

  // Already signed in: straight to the user's own area.
  if (user) return <Navigate to={homeFor[user.role]} replace />;

  const onSubmit = handleSubmit(async (values) => {
    const signedIn = await login.mutateAsync(values).catch(() => null);
    if (!signedIn) return;
    const redirect = params.get('redirect');
    await navigate(
      signedIn.mustChangePassword
        ? '/change-password'
        : (redirect ?? homeFor[signedIn.role]),
      { replace: true },
    );
  });

  return (
    // Same forest as the landing page, still, always in the dark theme.
    <main className="dark relative min-h-svh overflow-hidden bg-background text-foreground">
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
      <header className="absolute top-4 right-4 z-10">
        <LanguageSwitch
          className="rounded-full border-secondary-accent/70 bg-background/40 text-glow backdrop-blur-sm hover:border-secondary-accent hover:bg-secondary-accent/10 hover:text-glow aria-expanded:border-secondary-accent aria-expanded:bg-secondary-accent/10 aria-expanded:text-glow dark:hover:bg-secondary-accent/10"
          menuClassName="dark min-w-40 border border-secondary-accent/70 bg-popover text-glow ring-0 [&_[role=menuitemradio]]:focus:text-glow"
        />
      </header>
      {/* Desktop: welcome on the left, form on the right. Phone: stacked. */}
      <div className="relative mx-auto grid min-h-svh max-w-6xl content-center gap-10 px-6 py-20 md:grid-cols-2 md:items-center md:gap-16">
        <h1 className="text-center text-4xl font-medium text-balance drop-shadow-[0_2px_24px_var(--background)] md:text-left md:text-5xl lg:text-6xl">
          {t('auth.login.welcome')}
        </h1>

        <form
          className="flex w-full max-w-sm flex-col gap-5 rounded-2xl border bg-surface-raised/80 p-6 backdrop-blur-sm md:justify-self-end"
          noValidate
          onSubmit={onSubmit}
        >
          <h2 className="text-2xl font-medium">{t('auth.login.title')}</h2>

          <div className="flex flex-col gap-2">
            <Label htmlFor="username">{t('auth.login.username')}</Label>
            <Input
              id="username"
              autoComplete="username"
              autoCapitalize="none"
              aria-invalid={!!errors.username}
              {...register('username')}
            />
            {errors.username && (
              <p className="text-sm text-destructive">
                {errors.username.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="password">{t('auth.login.password')}</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              aria-invalid={!!errors.password}
              {...register('password')}
            />
            {errors.password && (
              <p className="text-sm text-destructive">
                {errors.password.message}
              </p>
            )}
          </div>

          {login.isError && (
            <p role="alert" className="text-sm text-destructive">
              {errorMessage(login.error)}
            </p>
          )}

          <Button type="submit" size="lg" disabled={login.isPending}>
            {t('auth.login.submit')}
          </Button>
        </form>
      </div>
    </main>
  );
}
