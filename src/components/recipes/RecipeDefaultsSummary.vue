<template>
  <div class="mt-3 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
    <div>{{ t("recipes.metrics.og") }}: {{ defaults?.ogFrom || "-" }} - {{ defaults?.ogTo || "-" }}</div>
    <div>{{ t("recipes.metrics.fg") }}: {{ defaults?.fgFrom || "-" }} - {{ defaults?.fgTo || "-" }}</div>
    <div>{{ t("recipes.metrics.co2") }}: {{ formatMetric(defaults?.co2Volumes) }}</div>
    <div>{{ t("recipes.metrics.ibu") }}: {{ formatMetric(defaults?.ibu) }}</div>
    <div>{{ t("recipes.fields.batch_size_liters") }}: {{ formatMetric(defaults?.batchSizeLiters) }}</div>
    <div v-if="showAbv">{{ t("recipes.metrics.abv") }}: {{ abvText || "-" }}</div>
  </div>
</template>

<script setup>
import { useI18n } from "vue-i18n";

defineProps({
  defaults: {
    type: Object,
    default: () => ({}),
  },
  abvText: {
    type: String,
    default: "",
  },
  showAbv: {
    type: Boolean,
    default: false,
  },
});

const { t } = useI18n();

function formatMetric(value) {
  return value === null || value === undefined || value === "" ? "-" : value;
}
</script>
