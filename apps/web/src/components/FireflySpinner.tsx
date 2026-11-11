import { useTranslation } from 'react-i18next';
import './firefly-spinner.css';

// Vendored firefly spinner (components/firefly-spinner.css): fireflies orbit
// and glow in turn. Pure CSS, sized by --ffs-size, made for the night theme.
export function FireflySpinner({ className }: { className?: string }) {
  const { t } = useTranslation();
  return (
    <div className={['firefly-spinner', className].join(' ')} role="status">
      <span className="ffs-orbit" aria-hidden="true">
        <span className="ffs-arm">
          <i className="ffs-fly" />
        </span>
        <span className="ffs-arm">
          <i className="ffs-fly" />
        </span>
        <span className="ffs-arm">
          <i className="ffs-fly" />
        </span>
      </span>
      <span className="ffs-label">{t('common.loading')}</span>
    </div>
  );
}
