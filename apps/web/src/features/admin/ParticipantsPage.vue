<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { Button } from '@/components/ui/button';
import CreateUserDialog from '@/features/users/CreateUserDialog.vue';
import OneTimePasswordDialog from '@/features/users/OneTimePasswordDialog.vue';
import UsersTable from '@/features/users/UsersTable.vue';
import { useUsers, type CreatedUser } from '@/features/users/useUsers';
import { errorMessage } from '@/lib/errors';

// Admin: every participant with their psychologist. Creating one here
// means naming the psychologist; psychologists create their own directly.
const { t } = useI18n();
const { users } = useUsers();

const psychologists = computed(() =>
  (users.data.value ?? []).filter((u) => u.role === 'PSYCHOLOGIST'),
);
const participants = computed(() =>
  (users.data.value ?? []).filter((u) => u.role === 'USER'),
);
const names = computed(() =>
  Object.fromEntries(psychologists.value.map((p) => [p.id, p.username])),
);

const creating = ref(false);
const created = ref<CreatedUser | null>(null);
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="flex items-center justify-between gap-4">
      <h1 class="text-2xl font-medium">{{ t('users.participants') }}</h1>
      <Button :disabled="psychologists.length === 0" @click="creating = true">
        {{ t('users.create.USER') }}
      </Button>
    </div>

    <p v-if="users.isPending.value" class="text-muted-foreground">
      {{ t('common.loading') }}
    </p>
    <div
      v-else-if="users.isError.value"
      role="alert"
      class="flex flex-col items-start gap-3"
    >
      <p class="text-destructive">{{ errorMessage(users.error.value) }}</p>
      <Button variant="outline" @click="users.refetch()">{{
        t('common.retry')
      }}</Button>
    </div>
    <UsersTable v-else :rows="participants" :psychologists="names" />

    <CreateUserDialog
      v-model:open="creating"
      role="USER"
      :psychologists="psychologists"
      @created="created = $event"
    />
    <OneTimePasswordDialog
      v-if="created"
      :open="true"
      :username="created.user.username"
      :password="created.password"
      @update:open="(v) => !v && (created = null)"
    />
  </div>
</template>
