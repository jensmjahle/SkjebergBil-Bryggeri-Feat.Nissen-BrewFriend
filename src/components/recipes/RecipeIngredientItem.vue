<template>
  <div
    class="border-t border-border3 py-2"
    :class="{ 'ingredient-item--clickable cursor-pointer rounded-md px-2 transition-colors hover:bg-bg4': clickable }"
    :role="clickable ? 'button' : undefined"
    :tabindex="clickable ? 0 : undefined"
    @click="selectIngredient"
    @keydown.enter="selectIngredient"
    @keydown.space.prevent="selectIngredient"
  >
    <div class="flex flex-wrap items-center justify-between gap-2">
      <div class="flex min-w-0 flex-1 items-center gap-2">
        <img
          :src="categoryIcon"
          :alt="categoryLabel"
          class="h-7 w-7 rounded-md border border-border3 bg-bg4 p-1 object-contain"
        />
        <h4 class="min-w-0 break-words"><BrewInlineText :model-value="shown.name" :editing="!!draft" :disabled="saving" :label="t('recipes.fields.name')" @update:model-value="draft.name = $event" /></h4>
      </div>
      <span v-if="!compact" class="rounded-full bg-bg4 text-text4 px-2 py-1 text-xs">{{ categoryLabel }}</span>
    </div>

    <p class="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm opacity-90">
      <span v-if="draft"><BrewInlineText v-model="draft.amount" editing :disabled="saving" :label="t('recipes.fields.amount')" /> <BrewInlineText v-model="draft.unit" editing :disabled="saving" :label="t('recipes.fields.unit')" /></span><span v-else>{{ amountText }}</span>
      <span v-if="!compact || ingredient.price != null" class="opacity-85">{{ t("recipes.fields.price") }}: <BrewInlineText v-if="draft" v-model="draft.price" editing type="number" :disabled="saving" :label="t('recipes.fields.price')" /><template v-else>{{ priceText }}</template></span>
    </p>
    <p v-if="(!compact && shown.notes) || draft" class="mt-1 text-sm opacity-80"><BrewInlineText :model-value="shown.notes" :editing="!!draft" :disabled="saving" multiline :label="t('recipes.fields.notes')" @update:model-value="draft.notes = $event" /></p>

    <div v-if="stepTags.length && !compact" class="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
      <span class="text-xs font-semibold uppercase opacity-70">{{ t("recipes.detail.used_in_steps") }}:</span>
      <span
        v-for="stepTag in stepTags"
        :key="`${ingredient?.ingredientId}-${stepTag}`"
        class="rounded-full border border-border3 px-2 py-1 text-xs"
      >
        {{ stepTag }}
      </span>
    </div>
  </div>
</template>

<script setup>
import BrewInlineText from "@/components/brews/BrewInlineText.vue";
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { ingredientCategoryIcon, ingredientCategoryLabel } from "@/utils/recipeAssets.js";

const props = defineProps({
  compact: Boolean,
  draft: { type: Object, default: null },
  saving: Boolean,
  ingredient: {
    type: Object,
    required: true,
  },
  steps: {
    type: Array,
    default: () => [],
  },
  clickable: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["select"]);

const { t, locale } = useI18n();

const shown = computed(() => props.draft || props.ingredient);
const categoryIcon = computed(() => ingredientCategoryIcon(props.ingredient?.category));
const categoryLabel = computed(() => ingredientCategoryLabel(t, props.ingredient?.category));
const amountText = computed(() => [props.ingredient?.amount, props.ingredient?.unit].filter(Boolean).join(" ") || "-");

const priceText = computed(() => {
  if (props.ingredient?.price == null || props.ingredient.price === "") return "-";
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

function selectIngredient() {
  if (props.clickable) emit("select");
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

<style scoped>
.ingredient-item--clickable:hover, .ingredient-item--clickable:hover h4, .ingredient-item--clickable:hover p { color: var(--color-text4); }
</style>
