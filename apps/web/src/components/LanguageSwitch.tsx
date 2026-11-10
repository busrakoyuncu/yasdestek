import { Languages } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LOCALES, setLocale, type Locale } from '@/lib/i18n';

// Each language names itself, so the list reads the same in every locale.
const names: Record<Locale, string> = {
  tr: 'Türkçe',
  en: 'English',
  de: 'Deutsch',
};

// `className` styles the trigger. The menu renders in a portal at the end of
// <body>, outside any themed wrapper, so a page that is themed locally passes
// its theme class (and any look) through `menuClassName`.
export function LanguageSwitch({
  className,
  menuClassName,
}: {
  className?: string;
  menuClassName?: string;
}) {
  const { t, i18n } = useTranslation();
  const current = i18n.language as Locale;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={className}
          aria-label={t('common.language')}
        >
          <Languages aria-hidden="true" />
          {names[current]}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className={menuClassName}>
        <DropdownMenuRadioGroup
          value={current}
          onValueChange={(value) => void setLocale(value as Locale)}
        >
          {LOCALES.map((locale) => (
            <DropdownMenuRadioItem key={locale} value={locale}>
              {names[locale]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
