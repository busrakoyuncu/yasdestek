import { zodResolver } from '@hookform/resolvers/zod';
import {
  changePasswordSchema,
  type ChangePasswordInput,
} from '@yasdestek/shared';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Navigate } from 'react-router';
import { ForestPage } from '@/components/ForestPage';
import { Button } from '@/components/ui/button';
import { errorMessage } from '@/lib/errors';
import { PasswordField } from './PasswordField';
import { homeFor, useSession } from './useSession';

// The forced stop after a first sign-in or a reset: the api refuses everything
// else until the handed-out password is replaced.
export function ChangePasswordPage() {
  const { t } = useTranslation();
  const { user, isLoading, changePassword } = useSession();
  const {
    register,
    handleSubmit,
    setFocus,
    formState: { errors },
  } = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '' },
  });

  if (isLoading) return null;
  if (!user) return <Navigate to="/login" replace />;
  // Nothing to change, or just changed: the session flag flips on success and
  // this line carries the person home.
  if (!user.mustChangePassword) {
    return <Navigate to={homeFor[user.role]} replace />;
  }

  const onSubmit = handleSubmit((values) =>
    changePassword.mutate(values, {
      onError: () => setFocus('currentPassword'),
    }),
  );

  return (
    <ForestPage>
      <div className="relative mx-auto grid min-h-svh max-w-6xl content-center gap-10 px-6 py-20 md:grid-cols-2 md:items-center md:gap-16">
        <div className="relative isolate text-center md:text-left">
          <div
            className="absolute -inset-x-24 -inset-y-16 -z-10 bg-radial from-background/50 via-background/15 via-45% to-transparent to-70%"
            aria-hidden="true"
          />
          <p className="mx-auto max-w-md text-xl leading-relaxed text-pretty md:mx-0 md:text-2xl">
            {t('auth.changePassword.intro')}
          </p>
        </div>

        <form
          className="flex w-full max-w-sm flex-col gap-5 rounded-2xl border border-primary/30 bg-surface-raised/90 p-6 backdrop-blur-sm md:justify-self-end"
          noValidate
          onSubmit={onSubmit}
          onChange={() => changePassword.isError && changePassword.reset()}
        >
          <h1 className="text-2xl font-medium">
            {t('auth.changePassword.title')}
          </h1>

          <PasswordField
            id="current-password"
            label={t('auth.changePassword.currentPassword')}
            autoComplete="current-password"
            hint={t('auth.changePassword.currentPasswordHint')}
            error={
              errors.currentPassword?.message ??
              (changePassword.isError
                ? errorMessage(changePassword.error)
                : null)
            }
            {...register('currentPassword')}
          />

          <PasswordField
            id="new-password"
            label={t('auth.changePassword.newPassword')}
            autoComplete="new-password"
            hint={t('auth.changePassword.newPasswordHint')}
            error={errors.newPassword?.message}
            {...register('newPassword')}
          />

          <Button
            type="submit"
            size="lg"
            className="h-11 rounded-full bg-glow text-base font-medium text-background hover:bg-glow/90 disabled:opacity-60"
            disabled={changePassword.isPending}
            aria-busy={changePassword.isPending}
          >
            {t(
              changePassword.isPending
                ? 'auth.changePassword.submitting'
                : 'auth.changePassword.submit',
            )}
          </Button>
        </form>
      </div>
    </ForestPage>
  );
}
