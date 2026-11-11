import { useTranslation } from 'react-i18next';

// Stand-in for a screen that has a place in the navigation but no content yet.
export function ComingSoon({ title }: { title: string }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="text-text-secondary">{t('area.comingSoon')}</p>
    </div>
  );
}
