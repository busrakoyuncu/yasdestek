<script setup lang="ts">
import { LogOutIcon, MenuIcon } from '@lucide/vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
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
import { useSession } from '@/features/auth/useSession';
import { LOCALES, setLocale, type Locale } from '@/lib/i18n';
import type { NavItem } from './nav';

// Frame for every signed-in screen: sidebar on wide screens, top bar plus
// bottom tab bar on phones. The same shell serves all three roles; only
// the nav items differ.
defineProps<{ nav: NavItem[] }>();

const { t, locale } = useI18n();
const router = useRouter();
const { user, logout } = useSession();

async function onLogout() {
  await logout.mutateAsync();
  await router.replace({ name: 'login' });
}
</script>

<template>
  <div class="flex min-h-svh bg-background">
    <!-- desktop sidebar -->
    <aside
      class="sticky top-0 hidden h-svh w-64 shrink-0 flex-col gap-6 border-r bg-sidebar p-5 md:flex"
    >
      <RouterLink to="/" class="text-xl font-medium">{{
        t('app.name')
      }}</RouterLink>
      <nav class="flex flex-col gap-1" :aria-label="t('nav.main')">
        <RouterLink
          v-for="item in nav"
          :key="item.to"
          :to="item.to"
          class="flex items-center gap-3 rounded-full px-4 py-2 text-text-secondary hover:bg-sidebar-accent hover:text-foreground"
          active-class="bg-primary/10 font-medium text-primary"
        >
          <component :is="item.icon" class="size-5" aria-hidden="true" />
          {{ t(item.label) }}
        </RouterLink>
      </nav>
    </aside>

    <div class="flex min-w-0 flex-1 flex-col">
      <!-- top bar: app name on phones, user menu everywhere -->
      <header
        class="flex items-center justify-between gap-4 border-b bg-surface px-4 py-3 md:justify-end md:px-8"
      >
        <span class="text-lg font-medium md:hidden">{{ t('app.name') }}</span>
        <DropdownMenu>
          <DropdownMenuTrigger
            class="flex items-center gap-3 rounded-full border bg-surface-raised py-1.5 pr-3 pl-4 text-sm hover:bg-sidebar-accent"
            :aria-label="t('nav.userMenu')"
          >
            <span class="max-w-40 truncate">{{ user?.username }}</span>
            <MenuIcon class="size-5" aria-hidden="true" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" class="w-56">
            <DropdownMenuLabel class="font-normal">
              <span class="block truncate font-medium">{{
                user?.username
              }}</span>
              <span class="block text-xs text-muted-foreground">
                {{ user ? t(`role.${user.role}`) : '' }}
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuLabel class="text-xs text-muted-foreground">
              {{ t('common.language') }}
            </DropdownMenuLabel>
            <DropdownMenuRadioGroup
              :model-value="locale"
              @update:model-value="setLocale($event as Locale)"
            >
              <DropdownMenuRadioItem
                v-for="code in LOCALES"
                :key="code"
                :value="code"
              >
                {{ t(`lang.${code}`) }}
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem @select="onLogout">
              <LogOutIcon aria-hidden="true" />
              {{ t('auth.logout') }}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <main class="flex-1 px-4 py-6 pb-24 md:px-8 md:py-8 md:pb-8">
        <slot />
      </main>

      <!-- phone bottom tab bar -->
      <nav
        class="fixed inset-x-0 bottom-0 flex border-t bg-surface pb-[env(safe-area-inset-bottom)] md:hidden"
        :aria-label="t('nav.main')"
      >
        <RouterLink
          v-for="item in nav"
          :key="item.to"
          :to="item.to"
          class="flex min-h-14 flex-1 flex-col items-center justify-center gap-1 text-xs text-muted-foreground"
          active-class="text-primary"
        >
          <component :is="item.icon" class="size-5" aria-hidden="true" />
          {{ t(item.label) }}
        </RouterLink>
      </nav>
    </div>
  </div>
</template>
