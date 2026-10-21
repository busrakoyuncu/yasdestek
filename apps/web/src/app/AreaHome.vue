<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { useSession } from '@/features/auth/useSession';

// Home of each area until its first real screen exists.
const { t } = useI18n();
const { user } = useSession();
</script>

<template>
  <div class="mx-auto flex max-w-2xl flex-col gap-3">
    <h1 class="text-2xl font-medium">
      {{ t('area.welcome', { name: user?.username }) }}
    </h1>
    <p class="text-text-secondary">{{ t('area.comingSoon') }}</p>
  </div>
</template>
