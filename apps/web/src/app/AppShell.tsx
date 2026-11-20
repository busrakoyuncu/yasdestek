import { useQuery } from '@tanstack/react-query';
import {
  ChevronDown,
  CircleUserRound,
  LogOut,
  Menu,
  Monitor,
  Moon,
  Sun,
} from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import { cn } from 'cn';
import { LanguageSwitch } from '@/components/LanguageSwitch';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Toaster } from '@/components/ui/sonner';
import { THEMES, useTheme, type Theme } from '@/lib/theme';
import { toastError } from '@/lib/toast';
import { homeFor, useSession } from '@/features/auth/useSession';
import { groupsQuery } from '@/features/groups/useGroups';
import { modulesQuery } from '@/features/modules/useModules';
import type { CurrentUser, Role } from '@/types/user';
import { navigation, type NavItem } from './navigation';

// Header controls mirror the forest pages: gold hairline and firelight text at
// night, the reverse by day (dark navy hairline and text). shadcn's ghost
// variant sets hover and expanded colours per modifier, so each is restated.
const control =
  'h-10 rounded-full border border-foreground/60 bg-transparent px-3 text-sm text-foreground hover:border-foreground hover:bg-foreground/5 hover:text-foreground aria-expanded:border-foreground aria-expanded:bg-foreground/5 aria-expanded:text-foreground dark:border-secondary-accent/70 dark:text-glow dark:hover:border-secondary-accent dark:hover:bg-secondary-accent/10 dark:hover:text-glow dark:aria-expanded:border-secondary-accent dark:aria-expanded:bg-secondary-accent/10 dark:aria-expanded:text-glow';

// Navigation items use the same two voices: the active one wears the hairline.
const navIdle =
  'text-foreground/75 hover:bg-foreground/5 hover:text-foreground dark:text-glow/75 dark:hover:bg-secondary-accent/10 dark:hover:text-glow';
const navActive =
  'border-foreground/60 font-medium text-foreground dark:border-secondary-accent/70 dark:text-glow';

const themeIcons: Record<Theme, typeof Sun> = {
  system: Monitor,
  light: Sun,
  dark: Moon,
};

// The frame around every signed-in screen. Desktop: sidebar plus top bar.
// Phone: participants get a tab bar (their area is phone-first); the other
// roles get the sidebar behind a menu button. Rendered under RequireAuth, so
// the user is known.
export function AppShell({ role }: { role: Role }) {
  const { user } = useSession();
  const { theme, resolved, setTheme } = useTheme(user!.id);
  const items = navigation[role];
  const participant = role === 'USER';
  const counselor = role === 'PSYCHOLOGIST';
  // A participant's sidebar lists their assigned modules twice: under
  // "Modüller" to write, under "Forumlar" to read the group.
  const modules = useQuery({ ...modulesQuery, enabled: participant });
  const linksTo = (base: string) =>
    (modules.data ?? []).map((module) => ({
      to: `${base}/${module.id}`,
      label: module.title,
    }));
  // A counselor's "Forumlar" lists each group by name, then the forums of
  // the modules assigned to it.
  const groups = useQuery({ ...groupsQuery, enabled: counselor });
  const groupForums = (groups.data ?? [])
    .filter((group) => group.modules.length > 0)
    .flatMap((group) => [
      { heading: group.name },
      ...group.modules.map(({ module }) => ({
        to: `/psychologist/forums/${group.id}/${module.id}`,
        label: module.title,
      })),
    ]);
  const subItems: SubItems = participant
    ? { '/app': linksTo('/app/modules'), '/app/forums': linksTo('/app/forums') }
    : counselor
      ? { '/psychologist/forums': groupForums }
      : {};

  return (
    <div className="min-h-svh bg-background text-foreground md:grid md:grid-cols-[15rem_1fr]">
      <aside className="hidden flex-col gap-8 border-r border-border bg-surface px-4 py-6 md:flex">
        <Wordmark role={role} />
        <SideNav items={items} subItems={subItems} />
      </aside>

      <div className="flex min-h-svh flex-col">
        <header className="flex h-14 items-center gap-1 border-b border-border px-3 md:px-6">
          {!participant && (
            <PhoneMenu role={role} items={items} subItems={subItems} />
          )}
          <span className="md:hidden">
            <Wordmark role={role} />
          </span>
          <div className="ml-auto flex items-center gap-1">
            <LanguageSwitch className={control} />
            <UserMenu user={user!} theme={theme} onTheme={setTheme} />
          </div>
        </header>

        <main
          className={cn(
            'mx-auto w-full flex-1 px-4 py-6 md:px-8',
            'max-w-6xl',
            participant && 'pb-28 md:pb-8',
          )}
        >
          <Outlet />
        </main>

        {participant && <TabBar items={items} />}
      </div>
      <Toaster theme={resolved} position="top-center" />
    </div>
  );
}

// Also the way home, which for participants is the module overview.
function Wordmark({ role }: { role: Role }) {
  return (
    <Link
      to={homeFor[role]}
      className="self-start rounded-md text-lg font-semibold tracking-tight outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      Yasdestek
    </Link>
  );
}

// Links listed under an item, keyed by the item's path, with optional
// headings between them. Labels are data (module titles, group names),
// shown as written.
type SubItems = Record<
  string,
  ({ to: string; label: string } | { heading: string })[]
>;

function SideNav({
  items,
  subItems = {},
  onNavigate,
}: {
  items: NavItem[];
  subItems?: SubItems;
  onNavigate?: () => void;
}) {
  const { t } = useTranslation();
  return (
    <nav aria-label={t('common.menu')} className="flex flex-col gap-1">
      {items.map((item) =>
        subItems[item.to] ? (
          <NavGroup
            key={item.to}
            item={item}
            links={subItems[item.to]}
            onNavigate={onNavigate}
          />
        ) : (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(navRow, isActive ? navActive : navIdle)
            }
          >
            <item.icon className="size-5" aria-hidden="true" />
            {t(item.label)}
          </NavLink>
        ),
      )}
    </nav>
  );
}

const navRow =
  'flex h-11 items-center gap-3 rounded-full border border-transparent px-4 text-base transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50';

// An item that opens and closes its list of links instead of leading to a page.
function NavGroup({
  item: { label, icon: Icon },
  links,
  onNavigate,
}: {
  item: NavItem;
  links: SubItems[string];
  onNavigate?: () => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(true);
  // The header shows where you are, even with the list folded away.
  const { pathname } = useLocation();
  const inside = links.some(
    (link) =>
      'to' in link &&
      (pathname === link.to || pathname.startsWith(`${link.to}/`)),
  );
  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className={cn(
          navRow,
          navIdle,
          inside && 'font-medium text-foreground dark:text-glow',
        )}
      >
        <Icon className="size-5" aria-hidden="true" />
        {t(label)}
        <ChevronDown
          className={cn(
            'ml-auto size-4 transition-transform',
            open && 'rotate-180',
          )}
          aria-hidden="true"
        />
      </button>
      {open &&
        links.map((link) =>
          'heading' in link ? (
            <p
              key={`heading-${link.heading}`}
              className="pt-2 pr-3 pl-11 text-xs font-medium text-foreground/75 dark:text-glow/75"
            >
              {link.heading}
            </p>
          ) : (
            <NavLink
              key={link.to}
              to={link.to}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  'flex min-h-9 items-center rounded-2xl border border-transparent py-2 pr-3 pl-11 text-sm leading-snug text-pretty transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                  isActive ? navActive : navIdle,
                )
              }
            >
              {link.label}
            </NavLink>
          ),
        )}
    </div>
  );
}

// Phone navigation for the denser roles: the same list, in a side sheet.
function PhoneMenu({
  role,
  items,
  subItems,
}: {
  role: Role;
  items: NavItem[];
  subItems: SubItems;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(control, 'size-10 px-0 md:hidden')}
          aria-label={t('common.menu')}
        >
          <Menu className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 bg-surface">
        <SheetHeader>
          <SheetTitle>
            <Wordmark role={role} />
          </SheetTitle>
          <SheetDescription className="sr-only">
            {t('common.menu')}
          </SheetDescription>
        </SheetHeader>
        <div className="px-4">
          <SideNav
            items={items}
            subItems={subItems}
            onNavigate={() => setOpen(false)}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}

// Phone navigation for participants: four big targets along the bottom.
function TabBar({ items }: { items: NavItem[] }) {
  const { t } = useTranslation();
  return (
    <nav
      aria-label={t('common.menu')}
      className="fixed inset-x-0 bottom-0 grid grid-cols-4 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      {items.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            cn(
              'flex h-16 flex-col items-center justify-center gap-1 text-xs outline-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset',
              isActive
                ? 'font-medium text-foreground dark:text-glow'
                : 'text-foreground/70 dark:text-glow/70',
            )
          }
        >
          <Icon className="size-6" aria-hidden="true" />
          {t(label)}
        </NavLink>
      ))}
    </nav>
  );
}

// Who is signed in, the theme, and the way out.
function UserMenu({
  user,
  theme,
  onTheme,
}: {
  user: CurrentUser;
  theme: Theme;
  onTheme: (theme: Theme) => void;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { logout } = useSession();

  const signOut = () =>
    logout.mutate(undefined, {
      onSuccess: () => void navigate('/login', { replace: true }),
      onError: toastError,
    });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={cn(control, 'gap-2 px-2 md:px-3')}
          aria-label={t('common.account')}
        >
          <CircleUserRound className="size-5" aria-hidden="true" />
          <span className="hidden text-sm md:inline">{user.username}</span>
          <ChevronDown className="size-4 opacity-70" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-56">
        <DropdownMenuLabel className="flex flex-col gap-0.5">
          <span className="font-medium text-foreground">{user.username}</span>
          <span className="text-xs font-normal text-muted-foreground">
            {t(`roles.${user.role}`)}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          {t('theme.label')}
        </DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={theme}
          onValueChange={(value) => onTheme(value as Theme)}
        >
          {THEMES.map((option) => {
            const Icon = themeIcons[option];
            return (
              <DropdownMenuRadioItem key={option} value={option}>
                <Icon className="size-4" aria-hidden="true" />
                {t(`theme.${option}`)}
              </DropdownMenuRadioItem>
            );
          })}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={signOut} disabled={logout.isPending}>
          <LogOut className="size-4" aria-hidden="true" />
          {t('common.signOut')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
