<script setup lang="ts">
import { useQuery } from '@tanstack/vue-query';

// Placeholder until the login page exists. Proves the api proxy works.
const health = useQuery({
  queryKey: ['health'],
  queryFn: async () => {
    const res = await fetch(`${import.meta.env.VITE_API_URL}/`);
    if (!res.ok) throw new Error(`api answered ${res.status}`);
    return res.text();
  },
});
</script>

<template>
  <main>
    <h1>Yasdestek</h1>
    <p>
      api:
      <span v-if="health.isPending.value">...</span>
      <span v-else-if="health.isError.value">{{ health.error.value?.message }}</span>
      <span v-else>{{ health.data.value }}</span>
    </p>
  </main>
</template>
