import { Share } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// iPhone and iPad cannot be asked to install from a page, so the account
// menu shows the three Safari steps instead.
export function InstallSteps({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('install.steps.title')}</DialogTitle>
          <DialogDescription>{t('install.steps.intro')}</DialogDescription>
        </DialogHeader>
        <ol className="flex list-decimal flex-col gap-3 pl-5 text-base leading-relaxed marker:text-text-secondary">
          <li>
            {t('install.steps.share')}{' '}
            <Share
              className="inline size-4 align-[-2px] text-primary"
              aria-hidden="true"
            />
            <span className="block text-sm text-text-secondary">
              {t('install.steps.shareHint')}
            </span>
          </li>
          <li>{t('install.steps.add')}</li>
          <li>{t('install.steps.confirm')}</li>
        </ol>
        <DialogFooter>
          <Button
            className="h-10 rounded-full px-4"
            onClick={() => onOpenChange(false)}
          >
            {t('install.steps.done')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
