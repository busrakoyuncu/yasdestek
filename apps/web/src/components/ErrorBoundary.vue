<script setup lang="ts">
import { onErrorCaptured, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { Button } from '@/components/ui/button';
import { errorMessage } from '@/lib/errors';

// Catches a crash anywhere below it and shows a calm message with a retry,
// instead of a blank screen. Retry remounts the children from scratch.
// In standalone (home-screen) mode there is no browser refresh, so this
// button is the only way back.
const { t } = useI18n();
const error = ref<unknown>(null);
const attempt = ref(0);

onErrorCaptured((err) => {
  console.error(err);
  error.value = err;
  return false;
});

function retry() {
  error.value = null;
  attempt.value += 1;
}
</script>

<template>
  <div
    v-if="error"
    role="alert"
    class="mx-auto flex max-w-md flex-col items-center gap-4 rounded-2xl border bg-surface-raised p-8 text-center"
  >
    <p class="text-lg font-medium">{{ t('errors.title') }}</p>
    <p class="text-text-secondary">{{ errorMessage(error) }}</p>
    <Button @click="retry">{{ t('common.retry') }}</Button>
  </div>
  <slot v-else :key="attempt" />
</template>
