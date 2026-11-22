import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { type Person } from './usePeople';
import { PersonMenu } from './PersonMenu';
import { usePersonActions } from './usePersonActions';

type Props = {
  people: Person[];
  // Admins see whose participant each one is; the list to look names up in.
  counselors?: Person[];
  // Hard delete exists for privacy requests and only admins may do it.
  canDelete?: boolean;
  emptyMessage: string;
};

// Reads as "where is this account in its life": inactive until activated,
// then waiting for its first sign-in, then active.
function status(person: Person): 'inactive' | 'pending' | 'active' {
  if (!person.active) return 'inactive';
  return person.mustChangePassword ? 'pending' : 'active';
}

const statusStyle = {
  active: 'border-primary/40 text-primary',
  pending: 'border-secondary-accent/60 text-secondary-accent',
  inactive: 'border-border text-muted-foreground',
};

export function PeopleTable({
  people,
  counselors,
  canDelete,
  emptyMessage,
}: Props) {
  const { t, i18n } = useTranslation();
  const actions = usePersonActions();

  const counselorName = (id: string | null) =>
    counselors?.find((c) => c.id === id)?.username ?? '';
  const date = new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium' });

  if (people.length === 0) {
    return <p className="text-text-secondary">{emptyMessage}</p>;
  }

  return (
    <>
      <div className="overflow-x-auto rounded-2xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('people.columns.username')}</TableHead>
              <TableHead>{t('people.columns.status')}</TableHead>
              {counselors && (
                <TableHead>{t('people.columns.counselor')}</TableHead>
              )}
              <TableHead>{t('people.columns.created')}</TableHead>
              <TableHead className="w-12">
                <span className="sr-only">{t('common.actions')}</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {people.map((person) => {
              const state = status(person);
              return (
                <TableRow key={person.id}>
                  <TableCell className="font-medium">
                    {person.username}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={statusStyle[state]}>
                      {t(`people.status.${state}`)}
                    </Badge>
                  </TableCell>
                  {counselors && (
                    <TableCell>
                      {counselorName(person.psychologistId)}
                    </TableCell>
                  )}
                  <TableCell className="text-text-secondary">
                    {date.format(new Date(person.createdAt))}
                  </TableCell>
                  <TableCell>
                    <PersonMenu
                      person={person}
                      actions={actions}
                      canDelete={canDelete}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {actions.dialogs}
    </>
  );
}
