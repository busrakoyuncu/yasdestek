<script setup lang="ts">
import { BookOpenTextIcon, HomeIcon } from '@lucide/vue';
import AppShell from '@/app/AppShell.vue';
import type { NavItem } from '@/app/nav';

// Screens of this area land here as the features are built.
const nav: NavItem[] = [
  { to: '/psychologist', label: 'nav.home', icon: HomeIcon },
  { to: '/psychologist/rules', label: 'nav.rules', icon: BookOpenTextIcon },
];
</script>

<template>
  <AppShell :nav="nav">
    <RouterView />
  </AppShell>
</template>
