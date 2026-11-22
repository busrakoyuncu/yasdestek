import { useQuery } from '@tanstack/react-query';
import {
  ChevronDown,
  CircleUserRound,
  Download,
  LogOut,
  Menu,
  Monitor,
  Moon,
  Sun,
} from 'lucide-react';
import { useEffect, useState } from 'react';
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
import { useInstall } from '@/lib/install';
import { useRealtime } from '@/lib/realtime';
import { THEMES, useTheme, type Theme } from '@/lib/theme';
import { toastError } from '@/lib/toast';
import { homeFor, useSession } from '@/features/auth/useSession';
import { groupsQuery } from '@/features/groups/useGroups';
import { useUnreadCount } from '@/features/messages/useMessages';
import { modulesQuery } from '@/features/modules/useModules';
import type { CurrentUser, Role } from '@/types/user';
import { InstallSteps } from './InstallSteps';
import { navigation, type NavItem } from './navigation';

// Header controls are quiet text buttons: no outline, no gold. Gold is kept
// for what needs attention (unread messages); the wordmark carries the
// forest's firelight. shadcn's ghost variant sets hover and expanded colours
// per modifier, so each is restated.
const control =
  'h-10 rounded-lg bg-transparent px-3 text-sm text-foreground/80 hover:bg-foreground/5 hover:text-foreground aria-expanded:bg-foreground/5 aria-expanded:text-foreground dark:hover:bg-foreground/5 dark:aria-expanded:bg-foreground/5';

// Navigation: muted ink at rest, a soft fill for where you are.
const navIdle =
  'text-foreground/70 hover:bg-foreground/5 hover:text-foreground';
const navActive = 'bg-foreground/[0.07] font-medium text-foreground';

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
  useRealtime(user!.id);
  const unread = useUnreadCount(user!);
  // The browser tab says it too: "(3) Yasdestek".
  useEffect(() => {
    document.title = unread > 0 ? `(${unread}) Yasdestek` : 'Yasdestek';
    return () => {
      document.title = 'Yasdestek';
    };
  }, [unread]);
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
    <div className="min-h-svh bg-background [background-image:var(--grain)] text-foreground md:grid md:grid-cols-[15rem_1fr]">
      <aside className="hidden flex-col gap-8 border-r border-border bg-surface px-4 py-6 md:flex">
        <Wordmark role={role} />
        <SideNav items={items} subItems={subItems} unread={unread} />
      </aside>

      <div className="flex min-h-svh flex-col">
        <header className="flex h-14 items-center gap-1 border-b border-border px-3 md:px-6">
          {!participant && (
            <PhoneMenu
              role={role}
              items={items}
              subItems={subItems}
              unread={unread}
            />
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

        {participant && <TabBar items={items} unread={unread} />}
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
      // the welcome page's voice: firelight at night, navy by day
      className="self-start rounded-md text-lg font-medium tracking-tight text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50 dark:text-glow"
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
  unread,
  onNavigate,
}: {
  items: NavItem[];
  subItems?: SubItems;
  unread: number;
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
            {item.unread && <UnreadBadge count={unread} className="ml-auto" />}
          </NavLink>
        ),
      )}
    </nav>
  );
}

const navRow =
  'flex h-11 items-center gap-3 rounded-lg px-4 text-base transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50';

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
  // Starts folded; the header shows where you are even then.
  const [open, setOpen] = useState(false);
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
        className={cn(navRow, navIdle, inside && 'font-medium text-foreground')}
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
              className="pt-2 pr-3 pl-11 text-xs font-medium text-muted-foreground"
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
                  'flex min-h-9 items-center rounded-lg py-2 pr-3 pl-11 text-sm leading-snug text-pretty transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
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
  unread,
}: {
  role: Role;
  items: NavItem[];
  subItems: SubItems;
  unread: number;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(control, 'relative size-10 px-0 md:hidden')}
          aria-label={
            unread > 0
              ? `${t('common.menu')}, ${t('nav.unread', { count: unread })}`
              : t('common.menu')
          }
        >
          <Menu className="size-5" />
          {/* unread messages wait inside the menu */}
          {unread > 0 && (
            <span
              className="absolute top-1.5 right-1.5 size-2.5 rounded-full bg-secondary-accent ring-2 ring-background"
              aria-hidden="true"
            />
          )}
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
            unread={unread}
            onNavigate={() => setOpen(false)}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}

// Phone navigation for participants: four big targets along the bottom.
function TabBar({ items, unread }: { items: NavItem[]; unread: number }) {
  const { t } = useTranslation();
  return (
    <nav
      aria-label={t('common.menu')}
      className="fixed inset-x-0 bottom-0 grid grid-cols-4 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      {items.map(({ to, label, icon: Icon, end, unread: counts }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          // the count sits on the icon, before the label; say it after
          aria-label={
            counts && unread > 0
              ? `${t(label)}, ${t('nav.unread', { count: unread })}`
              : undefined
          }
          className={({ isActive }) =>
            cn(
              'flex h-16 flex-col items-center justify-center gap-1 text-xs outline-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset',
              isActive ? 'font-medium text-foreground' : 'text-foreground/70',
            )
          }
        >
          <span className="relative">
            <Icon className="size-6" aria-hidden="true" />
            {counts && (
              <UnreadBadge
                count={unread}
                className="absolute -top-1.5 left-4 ring-2 ring-surface"
              />
            )}
          </span>
          {t(label)}
        </NavLink>
      ))}
    </nav>
  );
}

// Unread messages on the Messages or Inbox item. Above 9 it reads "9+"
// to stay small; screen readers hear the full number.
function UnreadBadge({
  count,
  className,
}: {
  count: number;
  className?: string;
}) {
  const { t } = useTranslation();
  if (count === 0) return null;
  return (
    <span
      className={cn(
        'inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-secondary-accent px-1.5 text-xs font-semibold text-background tabular-nums',
        className,
      )}
    >
      <span aria-hidden="true">{count > 9 ? '9+' : count}</span>
      {/* the comma keeps "Mesajlar" and the count apart when read aloud */}
      <span className="sr-only">, {t('nav.unread', { count })}</span>
    </span>
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
  const { option: installOption, install } = useInstall();
  const [installSteps, setInstallSteps] = useState(false);

  const signOut = () =>
    logout.mutate(undefined, {
      onSuccess: () => void navigate('/login', { replace: true }),
      onError: toastError,
    });

  return (
    <>
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
          {installOption && (
            <DropdownMenuItem
              onSelect={() =>
                installOption === 'prompt'
                  ? void install()
                  : setInstallSteps(true)
              }
            >
              <Download className="size-4" aria-hidden="true" />
              {t('install.action')}
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onSelect={signOut} disabled={logout.isPending}>
            <LogOut className="size-4" aria-hidden="true" />
            {t('common.signOut')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <InstallSteps open={installSteps} onOpenChange={setInstallSteps} />
    </>
  );
}
