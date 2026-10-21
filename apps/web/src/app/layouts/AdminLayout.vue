<script setup lang="ts">
import {
  BookOpenTextIcon,
  HomeIcon,
  StethoscopeIcon,
  UsersIcon,
} from '@lucide/vue';
import AppShell from '@/app/AppShell.vue';
import ErrorBoundary from '@/components/ErrorBoundary.vue';
import type { NavItem } from '@/app/nav';

// Screens of this area land here as the features are built.
const nav: NavItem[] = [
  { to: '/admin', label: 'nav.home', icon: HomeIcon },
  {
    to: '/admin/psychologists',
    label: 'nav.psychologists',
    icon: StethoscopeIcon,
  },
  { to: '/admin/participants', label: 'nav.participants', icon: UsersIcon },
  { to: '/admin/rules', label: 'nav.rules', icon: BookOpenTextIcon },
];
</script>

<template>
  <AppShell :nav="nav">
    <ErrorBoundary>
      <RouterView />
    </ErrorBoundary>
  </AppShell>
</template>
