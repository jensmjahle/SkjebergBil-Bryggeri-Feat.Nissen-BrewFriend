<template>
  <div class="border-t border-border3 py-2">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <div class="flex items-center gap-2">
        <img
          :src="categoryIcon"
          :alt="categoryLabel"
          class="h-7 w-7 rounded-md border border-border3 bg-white p-1 object-contain"
        />
        <h4>{{ ingredient?.name }}</h4>
      </div>
      <span class="rounded-full bg-bg4 text-text4 px-2 py-1 text-xs">{{ categoryLabel }}</span>
    </div>

    <p class="mt-1 text-sm opacity-90">{{ amountText }}</p>
    <p class="mt-1 text-sm opacity-85">
      {{ t("recipes.fields.price") }}: {{ priceText }}
    </p>
    <p v-if="ingredient?.notes" class="mt-1 text-sm opacity-80">{{ ingredient.notes }}</p>

    <div v-if="stepTags.length" class="mt-2 space-y-1">
      <p class="text-xs font-semibold uppercase opacity-70">{{ t("recipes.detail.used_in_steps") }}</p>
      <div class="mt-1 flex flex-wrap gap-2">
        <span
          v-for="stepTag in stepTags"
          :key="`${ingredient?.ingredientId}-${stepTag}`"
          class="rounded-full border border-border3 px-2 py-1 text-xs"
        >
          {{ stepTag }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { ingredientCategoryIcon, ingredientCategoryLabel } from "@/utils/recipeAssets.js";

const props = defineProps({
  ingredient: {
    type: Object,
    required: true,
  },
  steps: {
    type: Array,
    default: () => [],
  },
});

const { t, locale } = useI18n();

const categoryIcon = computed(() => ingredientCategoryIcon(props.ingredient?.category));
const categoryLabel = computed(() => ingredientCategoryLabel(t, props.ingredient?.category));
const amountText = computed(() => [props.ingredient?.amount, props.ingredient?.unit].filter(Boolean).join(" ") || "-");

const priceText = computed(() => {
  const price = Number(props.ingredient?.price);
  if (!Number.isFinite(price)) return "-";
  return formatCurrency(price);
});

const stepTags = computed(() => {
  const ids = Array.isArray(props.ingredient?.stepIds) ? props.ingredient.stepIds : [];
  return ids
    .map((stepId) => {
      const step = (props.steps || []).find((item) => item?.stepId === stepId);
      if (!step) return null;
      const orderPrefix = Number.isFinite(Number(step.order)) ? `${step.order}. ` : "";
      return `${orderPrefix}${step.title || stepTypeLabel(step.stepType)}`;
    })
    .filter(Boolean);
});

function stepTypeLabel(value) {
  return t(`recipes.step_types.${value || "custom"}`);
}

function formatCurrency(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "-";
  const localeCode = locale.value === "no" ? "nb-NO" : "en-US";
  return new Intl.NumberFormat(localeCode, {
    style: "currency",
    currency: "NOK",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
</script>
