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
import { NavLink, Outlet, useNavigate } from 'react-router';
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
import { useSession } from '@/features/auth/useSession';
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

  return (
    <div className="min-h-svh bg-background text-foreground md:grid md:grid-cols-[15rem_1fr]">
      <aside className="hidden flex-col gap-8 border-r border-border bg-surface px-4 py-6 md:flex">
        <Wordmark />
        <SideNav items={items} />
      </aside>

      <div className="flex min-h-svh flex-col">
        <header className="flex h-14 items-center gap-1 border-b border-border px-3 md:px-6">
          {!participant && <PhoneMenu items={items} />}
          <span className="md:hidden">
            <Wordmark />
          </span>
          <div className="ml-auto flex items-center gap-1">
            <LanguageSwitch className={control} />
            <UserMenu user={user!} theme={theme} onTheme={setTheme} />
          </div>
        </header>

        <main
          className={cn(
            'mx-auto w-full flex-1 px-4 py-6 md:px-8',
            participant ? 'max-w-2xl pb-28 md:pb-8' : 'max-w-6xl',
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

function Wordmark() {
  return (
    <span className="text-lg font-semibold tracking-tight">Yasdestek</span>
  );
}

function SideNav({
  items,
  onNavigate,
}: {
  items: NavItem[];
  onNavigate?: () => void;
}) {
  const { t } = useTranslation();
  return (
    <nav aria-label={t('common.menu')} className="flex flex-col gap-1">
      {items.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'flex h-11 items-center gap-3 rounded-full border border-transparent px-4 text-base transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
              isActive ? navActive : navIdle,
            )
          }
        >
          <Icon className="size-5" aria-hidden="true" />
          {t(label)}
        </NavLink>
      ))}
    </nav>
  );
}

// Phone navigation for the denser roles: the same list, in a side sheet.
function PhoneMenu({ items }: { items: NavItem[] }) {
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
            <Wordmark />
          </SheetTitle>
          <SheetDescription className="sr-only">
            {t('common.menu')}
          </SheetDescription>
        </SheetHeader>
        <div className="px-4">
          <SideNav items={items} onNavigate={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}

// Phone navigation for participants: three big targets along the bottom.
function TabBar({ items }: { items: NavItem[] }) {
  const { t } = useTranslation();
  return (
    <nav
      aria-label={t('common.menu')}
      className="fixed inset-x-0 bottom-0 grid grid-cols-3 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] md:hidden"
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
