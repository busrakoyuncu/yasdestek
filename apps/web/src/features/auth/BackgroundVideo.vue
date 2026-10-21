<script setup lang="ts">
import { useMediaQuery, usePreferredReducedMotion } from '@vueuse/core';
import { computed } from 'vue';

// Login backdrop, shown as painted (no tint). Portrait phones get the 9:16
// file, everything else the landscape one. People who prefer reduced motion or save data see only
// the poster. Both files are short loops, muted, under 2 MB.
const portrait = useMediaQuery('(orientation: portrait)');
const reducedMotion = usePreferredReducedMotion();
const saveData = (
  navigator as Navigator & { connection?: { saveData?: boolean } }
).connection?.saveData;

const name = computed(() =>
  portrait.value ? 'login-page-bg-mobile' : 'login-page-bg-web',
);
const stillOnly = computed(
  () => reducedMotion.value === 'reduce' || saveData === true,
);
</script>

<template>
  <div class="fixed inset-0 -z-10" aria-hidden="true">
    <img
      v-if="stillOnly"
      :src="`/${name}.jpg`"
      alt=""
      class="size-full object-cover"
    />
    <video
      v-else
      :key="name"
      :poster="`/${name}.jpg`"
      :src="`/${name}.mp4`"
      class="size-full object-cover"
      autoplay
      muted
      loop
      playsinline
      preload="metadata"
    />
  </div>
</template>
