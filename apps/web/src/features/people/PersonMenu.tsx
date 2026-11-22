import {
  KeyRound,
  MoreHorizontal,
  Trash2,
  UserCheck,
  UserX,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Person } from './usePeople';
import type { PersonActions } from './usePersonActions';

// The "..." menu on a person's row.
export function PersonMenu({
  person,
  actions,
  canDelete,
}: {
  person: Person;
  actions: PersonActions;
  // Hard delete exists for privacy requests and only admins may do it.
  canDelete?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-9 rounded-lg"
          aria-label={`${t('common.actions')}: ${person.username}`}
        >
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {person.active ? (
          <DropdownMenuItem onSelect={() => actions.ask('deactivate', person)}>
            <UserX className="size-4" aria-hidden="true" />
            {t('people.actions.deactivate')}
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onSelect={() => actions.activate(person)}>
            <UserCheck className="size-4" aria-hidden="true" />
            {t('people.actions.activate')}
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onSelect={() => actions.ask('reset', person)}>
          <KeyRound className="size-4" aria-hidden="true" />
          {t('people.actions.resetPassword')}
        </DropdownMenuItem>
        {canDelete && (
          <DropdownMenuItem
            variant="destructive"
            onSelect={() => actions.ask('delete', person)}
          >
            <Trash2 className="size-4" aria-hidden="true" />
            {t('people.actions.delete')}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
