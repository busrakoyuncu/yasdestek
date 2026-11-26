import { zodResolver } from '@hookform/resolvers/zod';
import { moduleSchema } from '@yasdestek/shared';
import { Plus } from 'lucide-react';
import { useId } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
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
  allowImages: module?.allowImages ?? false,
  allowAudio: module?.allowAudio ?? false,
});

type Props = {
  // present: edit this module; absent: create a new one
  module?: Module;
  // a counselor editing a module that belongs to everyone: saving makes a copy
  shared?: boolean;
  // the saved module, which is a new copy when a shared one was edited
  onSaved: (saved: Module) => void;
  onCancel: () => void;
};

// A module's texts, questions and attachments, on the page beside the list
// so long texts have room.
export function ModuleForm({ module, shared, onSaved, onCancel }: Props) {
  const { t } = useTranslation();
  const headingId = useId();
  const { create, update } = useModuleActions();
  const mutation = module ? update : create;
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: toForm(module),
  });
  const questions = useFieldArray({ control, name: 'questions' });

  const onSubmit = handleSubmit((values) => {
    const input = { ...values, questions: values.questions.map((q) => q.text) };
    const done = (saved: Module) => {
      toastSuccess(t(module ? 'modules.form.saved' : 'modules.form.created'));
      onSaved(saved);
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
    <form
      aria-labelledby={headingId}
      className="flex max-w-2xl flex-col gap-6"
      noValidate
      onSubmit={onSubmit}
      onChange={() => mutation.isError && mutation.reset()}
    >
      <div className="flex flex-col gap-2">
        <h2 id={headingId} className="text-2xl font-medium tracking-[-0.015em]">
          {t(module ? 'modules.form.editTitle' : 'modules.form.createTitle')}
        </h2>
        <p className="text-pretty text-text-secondary">
          {t('modules.form.intro')}
        </p>
      </div>
      {shared && (
        <p className="border-y border-border py-3 text-pretty">
          {t('modules.form.copyNote')}
        </p>
      )}

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
          className={`min-h-32 ${field}`}
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
        <ol className="flex flex-col gap-3">
          {questions.fields.map((item, index) => (
            <li key={item.id} className="flex flex-col gap-1">
              <div className="flex items-start gap-3">
                <span className="w-5 shrink-0 pt-2.5 text-right text-muted-foreground tabular-nums">
                  {index + 1}
                </span>
                {/* one line that grows, so a long question is read whole */}
                <Textarea
                  rows={1}
                  className={`min-h-11 resize-none py-2.5 ${field}`}
                  aria-label={t('modules.form.question', { n: index + 1 })}
                  aria-invalid={!!errors.questions?.[index]?.text}
                  {...register(`questions.${index}.text`)}
                />
                {/* one question always stays */}
                {questions.fields.length > 1 && (
                  <button
                    type="button"
                    aria-label={t('modules.form.removeQuestion', {
                      n: index + 1,
                    })}
                    onClick={() => questions.remove(index)}
                    className="mt-2 shrink-0 rounded-md px-1.5 py-1 text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    {t('modules.form.removeQuestionShort')}
                  </button>
                )}
              </div>
              <div className="pl-8">
                {message(errors.questions?.[index]?.text?.message)}
              </div>
            </li>
          ))}
        </ol>
        {questions.fields.length < 20 && (
          <Button
            type="button"
            variant="ghost"
            className="-ml-2.5 h-9 self-start rounded-lg px-2.5 text-text-secondary"
            onClick={() => questions.append({ text: '' })}
          >
            <Plus className="size-4" aria-hidden="true" />
            {t('modules.form.addQuestion')}
          </Button>
        )}
      </fieldset>

      <fieldset className="flex flex-col gap-1">
        <legend className="mb-1 text-sm font-medium">
          {t('modules.form.attachmentsLabel')}
        </legend>
        {(['allowImages', 'allowAudio'] as const).map((name) => (
          <label
            key={name}
            className="flex min-h-11 items-center gap-3 text-base"
          >
            <input
              type="checkbox"
              className="size-5 shrink-0 accent-primary"
              {...register(name)}
            />
            {t(`modules.form.${name}`)}
          </label>
        ))}
        <p className="text-sm text-pretty text-text-secondary">
          {t('modules.form.attachmentsHint')}
        </p>
      </fieldset>

      {mutation.isError && message(errorMessage(mutation.error))}

      <div className="flex justify-end gap-2 border-t border-border pt-5">
        <Button
          type="button"
          variant="ghost"
          className="h-10 rounded-full px-4"
          onClick={onCancel}
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
      </div>
    </form>
  );
}
