<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { LOCALES, setLocale, type Locale } from '@/lib/i18n';

const { t, locale } = useI18n();
</script>

<template>
  <label class="flex items-center gap-2 text-sm text-muted-foreground">
    <span>{{ t('common.language') }}</span>
    <select
      :value="locale"
      class="rounded-full border bg-surface px-3 py-1 text-foreground"
      @change="setLocale(($event.target as HTMLSelectElement).value as Locale)"
    >
      <option v-for="code in LOCALES" :key="code" :value="code">
        {{ t(`lang.${code}`) }}
      </option>
    </select>
  </label>
</template>
