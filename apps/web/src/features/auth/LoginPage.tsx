import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginInput } from '@yasdestek/shared';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Navigate, useNavigate, useSearchParams } from 'react-router';
import { ForestPage } from '@/components/ForestPage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { errorMessage } from '@/lib/errors';
import { forestField, PasswordField } from './PasswordField';
import { homeFor, useSession } from './useSession';

export function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { user, login } = useSession();
  const {
    register,
    handleSubmit,
    setFocus,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: '', password: '' },
  });

  // Already signed in: straight to the user's own area.
  if (user) return <Navigate to={homeFor[user.role]} replace />;

  const onSubmit = handleSubmit(async (values) => {
    const signedIn = await login.mutateAsync(values).catch(() => null);
    if (!signedIn) {
      // the answer was no: put the person back where they can fix it
      setFocus('password');
      return;
    }
    const redirect = params.get('redirect');
    await navigate(
      signedIn.mustChangePassword
        ? '/change-password'
        : (redirect ?? homeFor[signedIn.role]),
      { replace: true },
    );
  });

  return (
    <ForestPage>
      {/* Desktop: welcome on the left, form on the right. Phone: stacked. */}
      <div className="relative mx-auto grid min-h-svh max-w-6xl content-center gap-10 px-6 py-20 md:grid-cols-2 md:items-center md:gap-16">
        <div className="relative isolate text-center md:text-left">
          {/* a little dusk behind the words, so they read over the fog */}
          <div
            className="absolute -inset-x-24 -inset-y-16 -z-10 bg-radial from-background/50 via-background/15 via-45% to-transparent to-70%"
            aria-hidden="true"
          />
          <p className="mx-auto max-w-md text-xl leading-relaxed text-pretty md:mx-0 md:text-2xl">
            {t('auth.login.intro')}
          </p>
        </div>

        {/* fog-blue hairlines for the card and fields; gold stays for buttons */}
        <form
          className="flex w-full max-w-sm flex-col gap-5 rounded-2xl border border-primary/30 bg-surface-raised/90 p-6 backdrop-blur-sm md:justify-self-end"
          noValidate
          onSubmit={onSubmit}
          onChange={() => login.isError && login.reset()}
        >
          <h1 className="text-2xl font-medium">{t('auth.login.title')}</h1>

          <div className="flex flex-col gap-2">
            <Label htmlFor="username">{t('auth.login.username')}</Label>
            <Input
              id="username"
              autoComplete="username"
              autoCapitalize="none"
              aria-invalid={!!errors.username}
              aria-describedby={
                errors.username ? 'username-message' : undefined
              }
              autoCorrect="off"
              spellCheck={false}
              className={forestField}
              {...register('username')}
            />
            {errors.username && (
              <p
                id="username-message"
                className="text-base leading-6 text-destructive"
              >
                {errors.username.message}
              </p>
            )}
          </div>

          {/* one reserved line for whatever went wrong with signing in: the
              password check, or the server's answer. Nothing else moves. */}
          <PasswordField
            id="password"
            label={t('auth.login.password')}
            autoComplete="current-password"
            error={
              errors.password?.message ??
              (login.isError ? errorMessage(login.error) : null)
            }
            {...register('password')}
          />

          {/* the one filled button on the forest: firelight cream, night text */}
          <Button
            type="submit"
            size="lg"
            className="h-11 rounded-full bg-glow text-base font-medium text-background hover:bg-glow/90 disabled:opacity-60"
            disabled={login.isPending}
            aria-busy={login.isPending}
          >
            {t(login.isPending ? 'auth.login.submitting' : 'auth.login.submit')}
          </Button>

          {/* who to turn to: these accounts are handed out by the counselor */}
          <p className="text-sm leading-5 text-pretty text-text-secondary">
            {t('auth.login.help')}
          </p>
        </form>
      </div>
    </ForestPage>
  );
}
