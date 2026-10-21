<script setup lang="ts">
import { loginSchema } from '@yasdestek/shared';
import { useForm } from 'vee-validate';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import LanguageSwitch from '@/components/LanguageSwitch.vue';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { errorMessage } from '@/lib/errors';
import { toTypedSchema } from '@/lib/typed-schema';
import BackgroundVideo from './BackgroundVideo.vue';
import { homeFor, useSession } from './useSession';
import { useTypewriter } from './useTypewriter';

const { t } = useI18n();
const router = useRouter();
const route = useRoute();
const { login } = useSession();
const welcome = useTypewriter(computed(() => t('auth.login.welcome')));

const { handleSubmit, defineField, errors } = useForm({
  validationSchema: toTypedSchema(loginSchema),
});
const [username, usernameAttrs] = defineField('username');
const [password, passwordAttrs] = defineField('password');

const onSubmit = handleSubmit(async (values) => {
  const user = await login.mutateAsync(values).catch(() => null);
  if (!user) return;
  const redirect =
    typeof route.query.redirect === 'string' ? route.query.redirect : null;
  await router.replace(
    user.mustChangePassword
      ? { name: 'change-password' }
      : (redirect ?? homeFor[user.role]),
  );
});
</script>

<template>
  <BackgroundVideo />
  <header class="fixed top-4 right-4 z-10">
    <LanguageSwitch />
  </header>
  <!-- Desktop: welcome over the left trees, form over the right ones. Phone: stacked. -->
  <main
    class="mx-auto grid min-h-svh max-w-6xl content-center gap-10 px-6 py-20 md:grid-cols-2 md:items-center md:gap-16"
  >
    <!-- rust and centred on phones, cream and left-aligned over the trees on desktop.
         Every character is in the layout from the start; the reveal only toggles visibility. -->
    <h1
      class="text-center text-4xl font-medium text-balance text-primary md:text-left md:text-5xl md:text-background lg:text-6xl"
      :aria-label="t('auth.login.welcome')"
    >
      <span
        v-for="(char, i) in welcome.chars.value"
        :key="`${welcome.chars.value.length}-${i}`"
        aria-hidden="true"
        :class="[
          i < welcome.visible.value ? 'visible' : 'invisible',
          welcome.typing.value &&
            i === welcome.visible.value - 1 &&
            'border-r-2 border-current',
        ]"
        >{{ char }}</span
      >
    </h1>

    <form
      class="flex w-full max-w-sm flex-col gap-5 rounded-2xl border bg-surface-raised/70 p-6 backdrop-blur-sm md:justify-self-end"
      novalidate
      @submit="onSubmit"
    >
      <h2 class="text-2xl font-medium">{{ t('auth.login.title') }}</h2>

      <div class="flex flex-col gap-2">
        <Label for="username">{{ t('auth.login.username') }}</Label>
        <Input
          id="username"
          v-model="username"
          v-bind="usernameAttrs"
          autocomplete="username"
          autocapitalize="none"
          :aria-invalid="!!errors.username"
        />
        <p v-if="errors.username" class="text-sm text-destructive">
          {{ errors.username }}
        </p>
      </div>

      <div class="flex flex-col gap-2">
        <Label for="password">{{ t('auth.login.password') }}</Label>
        <Input
          id="password"
          v-model="password"
          v-bind="passwordAttrs"
          type="password"
          autocomplete="current-password"
          :aria-invalid="!!errors.password"
        />
        <p v-if="errors.password" class="text-sm text-destructive">
          {{ errors.password }}
        </p>
      </div>

      <p
        v-if="login.isError.value"
        role="alert"
        class="text-sm text-destructive"
      >
        {{ errorMessage(login.error.value) }}
      </p>

      <Button type="submit" size="lg" :disabled="login.isPending.value">
        {{ t('auth.login.submit') }}
      </Button>
    </form>
  </main>
</template>
