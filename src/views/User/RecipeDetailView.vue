<template>
  <section class="mx-auto w-full max-w-5xl px-4 py-8 space-y-6">
    <BaseCard v-if="loading">
      <p>{{ t("common.loading") }}</p>
    </BaseCard>

    <BaseCard v-else-if="error">
      <p class="text-red-600">{{ error }}</p>
    </BaseCard>

    <template v-else-if="recipe">
      <BaseCard>
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1>{{ recipe.name }}</h1>
            <p class="mt-1 opacity-80">{{ recipe.beerType || t("recipes.common.unknown_type") }}</p>
          </div>

          <div class="flex flex-wrap gap-2">
            <router-link :to="`/oppskrifter/${recipe._id}/rediger`">
              <BaseButton variant="button3">{{ t("recipes.detail.edit") }}</BaseButton>
            </router-link>
            <router-link :to="{ path: '/oppskrifter/ny', query: { copyFrom: recipe._id } }">
              <BaseButton variant="button2">{{ t("recipes.detail.copy") }}</BaseButton>
            </router-link>
          </div>
        </div>

        <router-link :to="{ path: '/brygg/nytt', query: { recipeId: recipe._id } }" class="mt-5 block">
          <BaseButton class="w-full py-3 text-base" variant="button1">{{ t("recipes.detail.start_brew") }}</BaseButton>
        </router-link>
      </BaseCard>

      <BaseCard v-if="resolvedImageSrc">
        <img :src="resolvedImageSrc" :alt="t('recipes.detail.image_alt')" class="max-h-72 rounded-lg border border-border3 object-cover" />
      </BaseCard>

      <BaseCard v-if="recipe.flavorProfile">
        <h3>{{ t("recipes.detail.flavor_profile") }}</h3>
        <p class="mt-2 whitespace-pre-line">{{ recipe.flavorProfile }}</p>
      </BaseCard>

      <BaseCard>
        <h3>{{ t("recipes.detail.defaults") }}</h3>
        <div class="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 text-sm">
          <div>{{ t("recipes.metrics.og") }}: {{ recipe.defaults?.ogFrom || '-' }} - {{ recipe.defaults?.ogTo || '-' }}</div>
          <div>{{ t("recipes.metrics.fg") }}: {{ recipe.defaults?.fgFrom || '-' }} - {{ recipe.defaults?.fgTo || '-' }}</div>
          <div>{{ t("recipes.metrics.co2") }}: {{ formatMetric(recipe.defaults?.co2Volumes) }}</div>
          <div>{{ t("recipes.metrics.ibu") }}: {{ formatMetric(recipe.defaults?.ibu) }}</div>
          <div>{{ t("recipes.metrics.abv") }}: {{ abvText }}</div>
        </div>
      </BaseCard>

      <BaseCard>
        <h3>{{ t("recipes.detail.ingredients") }}</h3>
        <div class="mt-3 space-y-2">
          <div v-if="!recipe.ingredients?.length" class="text-sm opacity-70">{{ t("recipes.detail.no_ingredients") }}</div>
          <div v-for="ing in recipe.ingredients || []" :key="ing.ingredientId" class="rounded-lg border border-border3 p-3">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <h4>{{ ing.name }}</h4>
              <span class="rounded-full bg-bg4 px-2 py-1 text-xs">{{ ingredientCategoryLabel(ing.category) }}</span>
            </div>
            <p class="mt-1 text-sm opacity-90">{{ [ing.amount, ing.unit].filter(Boolean).join(' ') || '-' }}</p>
            <p v-if="ing.notes" class="mt-1 text-sm opacity-80">{{ ing.notes }}</p>
          </div>
        </div>
      </BaseCard>

      <BaseCard>
        <h3>{{ t("recipes.detail.steps") }}</h3>
        <div class="mt-3 space-y-3">
          <div v-for="step in recipe.steps || []" :key="`${step.stepId}-${step.order}`" class="rounded-lg border border-border3 p-3">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <h4>{{ step.order }}. {{ step.title }}</h4>
              <span class="rounded-full bg-bg4 px-2 py-1 text-xs">{{ stepTypeLabel(step.stepType) }}</span>
            </div>
            <p v-if="step.description" class="mt-2 text-sm opacity-90">{{ step.description }}</p>
            <div class="mt-2 flex flex-wrap gap-4 text-xs opacity-80">
              <span v-if="step.temperatureC !== null && step.temperatureC !== undefined">{{ t("recipes.detail.temp") }}: {{ step.temperatureC }} °C</span>
              <span v-if="step.durationMinutes !== null && step.durationMinutes !== undefined">{{ t("recipes.detail.time") }}: {{ step.durationMinutes }} {{ t("recipes.detail.minutes") }}</span>
              <span v-if="step.co2Volumes !== null && step.co2Volumes !== undefined">{{ t("recipes.metrics.co2") }}: {{ step.co2Volumes }}</span>
            </div>

            <div class="mt-3" v-if="ingredientsForStep(step.stepId).length">
              <p class="text-xs font-semibold uppercase opacity-70">{{ t("recipes.detail.ingredients_in_step") }}</p>
              <div class="mt-1 flex flex-wrap gap-2">
                <span
                  v-for="ing in ingredientsForStep(step.stepId)"
                  :key="`${step.stepId}-${ing.ingredientId}`"
                  class="rounded-full border border-border3 px-2 py-1 text-xs"
                >
                  {{ ing.name }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </BaseCard>
    </template>
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import { useI18n } from "vue-i18n";
import BaseCard from "@/components/base/BaseCard.vue";
import BaseButton from "@/components/base/BaseButton.vue";
import { getRecipe } from "@/services/recipes.service.js";
import { STEP_TYPE_OPTIONS } from "@/components/recipe-steps/index.js";

const route = useRoute();
const { t } = useI18n();
const loading = ref(true);
const error = ref("");
const recipe = ref(null);

const resolvedImageSrc = computed(() => {
  const url = recipe.value?.imageUrl;
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  const base = window.env?.VITE_API_URL || "http://localhost:3000";
  return `${base}${url}`;
});

const abvText = computed(() => {
  const d = recipe.value?.defaults || {};
  const ogFrom = Number(d.ogFrom);
  const ogTo = Number(d.ogTo);
  const fgFrom = Number(d.fgFrom);
  const fgTo = Number(d.fgTo);
  if (!Number.isFinite(ogFrom) || !Number.isFinite(ogTo) || !Number.isFinite(fgFrom) || !Number.isFinite(fgTo)) {
    return "-";
  }
  const min = Math.max(0, (ogFrom - fgTo) * 131.25);
  const max = Math.max(0, (ogTo - fgFrom) * 131.25);
  return `${min.toFixed(2)}% - ${max.toFixed(2)}%`;
});

function ingredientCategoryLabel(category) {
  if (category === "fermentable") return t("recipes.ingredient_category.fermentable");
  if (category === "hops") return t("recipes.ingredient_category.hops");
  return t("recipes.ingredient_category.other");
}

function ingredientsForStep(stepId) {
  return (recipe.value?.ingredients || []).filter((ing) => (ing.stepIds || []).includes(stepId));
}

function stepTypeLabel(value) {
  return t(`recipes.step_types.${value || "custom"}`);
}

function formatMetric(value) {
  return value === null || value === undefined || value === "" ? "-" : value;
}

async function loadRecipe() {
  loading.value = true;
  error.value = "";
  try {
    recipe.value = await getRecipe(route.params.recipeId);
  } catch (err) {
    error.value = err?.response?.data?.error || err?.message || t("recipes.errors.fetch_failed");
  } finally {
    loading.value = false;
  }
}

onMounted(loadRecipe);
</script>
