<template>
  <div class="flex w-full cursor-pointer select-none items-center gap-2">
    <input
      id="chaos-toggle"
      v-model="enabled"
      type="checkbox"
      class="peer hidden"
    />
    <label
      for="chaos-toggle"
      class="flex w-full items-center gap-2 rounded-lg border border-button2-border bg-button2 px-3 py-2 text-button2-meta transition-all hover:bg-button2-hover"
    >
      <span class="text-lg">🍺</span>
      <span class="font-medium">{{ t("settings.chaos.label") }}</span>
      <span v-if="enabled" class="ml-1 text-sm font-semibold text-green-500">
        {{ t("settings.chaos.on") }}
      </span>
      <span v-else class="ml-1 text-sm text-button2-meta">
        {{ t("settings.chaos.off") }}
      </span>
    </label>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from "vue";
import { useI18n } from "vue-i18n";

const enabled = ref(false);
const { t } = useI18n();

onMounted(() => {
  const saved = localStorage.getItem("chaosMode");
  if (saved === "true") {
    enabled.value = true;
    document.body.classList.add("upside-down");
  }
});

watch(enabled, (val) => {
  document.body.classList.toggle("upside-down", val);
  localStorage.setItem("chaosMode", val);
});
</script>

<style scoped>
label {
  transition: all 0.3s ease;
}

.peer:checked + label {
  transform: rotate(-2deg);
  background-color: var(--color-bg2);
  box-shadow: 0 0 12px rgba(255, 200, 0, 0.4);
}
</style>

<style>
body.upside-down {
  transform: rotate(180deg);
  transition: transform 0.8s ease-in-out;
  transform-origin: center center;
}
</style>
