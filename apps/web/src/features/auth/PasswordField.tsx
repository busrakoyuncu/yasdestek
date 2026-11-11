import { Eye, EyeOff } from 'lucide-react';
import { useState, type ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from 'cn';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// Inputs on the forest: fog-blue hairline, night glass, firelight text.
export const forestField =
  'h-11 rounded-xl border-primary/40 bg-background/40 text-base text-glow placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-primary/60 dark:bg-background/40 dark:aria-invalid:border-destructive';

type Props = Omit<ComponentProps<'input'>, 'type' | 'className'> & {
  id: string;
  label: string;
  // whatever went wrong with this field: a validation message or the server's answer
  error?: string | null;
  // shown in the same line while nothing is wrong, so the form never jumps
  hint?: string;
};

// A password input with a show/hide toggle and one reserved line below it
// for its message. The form passes register() props through.
export function PasswordField({ id, label, error, hint, ...input }: Props) {
  const { t } = useTranslation();
  const [show, setShow] = useState(false);
  const messageId = `${id}-message`;

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type={show ? 'text' : 'password'}
          aria-invalid={!!error}
          aria-describedby={messageId}
          className={cn(forestField, 'pr-12')}
          {...input}
        />
        <button
          type="button"
          onClick={() => setShow((on) => !on)}
          aria-label={t(show ? 'common.hidePassword' : 'common.showPassword')}
          className="absolute inset-y-0 right-0 grid size-11 place-items-center rounded-full text-glow/70 outline-none hover:text-glow focus-visible:ring-3 focus-visible:ring-primary/60"
        >
          {show ? (
            <EyeOff className="size-5" aria-hidden="true" />
          ) : (
            <Eye className="size-5" aria-hidden="true" />
          )}
        </button>
      </div>
      <p
        id={messageId}
        role="alert"
        className={cn(
          'min-h-6 text-base leading-6',
          error ? 'text-destructive' : 'text-text-secondary',
        )}
      >
        {error ?? hint}
      </p>
    </div>
  );
}
