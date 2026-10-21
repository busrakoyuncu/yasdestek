<script setup lang="ts">
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

// "Are you sure?" for actions with consequences. Controlled by v-model:open.
defineProps<{
  title: string;
  description?: string;
  confirmLabel?: string;
  destructive?: boolean;
}>();
const open = defineModel<boolean>('open', { required: true });
const emit = defineEmits<{ confirm: [] }>();
const { t } = useI18n();
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{{ title }}</DialogTitle>
        <DialogDescription v-if="description">{{
          description
        }}</DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button variant="outline" @click="open = false">{{
          t('common.cancel')
        }}</Button>
        <Button
          :variant="destructive ? 'destructive' : 'default'"
          @click="emit('confirm')"
        >
          {{ confirmLabel ?? t('common.confirm') }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
