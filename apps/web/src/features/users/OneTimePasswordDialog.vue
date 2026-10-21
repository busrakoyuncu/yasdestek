<script setup lang="ts">
import { useClipboard } from '@vueuse/core';
import { useI18n } from 'vue-i18n';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// The temporary password, shown this once. The api never returns it again.
const props = defineProps<{ username: string; password: string }>();
const open = defineModel<boolean>('open', { required: true });
const { t } = useI18n();
const { copy, copied, isSupported } = useClipboard({
  source: () => props.password,
});
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{{ t('users.oneTime.title') }}</DialogTitle>
        <DialogDescription>{{ t('users.oneTime.intro') }}</DialogDescription>
      </DialogHeader>
      <dl
        class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-xl bg-surface p-4"
      >
        <dt class="text-muted-foreground">{{ t('users.username') }}</dt>
        <dd class="font-medium">{{ username }}</dd>
        <dt class="text-muted-foreground">{{ t('auth.login.password') }}</dt>
        <dd class="font-mono text-lg font-medium tracking-wide select-all">
          {{ password }}
        </dd>
      </dl>
      <DialogFooter>
        <Button v-if="isSupported" variant="outline" @click="copy()">
          {{ copied ? t('users.oneTime.copied') : t('users.oneTime.copy') }}
        </Button>
        <Button @click="open = false">{{ t('users.oneTime.done') }}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
