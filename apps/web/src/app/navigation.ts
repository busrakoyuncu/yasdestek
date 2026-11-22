import {
  BookOpen,
  ChartColumn,
  HeartHandshake,
  Inbox,
  MessageCircle,
  MessagesSquare,
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
  unread?: boolean; // shows the unread message count
};

// What each role sees in the sidebar (or the tab bar, for participants).
// The rules page leads every list (PRD 4.2.0); `end` marks the area's home.
export const navigation: Record<Role, NavItem[]> = {
  USER: [
    { to: '/app/rules', label: 'nav.rules', icon: ScrollText },
    { to: '/app', label: 'nav.modules', icon: BookOpen, end: true },
    { to: '/app/forums', label: 'nav.forums', icon: MessagesSquare },
    {
      to: '/app/messages',
      label: 'nav.messages',
      icon: MessageCircle,
      unread: true,
    },
  ],
  PSYCHOLOGIST: [
    { to: '/psychologist/rules', label: 'nav.rules', icon: ScrollText },
    { to: '/psychologist', label: 'nav.participants', icon: Users, end: true },
    { to: '/psychologist/groups', label: 'nav.groups', icon: UsersRound },
    { to: '/psychologist/forums', label: 'nav.forums', icon: MessagesSquare },
    { to: '/psychologist/modules', label: 'nav.modules', icon: BookOpen },
    {
      to: '/psychologist/inbox',
      label: 'nav.inbox',
      icon: Inbox,
      unread: true,
    },
  ],
  ADMIN: [
    { to: '/admin/rules', label: 'nav.rules', icon: ScrollText },
    { to: '/admin', label: 'nav.counselors', icon: HeartHandshake, end: true },
    { to: '/admin/participants', label: 'nav.participants', icon: Users },
    { to: '/admin/modules', label: 'nav.modules', icon: BookOpen },
    { to: '/admin/analytics', label: 'nav.analytics', icon: ChartColumn },
  ],
};
