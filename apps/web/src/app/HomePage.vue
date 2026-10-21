<script setup lang="ts">
import { useQuery } from '@tanstack/vue-query';
import { Button } from '@/components/ui/button';

// Placeholder until the login page exists. Proves the api proxy, the theme, and the fonts.
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
  <main
    class="mx-auto flex min-h-svh max-w-md flex-col justify-center gap-6 p-6"
  >
    <h1 class="text-3xl font-medium">Yasdestek</h1>
    <p class="text-text-secondary">
      api:
      <span v-if="health.isPending.value" class="text-muted-foreground"
        >...</span
      >
      <span v-else-if="health.isError.value" class="text-destructive">
        {{ health.error.value?.message }}
      </span>
      <span v-else>{{ health.data.value }}</span>
    </p>
    <p class="font-body text-text-secondary">
      Yazdıklarınız bu yazı tipiyle görünür: ğ, ş, i, ı, ç, ö, ü.
    </p>
    <p class="font-letter text-lg leading-loose">
      Sevgili anneciğim, bugün seni çok düşündüm.
    </p>
    <Button @click="health.refetch()">Yenile</Button>
  </main>
</template>
