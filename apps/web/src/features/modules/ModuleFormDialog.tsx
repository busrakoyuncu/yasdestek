import { zodResolver } from '@hookform/resolvers/zod';
import { moduleSchema } from '@yasdestek/shared';
import { Plus, X } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
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
import { Textarea } from '@/components/ui/textarea';
import { errorMessage } from '@/lib/errors';
import { toastSuccess } from '@/lib/toast';
import { useModuleActions, type Module } from './useModules';

// react-hook-form's field arrays want objects, so each question is wrapped
// on the way in and unwrapped on the way out. The rules are the shared ones.
const formSchema = moduleSchema.omit({ questions: true, order: true }).extend({
  questions: z.array(z.object({ text: z.string().trim().min(1) })).max(20),
});
type FormValues = z.infer<typeof formSchema>;

const toForm = (module?: Module): FormValues => ({
  title: module?.title ?? '',
  description: module?.description ?? '',
  rules: module?.rules ?? '',
  questions: (module?.questions ?? ['']).map((text) => ({ text })),
});

type Props = {
  // present: edit this module; absent: create a new one
  module?: Module;
  trigger: ReactNode;
};

export function ModuleFormDialog({ module, trigger }: Props) {
  const { t } = useTranslation();
  const { create, update } = useModuleActions();
  const [open, setOpen] = useState(false);
  const mutation = module ? update : create;
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: toForm(module),
  });
  const questions = useFieldArray({ control, name: 'questions' });

  const onOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) reset(toForm(module));
    else mutation.reset();
  };

  const onSubmit = handleSubmit((values) => {
    const input = { ...values, questions: values.questions.map((q) => q.text) };
    const done = () => {
      toastSuccess(t(module ? 'modules.form.saved' : 'modules.form.created'));
      onOpenChange(false);
    };
    if (module) update.mutate({ id: module.id, ...input }, { onSuccess: done });
    else create.mutate(input, { onSuccess: done });
  });

  const field = 'rounded-xl text-base';
  const message = (text?: string) =>
    text ? (
      <p role="alert" className="text-base leading-6 text-destructive">
        {text}
      </p>
    ) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90svh] overflow-y-auto rounded-2xl sm:max-w-2xl">
        <form
          className="flex flex-col gap-5"
          noValidate
          onSubmit={onSubmit}
          onChange={() => mutation.isError && mutation.reset()}
        >
          <DialogHeader>
            <DialogTitle>
              {t(
                module ? 'modules.form.editTitle' : 'modules.form.createTitle',
              )}
            </DialogTitle>
            <DialogDescription>{t('modules.form.intro')}</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-2">
            <Label htmlFor="module-title">{t('modules.form.title')}</Label>
            <Input
              id="module-title"
              className={`h-11 ${field}`}
              aria-invalid={!!errors.title}
              {...register('title')}
            />
            {message(errors.title?.message)}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="module-description">
              {t('modules.form.description')}
              <span className="font-normal text-text-secondary">
                {' '}
                ({t('modules.form.descriptionHint')})
              </span>
            </Label>
            <Textarea
              id="module-description"
              className={`min-h-28 ${field}`}
              aria-invalid={!!errors.description}
              {...register('description')}
            />
            {message(errors.description?.message)}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="module-rules">
              {t('modules.form.rules')}
              <span className="font-normal text-text-secondary">
                {' '}
                ({t('modules.form.rulesHint')})
              </span>
            </Label>
            <Textarea
              id="module-rules"
              className={`min-h-28 ${field}`}
              aria-invalid={!!errors.rules}
              {...register('rules')}
            />
            {message(errors.rules?.message)}
          </div>

          <fieldset className="flex flex-col gap-3">
            <legend className="mb-2 text-sm font-medium">
              {t('modules.form.questionsLabel')}
            </legend>
            {questions.fields.map((item, index) => (
              <div key={item.id} className="flex flex-col gap-1">
                <div className="flex items-start gap-2">
                  <Input
                    className={`h-11 ${field}`}
                    aria-label={t('modules.form.question', { n: index + 1 })}
                    aria-invalid={!!errors.questions?.[index]?.text}
                    {...register(`questions.${index}.text`)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-11 shrink-0 rounded-full"
                    aria-label={t('modules.form.removeQuestion', {
                      n: index + 1,
                    })}
                    disabled={questions.fields.length === 1}
                    onClick={() => questions.remove(index)}
                  >
                    <X className="size-4" />
                  </Button>
                </div>
                {message(errors.questions?.[index]?.text?.message)}
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              className="h-10 self-start rounded-full px-4"
              disabled={questions.fields.length >= 20}
              onClick={() => questions.append({ text: '' })}
            >
              <Plus className="size-4" aria-hidden="true" />
              {t('modules.form.addQuestion')}
            </Button>
          </fieldset>

          {mutation.isError && message(errorMessage(mutation.error))}

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
              disabled={mutation.isPending}
              aria-busy={mutation.isPending}
            >
              {t(
                mutation.isPending
                  ? 'modules.form.submitting'
                  : module
                    ? 'modules.form.submitEdit'
                    : 'modules.form.submitCreate',
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
