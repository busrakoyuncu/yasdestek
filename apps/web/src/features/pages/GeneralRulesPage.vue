<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { Button } from '@/components/ui/button';
import { errorMessage } from '@/lib/errors';
import { usePage } from './usePage';

// The platform's interaction rules, readable by every role. The text is
// data written by an admin and shown exactly as written.
const { t } = useI18n();
const page = usePage('general-rules');
</script>

<template>
  <article class="mx-auto flex max-w-prose flex-col gap-6">
    <h1 class="text-2xl font-medium">{{ t('nav.rules') }}</h1>

    <p v-if="page.isPending.value" class="text-muted-foreground">
      {{ t('common.loading') }}
    </p>

    <div
      v-else-if="page.isError.value"
      role="alert"
      class="flex flex-col items-start gap-3"
    >
      <p class="text-destructive">{{ errorMessage(page.error.value) }}</p>
      <Button variant="outline" @click="page.refetch()">{{
        t('common.retry')
      }}</Button>
    </div>

    <p
      v-else
      class="font-body leading-relaxed whitespace-pre-line text-text-secondary"
    >
      {{ page.data.value?.content }}
    </p>
  </article>
</template>
