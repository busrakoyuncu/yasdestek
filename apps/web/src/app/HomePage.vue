<script setup lang="ts">
import { useQuery } from '@tanstack/vue-query';
import { useI18n } from 'vue-i18n';
import LanguageSwitch from '@/components/LanguageSwitch.vue';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { errorMessage } from '@/lib/errors';

const { t } = useI18n();

// Placeholder until the login page exists. Proves proxy, theme, fonts, and i18n.
const health = useQuery({
  queryKey: ['health'],
  queryFn: () => api.get<string>('/'),
});
</script>

<template>
  <main
    class="mx-auto flex min-h-svh max-w-md flex-col justify-center gap-6 p-6"
  >
    <h1 class="text-3xl font-medium">{{ t('app.name') }}</h1>
    <p class="text-text-secondary">
      {{ t('home.api') }}:
      <span v-if="health.isPending.value" class="text-muted-foreground">
        {{ t('common.loading') }}
      </span>
      <span v-else-if="health.isError.value" class="text-destructive">
        {{ errorMessage(health.error.value) }}
      </span>
      <span v-else>{{ health.data.value }}</span>
    </p>
    <p class="font-body text-text-secondary">{{ t('home.bodySample') }}</p>
    <p class="font-letter text-lg leading-loose">
      {{ t('home.letterSample') }}
    </p>
    <div class="flex items-center justify-between">
      <Button @click="health.refetch()">{{ t('common.retry') }}</Button>
      <LanguageSwitch />
    </div>
  </main>
</template>
