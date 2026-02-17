<template>
  <section class="mx-auto w-full max-w-6xl px-4 py-10">
    <div class="rounded-xl border border-border2 bg-bg2 p-8 text-text2">
      <h1 class="mb-3">{{ title }}</h1>
      <p class="opacity-80">{{ description }}</p>
    </div>
  </section>
</template>

<script setup>
defineProps({
  title: { type: String, required: true },
  description: { type: String, required: true },
});
</script>
