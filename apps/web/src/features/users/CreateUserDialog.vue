<script setup lang="ts">
import { createUserSchema } from '@yasdestek/shared';
import { useForm } from 'vee-validate';
import { computed } from 'vue';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { errorMessage } from '@/lib/errors';
import { toTypedSchema } from '@/lib/typed-schema';
import type { Role } from '@/types/user';
import type { CreatedUser } from './useUsers';
import { useUsers } from './useUsers';

// Creates one account of a fixed role. The caller shows the returned
// one-time password. A psychologist creating a participant is the owner
// automatically; an admin picks one from `psychologists`.
const props = defineProps<{
  role: Exclude<Role, 'ADMIN'>;
  psychologists?: { id: string; username: string }[];
}>();
const open = defineModel<boolean>('open', { required: true });
const emit = defineEmits<{ created: [created: CreatedUser] }>();
const { t } = useI18n();
const { create } = useUsers();

const needsPicker = computed(
  () => props.role === 'USER' && props.psychologists !== undefined,
);
const schema = needsPicker.value
  ? createUserSchema.pick({ username: true, psychologistId: true }).required()
  : createUserSchema.pick({ username: true });

const { handleSubmit, defineField, errors, resetForm } = useForm({
  validationSchema: toTypedSchema(schema),
});
const [username, usernameAttrs] = defineField('username');
const [psychologistId, psychologistAttrs] = defineField('psychologistId');

const onSubmit = handleSubmit(async (values) => {
  const created = await create
    .mutateAsync({ role: props.role, ...values })
    .catch(() => null);
  if (!created) return;
  resetForm();
  open.value = false;
  emit('created', created);
});
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent>
      <form class="flex flex-col gap-5" novalidate @submit="onSubmit">
        <DialogHeader>
          <DialogTitle>{{ t(`users.create.${role}`) }}</DialogTitle>
          <DialogDescription>{{ t('users.create.intro') }}</DialogDescription>
        </DialogHeader>
        <div class="flex flex-col gap-2">
          <Label for="new-username">{{ t('users.username') }}</Label>
          <Input
            id="new-username"
            v-model="username"
            v-bind="usernameAttrs"
            autocomplete="off"
            autocapitalize="none"
            :aria-invalid="!!errors.username"
          />
          <p class="text-sm text-muted-foreground">
            {{ t('users.usernameHint') }}
          </p>
          <p v-if="errors.username" class="text-sm text-destructive">
            {{ errors.username }}
          </p>
        </div>
        <div v-if="needsPicker" class="flex flex-col gap-2">
          <Label for="new-psychologist">{{ t('users.psychologist') }}</Label>
          <select
            id="new-psychologist"
            v-model="psychologistId"
            v-bind="psychologistAttrs"
            class="h-9 rounded-md border bg-surface-raised px-3 text-sm"
            :aria-invalid="!!errors.psychologistId"
          >
            <option value="" disabled>
              {{ t('users.choosePsychologist') }}
            </option>
            <option v-for="p in psychologists" :key="p.id" :value="p.id">
              {{ p.username }}
            </option>
          </select>
          <p v-if="errors.psychologistId" class="text-sm text-destructive">
            {{ errors.psychologistId }}
          </p>
        </div>
        <p
          v-if="create.isError.value"
          role="alert"
          class="text-sm text-destructive"
        >
          {{ errorMessage(create.error.value) }}
        </p>
        <DialogFooter>
          <Button type="button" variant="outline" @click="open = false">
            {{ t('common.cancel') }}
          </Button>
          <Button type="submit" :disabled="create.isPending.value">{{
            t('common.create')
          }}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
