<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { LOCALES, setLocale } from '@/lib/i18n';

// Compact segmented switch: TR · EN · DE, active one filled.
const { t, locale } = useI18n();
</script>

<template>
  <div
    role="group"
    :aria-label="t('common.language')"
    class="inline-flex rounded-full border bg-surface-raised/70 p-1 backdrop-blur-sm"
  >
    <button
      v-for="code in LOCALES"
      :key="code"
      type="button"
      :aria-pressed="locale === code"
      :title="t(`lang.${code}`)"
      class="rounded-full px-3 py-1 text-sm font-medium uppercase transition-colors"
      :class="
        locale === code
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:text-foreground'
      "
      @click="setLocale(code)"
    >
      {{ code }}
    </button>
  </div>
</template>
