<template>
  <div class="space-y-6">
    <section
      v-for="group in groups"
      :key="group.category"
      :aria-label="ingredientCategoryLabel(t, group.category)"
    >
      <h3 class="mb-1 flex items-center gap-2 text-sm">
        <img
          :src="ingredientCategoryIcon(group.category)"
          alt=""
          class="h-5 w-5 object-contain"
        />{{ ingredientCategoryLabel(t, group.category)
        }}<span class="ml-auto text-xs font-normal text-text2-faded">{{
          group.items.length
        }}</span>
      </h3>
      <ul>
        <li
          v-for="item in group.items"
          :key="item.ingredientId"
          class="recipe-ingredient-row"
        >
          <div class="min-w-0">
            <p class="break-words font-medium">{{ item.name }}</p>
            <p
              v-if="item.notes"
              class="mt-1 whitespace-pre-line text-xs text-text2-faded"
            >
              {{ item.notes }}
            </p>
            <p v-if="stepNames(item)" class="mt-1 text-xs text-text2-faded">
              {{ stepNames(item) }}
            </p>
          </div>
          <span class="text-right text-sm tabular-nums"
            ><span class="block">{{ amountText(item) }}</span
            ><span
              v-if="hasPrice(item)"
              class="mt-1 block text-xs text-text2-faded"
              >{{ priceText(item.price) }}</span
            ></span
          >
        </li>
      </ul>
    </section>
    <p v-if="!groups.length" class="text-sm text-text2-faded">
      {{ t("recipes.detail.no_ingredients") }}
    </p>
  </div>
</template>
<script setup>
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import {
  ingredientCategoryIcon,
  ingredientCategoryLabel,
} from "@/utils/recipeAssets.js";
const props = defineProps({
  ingredients: { type: Array, default: () => [] },
  steps: { type: Array, default: () => [] },
});
const { t, locale } = useI18n();
const localeCode = () => (locale.value === "no" ? "nb-NO" : locale.value);
function amountText(item) {
  const raw = String(item.amount ?? "").trim();
  const amount = /^\d+(?:[.,]\d+)?$/.test(raw)
    ? new Intl.NumberFormat(localeCode(), { maximumFractionDigits: 10 }).format(
        Number(raw.replace(",", ".")),
      )
    : raw;
  return [amount, item.unit].filter(Boolean).join(" ") || "—";
}
const hasPrice = (item) =>
  item.price != null &&
  item.price !== "" &&
  Number.isFinite(Number(item.price)) &&
  Number(item.price) >= 0;
const priceText = (price) =>
  new Intl.NumberFormat(localeCode(), {
    style: "currency",
    currency: "NOK",
  }).format(Number(price));
const groups = computed(() =>
  ["fermentable", "hops", "yeast", "other"]
    .map((category) => ({
      category,
      items: props.ingredients.filter(
        (item) =>
          (["fermentable", "hops", "yeast"].includes(item.category)
            ? item.category
            : "other") === category,
      ),
    }))
    .filter((group) => group.items.length),
);
const stepNames = (item) =>
  props.steps
    .filter((step) => item.stepIds?.includes(step.stepId))
    .map((step) => step.title)
    .join(" · ");
</script>
<style scoped>
.recipe-ingredient-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(4rem, auto);
  gap: 16px;
  padding: 13px 0;
  border-top: 1px solid var(--color-border3);
  font-size: 14px;
}
.recipe-ingredient-row > span {
  max-width: 9rem;
  overflow-wrap: anywhere;
}
</style>
