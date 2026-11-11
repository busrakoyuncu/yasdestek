import {
  BookOpen,
  ChartColumn,
  HeartHandshake,
  Inbox,
  MessageCircle,
  ScrollText,
  Users,
  UsersRound,
  type LucideIcon,
} from 'lucide-react';
import type { Role } from '@/types/user';

export type NavItem = {
  to: string;
  label: string; // translation key
  icon: LucideIcon;
  end?: boolean; // the area's home: active only on an exact match
};

// What each role sees in the sidebar (or the tab bar, for participants).
// The first entry is the area's home. The rules page is on every list (PRD 4.2.0).
export const navigation: Record<Role, NavItem[]> = {
  USER: [
    { to: '/app', label: 'nav.modules', icon: BookOpen, end: true },
    { to: '/app/messages', label: 'nav.messages', icon: MessageCircle },
    { to: '/app/rules', label: 'nav.rules', icon: ScrollText },
  ],
  PSYCHOLOGIST: [
    { to: '/psychologist', label: 'nav.participants', icon: Users, end: true },
    { to: '/psychologist/groups', label: 'nav.groups', icon: UsersRound },
    { to: '/psychologist/modules', label: 'nav.modules', icon: BookOpen },
    { to: '/psychologist/inbox', label: 'nav.inbox', icon: Inbox },
    { to: '/psychologist/rules', label: 'nav.rules', icon: ScrollText },
  ],
  ADMIN: [
    { to: '/admin', label: 'nav.counselors', icon: HeartHandshake, end: true },
    { to: '/admin/participants', label: 'nav.participants', icon: Users },
    { to: '/admin/modules', label: 'nav.modules', icon: BookOpen },
    { to: '/admin/analytics', label: 'nav.analytics', icon: ChartColumn },
    { to: '/admin/rules', label: 'nav.rules', icon: ScrollText },
  ],
};
