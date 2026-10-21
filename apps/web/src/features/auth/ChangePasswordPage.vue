<script setup lang="ts">
import { changePasswordSchema } from '@yasdestek/shared';
import { useForm } from 'vee-validate';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { errorMessage } from '@/lib/errors';
import { toTypedSchema } from '@/lib/typed-schema';
import { homeFor, useSession } from './useSession';

const { t } = useI18n();
const router = useRouter();
const { user, changePassword } = useSession();

const { handleSubmit, defineField, errors } = useForm({
  validationSchema: toTypedSchema(changePasswordSchema),
});
const [currentPassword, currentAttrs] = defineField('currentPassword');
const [newPassword, newAttrs] = defineField('newPassword');

const onSubmit = handleSubmit(async (values) => {
  const ok = await changePassword
    .mutateAsync(values)
    .then(() => true)
    .catch(() => false);
  if (ok && user.value) await router.replace(homeFor[user.value.role]);
});
</script>

<template>
  <main
    class="mx-auto flex min-h-svh max-w-sm flex-col justify-center gap-6 p-6"
  >
    <form class="flex flex-col gap-5" novalidate @submit="onSubmit">
      <div class="flex flex-col gap-2">
        <h1 class="text-2xl font-medium">
          {{ t('auth.changePassword.title') }}
        </h1>
        <p class="text-text-secondary">{{ t('auth.changePassword.intro') }}</p>
      </div>

      <div class="flex flex-col gap-2">
        <Label for="current">{{ t('auth.changePassword.current') }}</Label>
        <Input
          id="current"
          v-model="currentPassword"
          v-bind="currentAttrs"
          type="password"
          autocomplete="current-password"
          :aria-invalid="!!errors.currentPassword"
        />
        <p v-if="errors.currentPassword" class="text-sm text-destructive">
          {{ errors.currentPassword }}
        </p>
      </div>

      <div class="flex flex-col gap-2">
        <Label for="new">{{ t('auth.changePassword.new') }}</Label>
        <Input
          id="new"
          v-model="newPassword"
          v-bind="newAttrs"
          type="password"
          autocomplete="new-password"
          :aria-invalid="!!errors.newPassword"
        />
        <p v-if="errors.newPassword" class="text-sm text-destructive">
          {{ errors.newPassword }}
        </p>
      </div>

      <p
        v-if="changePassword.isError.value"
        role="alert"
        class="text-sm text-destructive"
      >
        {{ errorMessage(changePassword.error.value) }}
      </p>

      <Button
        type="submit"
        size="lg"
        :disabled="changePassword.isPending.value"
      >
        {{ t('auth.changePassword.submit') }}
      </Button>
    </form>
  </main>
</template>
