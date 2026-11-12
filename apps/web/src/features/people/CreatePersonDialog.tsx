import { zodResolver } from '@hookform/resolvers/zod';
import { createUserSchema, type CreateUserInput } from '@yasdestek/shared';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { errorMessage } from '@/lib/errors';
import { OneTimePassword } from './OneTimePassword';
import { usePeopleActions, type Person } from './usePeople';

type Props = {
  role: 'PSYCHOLOGIST' | 'USER';
  // Admins creating a participant must say whose participant it is.
  counselors?: Person[];
};

// Opens from the "new" button, asks for a username (and a counselor when the
// admin creates a participant), then shows the one-time password in place.
export function CreatePersonDialog({ role, counselors }: Props) {
  const { t } = useTranslation();
  const { create } = usePeopleActions();
  const [open, setOpen] = useState(false);
  const [created, setCreated] = useState<{
    username: string;
    password: string;
  } | null>(null);

  // The shared schema leaves the counselor optional (the api fills it in for
  // psychologists creating their own). Here it is required when shown.
  const schema = counselors
    ? createUserSchema.extend({ psychologistId: z.uuid() })
    : createUserSchema;
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateUserInput>({
    resolver: zodResolver(schema),
    defaultValues: { role, username: '' },
  });

  const onOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      reset();
      setCreated(null);
      create.reset();
    }
  };

  const onSubmit = handleSubmit((values) =>
    create.mutate(values, {
      onSuccess: ({ user, password }) =>
        setCreated({ username: user.username, password }),
    }),
  );

  const title = t(
    role === 'PSYCHOLOGIST'
      ? 'people.create.counselor'
      : 'people.create.participant',
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button className="h-10 rounded-full px-4">
          <Plus className="size-4" aria-hidden="true" />
          {title}
        </Button>
      </DialogTrigger>
      <DialogContent className="rounded-2xl sm:max-w-md">
        {created ? (
          <>
            <DialogHeader>
              <DialogTitle>{t('people.create.created')}</DialogTitle>
              <DialogDescription className="sr-only">
                {t('people.password.note')}
              </DialogDescription>
            </DialogHeader>
            <OneTimePassword
              username={created.username}
              password={created.password}
            />
            <DialogFooter>
              <Button
                className="h-10 rounded-full px-4"
                onClick={() => onOpenChange(false)}
              >
                {t('people.password.done')}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <form
            className="flex flex-col gap-5"
            noValidate
            onSubmit={onSubmit}
            onChange={() => create.isError && create.reset()}
          >
            <DialogHeader>
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription>{t('people.create.intro')}</DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-2">
              <Label htmlFor="new-username">
                {t('people.columns.username')}
              </Label>
              <Input
                id="new-username"
                className="h-11 rounded-xl text-base"
                autoComplete="off"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                aria-invalid={!!errors.username}
                aria-describedby="new-username-message"
                {...register('username')}
              />
              <p
                id="new-username-message"
                role="alert"
                className={
                  errors.username
                    ? 'min-h-6 text-base leading-6 text-destructive'
                    : 'min-h-6 text-sm leading-6 text-text-secondary'
                }
              >
                {errors.username?.message ?? t('people.create.usernameHint')}
              </p>
            </div>

            {counselors && (
              <div className="flex flex-col gap-2">
                <Label htmlFor="new-counselor">
                  {t('people.create.counselorField')}
                </Label>
                <Controller
                  control={control}
                  name="psychologistId"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger
                        id="new-counselor"
                        className="h-11 w-full rounded-xl text-base"
                        aria-invalid={!!errors.psychologistId}
                      >
                        <SelectValue
                          placeholder={t('people.create.counselorPlaceholder')}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {counselors.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.username}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <p
                  role="alert"
                  className="min-h-6 text-base leading-6 text-destructive"
                >
                  {errors.psychologistId?.message}
                </p>
              </div>
            )}

            {create.isError && (
              <p role="alert" className="text-base leading-6 text-destructive">
                {errorMessage(create.error)}
              </p>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                className="h-10 rounded-full px-4"
                onClick={() => onOpenChange(false)}
              >
                {t('common.cancel')}
              </Button>
              <Button
                type="submit"
                className="h-10 rounded-full px-4"
                disabled={create.isPending}
                aria-busy={create.isPending}
              >
                {t(
                  create.isPending
                    ? 'people.create.submitting'
                    : 'people.create.submit',
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
