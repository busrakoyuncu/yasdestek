<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import LanguageSwitch from '@/components/LanguageSwitch.vue';
import { Button } from '@/components/ui/button';
import { useSession } from '@/features/auth/useSession';

// Stands in for each role area until its layout and screens exist.
const { t } = useI18n();
const router = useRouter();
const { user, logout } = useSession();

async function onLogout() {
  await logout.mutateAsync();
  await router.replace({ name: 'login' });
}
</script>

<template>
  <main
    class="mx-auto flex min-h-svh max-w-md flex-col justify-center gap-6 p-6"
  >
    <h1 class="text-2xl font-medium">
      {{ t('area.welcome', { name: user?.username }) }}
    </h1>
    <p class="text-text-secondary">
      {{ user ? t(`role.${user.role}`) : '' }} · {{ t('area.comingSoon') }}
    </p>
    <div class="flex items-center justify-between">
      <Button variant="outline" @click="onLogout">{{
        t('auth.logout')
      }}</Button>
      <LanguageSwitch />
    </div>
  </main>
</template>
