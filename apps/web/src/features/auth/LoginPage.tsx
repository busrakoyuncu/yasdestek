import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginInput } from '@yasdestek/shared';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Navigate, useNavigate, useSearchParams } from 'react-router';
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
    <>
      {/* Placeholder backdrop until the real artwork lands. */}
      <div className="fixed inset-0 -z-10" aria-hidden="true">
        <img src="/login-bg.jpg" alt="" className="size-full object-cover" />
      </div>
      {/* Desktop: welcome on the left, form on the right. Phone: stacked. */}
      <main className="mx-auto grid min-h-svh max-w-6xl content-center gap-10 px-6 py-20 md:grid-cols-2 md:items-center md:gap-16">
        <h1 className="text-center text-4xl font-medium text-balance text-primary md:text-left md:text-5xl md:text-background lg:text-6xl">
          {t('auth.login.welcome')}
        </h1>

        <form
          className="flex w-full max-w-sm flex-col gap-5 rounded-2xl border bg-surface-raised/70 p-6 backdrop-blur-sm md:justify-self-end"
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
      </main>
    </>
  );
}
