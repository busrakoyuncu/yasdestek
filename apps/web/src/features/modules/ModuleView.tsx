import { MoreHorizontal, Trash2 } from 'lucide-react';
import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { moduleSource, permissionsOf, type Module } from './useModules';

// One module as its participants meet it: the title, the description, the
// rules and the questions, in the order of their own module page. Above it,
// where it comes from and what may be attached; beside the title, the
// controls the caller may use.
export function ModuleView({
  module,
  admin,
  editPath,
  onDelete,
}: {
  module: Module;
  admin: boolean;
  // where "Düzenle" goes: this module's form
  editPath: string;
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  const headingId = useId();
  const { mayEdit, mayDelete, shared } = permissionsOf(module, admin);
  const attach =
    module.allowImages && module.allowAudio
      ? 'both'
      : module.allowImages
        ? 'images'
        : module.allowAudio
          ? 'audio'
          : 'none';

  return (
    <article aria-labelledby={headingId} className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <div className="flex items-start gap-3">
          <h2
            id={headingId}
            className="min-w-0 flex-1 text-2xl font-medium tracking-[-0.015em] text-balance"
          >
            {module.title}
          </h2>
          {mayEdit && (
            <Button asChild variant="outline" className="h-9 rounded-full px-4">
              <Link
                to={editPath}
                aria-label={`${t('modules.edit')}: ${module.title}`}
              >
                {t('modules.edit')}
              </Link>
            </Button>
          )}
          {mayDelete && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-9 shrink-0 rounded-lg"
                  aria-label={`${t('common.actions')}: ${module.title}`}
                >
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem variant="destructive" onSelect={onDelete}>
                  <Trash2 className="size-4" aria-hidden="true" />
                  {t(shared ? 'modules.hide.action' : 'modules.delete')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          {[
            moduleSource(t, module, admin),
            t('modules.questions', { count: module.questions.length }),
            t(`modules.attach.${attach}`),
          ].join(' · ')}
        </p>
        <p className="max-w-[65ch] text-lg leading-relaxed text-pretty whitespace-pre-line text-text-secondary">
          {module.description}
        </p>
      </header>

      <section className="flex max-w-[65ch] flex-col gap-2 border-t border-border pt-5">
        <h3 className="font-medium">{t('writing.rules')}</h3>
        <p className="leading-relaxed text-pretty whitespace-pre-line text-text-secondary">
          {module.rules}
        </p>
      </section>

      <section className="flex max-w-[65ch] flex-col gap-3 border-t border-border pt-5">
        <h3 className="font-medium">{t('writing.questions')}</h3>
        <ol className="border-t border-border">
          {module.questions.map((question, index) => (
            <li
              key={index}
              className="flex gap-3 border-b border-border py-2.5 leading-relaxed"
            >
              <span className="w-5 shrink-0 text-right text-muted-foreground tabular-nums">
                {index + 1}
              </span>
              <span className="min-w-0 text-pretty">{question}</span>
            </li>
          ))}
        </ol>
      </section>
    </article>
  );
}
