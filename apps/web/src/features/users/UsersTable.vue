<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import ConfirmDialog from '@/components/ConfirmDialog.vue';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatDate } from '@/lib/date';
import { toastError, toastSuccess } from '@/lib/toast';
import OneTimePasswordDialog from './OneTimePasswordDialog.vue';
import { useUsers, type UserRow } from './useUsers';

// Accounts with their status and the three management actions. Shared by
// the admin's psychologist list and the psychologist's participant list.
defineProps<{ rows: UserRow[] }>();
const { t } = useI18n();
const { activate, deactivate, resetPassword } = useUsers();

const toDeactivate = ref<UserRow | null>(null);
const toReset = ref<UserRow | null>(null);
const oneTime = ref<{ username: string; password: string } | null>(null);

async function onActivate(user: UserRow) {
  await activate.mutateAsync(user.id).then(
    () => toastSuccess('users.activated'),
    (e) => toastError(e),
  );
}

async function onDeactivate() {
  const user = toDeactivate.value;
  toDeactivate.value = null;
  if (!user) return;
  await deactivate.mutateAsync(user.id).then(
    () => toastSuccess('users.deactivated'),
    (e) => toastError(e),
  );
}

async function onReset() {
  const user = toReset.value;
  toReset.value = null;
  if (!user) return;
  await resetPassword.mutateAsync(user.id).then(
    ({ password }) => (oneTime.value = { username: user.username, password }),
    (e) => toastError(e),
  );
}
</script>

<template>
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead>{{ t('users.username') }}</TableHead>
        <TableHead>{{ t('users.status') }}</TableHead>
        <TableHead class="hidden sm:table-cell">{{
          t('users.created')
        }}</TableHead>
        <TableHead class="text-right">{{ t('users.actions') }}</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      <TableEmpty v-if="rows.length === 0" :colspan="4">{{
        t('users.empty')
      }}</TableEmpty>
      <TableRow v-for="user in rows" :key="user.id">
        <TableCell class="font-medium">{{ user.username }}</TableCell>
        <TableCell>
          <Badge v-if="!user.active" variant="outline">{{
            t('users.inactive')
          }}</Badge>
          <Badge v-else-if="user.mustChangePassword" variant="secondary">
            {{ t('users.pendingPassword') }}
          </Badge>
          <Badge v-else>{{ t('users.active') }}</Badge>
        </TableCell>
        <TableCell class="hidden text-muted-foreground sm:table-cell">
          {{ formatDate(user.createdAt) }}
        </TableCell>
        <TableCell class="space-x-1 text-right whitespace-nowrap">
          <Button v-if="!user.active" size="sm" @click="onActivate(user)">
            {{ t('users.activate') }}
          </Button>
          <Button
            v-else
            size="sm"
            variant="outline"
            @click="toDeactivate = user"
          >
            {{ t('users.deactivate') }}
          </Button>
          <Button size="sm" variant="ghost" @click="toReset = user">
            {{ t('users.resetPassword') }}
          </Button>
        </TableCell>
      </TableRow>
    </TableBody>
  </Table>

  <ConfirmDialog
    :open="toDeactivate !== null"
    :title="t('users.deactivateTitle', { name: toDeactivate?.username })"
    :description="t('users.deactivateIntro')"
    :confirm-label="t('users.deactivate')"
    destructive
    @update:open="(v) => !v && (toDeactivate = null)"
    @confirm="onDeactivate"
  />
  <ConfirmDialog
    :open="toReset !== null"
    :title="t('users.resetTitle', { name: toReset?.username })"
    :description="t('users.resetIntro')"
    :confirm-label="t('users.resetPassword')"
    @update:open="(v) => !v && (toReset = null)"
    @confirm="onReset"
  />
  <OneTimePasswordDialog
    v-if="oneTime"
    :open="true"
    :username="oneTime.username"
    :password="oneTime.password"
    @update:open="(v) => !v && (oneTime = null)"
  />
</template>
