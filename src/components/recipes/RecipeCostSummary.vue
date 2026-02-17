<template>
  <div class="mt-3 grid gap-2 text-sm sm:grid-cols-2">
    <p>
      {{ t("recipes.detail.total_ingredients_cost") }}:
      <strong>{{ totalCostText }}</strong>
    </p>
    <p>
      {{ t("recipes.detail.liter_price") }}:
      <strong>{{ literPriceText }}</strong>
    </p>
  </div>
</template>

<script setup>
import { useI18n } from "vue-i18n";

defineProps({
  totalCostText: {
    type: String,
    default: "-",
  },
  literPriceText: {
    type: String,
    default: "-",
  },
});

const { t } = useI18n();
</script>
