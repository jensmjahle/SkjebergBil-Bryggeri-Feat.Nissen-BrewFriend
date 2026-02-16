<template>
  <section class="mx-auto w-full max-w-6xl px-4 py-8 space-y-6">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1>{{ t("recipes.list.title") }}</h1>
          <p class="mt-2 opacity-80">{{ t("recipes.list.subtitle") }}</p>
        </div>
        <router-link to="/oppskrifter/ny">
          <BaseButton>{{ t("recipes.list.new_recipe") }}</BaseButton>
        </router-link>
      </div>

    <BaseCard class="sm:hidden">
      <form class="flex items-end gap-2" @submit.prevent="loadRecipes">
        <div class="flex-1">
          <BaseInput
            v-model="filters.q"
            :label="t('recipes.filters.search')"
            :placeholder="t('recipes.filters.search_placeholder')"
          />
        </div>
        <BaseButton type="button" variant="button3" @click="mobileFiltersOpen = true">
          {{ t("common.filter") }}
        </BaseButton>
        <BaseButton type="submit" :disabled="loading">
          {{ loading ? t("common.loading") : t("common.search") }}
        </BaseButton>
      </form>
    </BaseCard>

    <BaseCard class="hidden sm:block">
      <form class="grid gap-4 md:grid-cols-2 xl:grid-cols-6" @submit.prevent="loadRecipes">
        <BaseInput v-model="filters.q" :label="t('recipes.filters.search')" :placeholder="t('recipes.filters.search_placeholder')" />
        <BaseDropdown v-model="filters.beerType" :label="t('recipes.filters.beer_type')" :options="beerTypeOptions" :placeholder="t('common.all')" />
        <BaseDropdown v-model="filters.stepType" :label="t('recipes.filters.step_type')" :options="stepTypeOptions" :placeholder="t('common.all')" />
        <BaseDropdown v-model="filters.ingredientCategory" :label="t('recipes.filters.ingredient_category')" :options="ingredientCategoryOptions" :placeholder="t('common.all')" />
        <BaseDropdown v-model="filters.hasDefaults" :label="t('recipes.filters.defaults')" :options="defaultsOptions" :placeholder="t('common.all')" />
        <BaseDropdown v-model="filters.sort" :label="t('recipes.filters.sort')" :options="sortOptions" :placeholder="t('recipes.sort.newest')" />

        <div class="xl:col-span-6 flex flex-wrap gap-3">
          <BaseButton type="submit" :disabled="loading">{{ loading ? t("common.loading") : t("common.search") }}</BaseButton>
          <BaseButton type="button" variant="button3" :disabled="loading" @click="resetFilters">{{ t("common.reset") }}</BaseButton>
        </div>
      </form>
    </BaseCard>

    <RecipeFiltersModal
      :open="mobileFiltersOpen"
      :filters="filters"
      :beer-type-options="beerTypeOptions"
      :step-type-options="stepTypeOptions"
      :ingredient-category-options="ingredientCategoryOptions"
      :defaults-options="defaultsOptions"
      :sort-options="sortOptions"
      @close="mobileFiltersOpen = false"
      @reset="resetFilters"
      @apply="applyMobileFilters"
    />

    <div v-if="error" class="rounded-xl border border-danger-border bg-danger p-4 text-text1">{{ error }}</div>

    <BaseCard>
      <p class="text-sm opacity-80">{{ t("recipes.list.found", { count: recipes.length }) }}</p>
    </BaseCard>

    <div v-if="!loading && !recipes.length" class="rounded-xl border border-dashed border-border3 p-8 text-center opacity-70">
      {{ t("recipes.list.no_results") }}
    </div>

    <div v-else class="grid gap-4 md:grid-cols-2">
      <router-link v-for="recipe in recipes" :key="recipe._id" :to="`/oppskrifter/${recipe._id}`" class="block">
        <BaseCard class="space-y-3 cursor-pointer transition hover:scale-[1.01]">
          <div class="flex items-start justify-between gap-3">
            <div>
              <h3>{{ recipe.name }}</h3>
              <p class="text-sm opacity-80">{{ recipe.beerType || t("recipes.common.unknown_type") }}</p>
            </div>
            <span class="rounded-full bg-bg4 px-2 py-1 text-xs">{{ t("recipes.common.step_count", { count: recipe.steps?.length || 0 }) }}</span>
          </div>

          <p v-if="recipe.flavorProfile" class="text-sm opacity-90">{{ recipe.flavorProfile }}</p>

          <div class="grid grid-cols-2 gap-2 text-sm">
            <div>{{ t("recipes.metrics.og") }}: {{ recipe.defaults?.ogFrom || '-' }} - {{ recipe.defaults?.ogTo || '-' }}</div>
            <div>{{ t("recipes.metrics.fg") }}: {{ recipe.defaults?.fgFrom || '-' }} - {{ recipe.defaults?.fgTo || '-' }}</div>
            <div>{{ t("recipes.metrics.co2") }}: {{ formatMetric(recipe.defaults?.co2Volumes) }}</div>
            <div>{{ t("recipes.metrics.ibu") }}: {{ formatMetric(recipe.defaults?.ibu) }}</div>
            <div class="col-span-2">{{ t("recipes.metrics.abv") }}: {{ abvText(recipe) }}</div>
          </div>

          <div class="flex flex-wrap gap-2">
            <span v-for="step in recipe.steps || []" :key="`${recipe._id}-${step.stepId || step.order}`" class="rounded-full border border-border3 px-2 py-1 text-xs">
              {{ stepTypeLabel(step.stepType) }}
            </span>
          </div>
        </BaseCard>
      </router-link>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import { useI18n } from "vue-i18n";
import { listRecipes } from "@/services/recipes.service.js";
import BaseCard from "@/components/base/BaseCard.vue";
import BaseInput from "@/components/base/BaseInput.vue";
import BaseDropdown from "@/components/base/BaseDropdown.vue";
import BaseButton from "@/components/base/BaseButton.vue";
import RecipeFiltersModal from "@/components/modals/RecipeFiltersModal.vue";
import { STEP_TYPE_OPTIONS } from "@/components/recipe-steps/index.js";

const { t } = useI18n();
const loading = ref(false);
const error = ref("");
const recipes = ref([]);
const mobileFiltersOpen = ref(false);

const filters = reactive({
  q: "",
  beerType: "",
  stepType: "",
  ingredientCategory: "",
  hasDefaults: "",
  sort: "newest",
});

const beerTypeOptions = computed(() => [
  { label: "IPA", value: "IPA" },
  { label: "Pale Ale", value: "Pale Ale" },
  { label: "Lager", value: "Lager" },
  { label: "Pilsner", value: "Pilsner" },
  { label: "Stout", value: "Stout" },
  { label: "Porter", value: "Porter" },
  { label: "Wheat", value: "Wheat" },
  { label: "Sour", value: "Sour" },
  { label: t("recipes.beer_type.other"), value: "Annet" },
]);

const stepTypeOptions = computed(() =>
  STEP_TYPE_OPTIONS.map((step) => ({ label: t(`recipes.step_types.${step.value}`), value: step.value })),
);

const ingredientCategoryOptions = computed(() => [
  { label: t("recipes.ingredient_category.fermentable"), value: "fermentable" },
  { label: t("recipes.ingredient_category.hops"), value: "hops" },
  { label: t("recipes.ingredient_category.other"), value: "other" },
]);

const defaultsOptions = computed(() => [
  { label: t("recipes.filters.has_defaults"), value: "true" },
  { label: t("recipes.filters.no_defaults"), value: "false" },
]);

const sortOptions = computed(() => [
  { label: t("recipes.sort.newest"), value: "newest" },
  { label: t("recipes.sort.oldest"), value: "oldest" },
  { label: t("recipes.sort.name_asc"), value: "name_asc" },
  { label: t("recipes.sort.name_desc"), value: "name_desc" },
  { label: t("recipes.sort.steps_desc"), value: "steps_desc" },
]);

function stepTypeLabel(value) {
  return t(`recipes.step_types.${value || "custom"}`);
}

function formatMetric(value) {
  return value === null || value === undefined || value === "" ? "-" : value;
}

function abvText(recipe) {
  const d = recipe?.defaults || {};
  const ogFrom = Number(d.ogFrom);
  const ogTo = Number(d.ogTo);
  const fgFrom = Number(d.fgFrom);
  const fgTo = Number(d.fgTo);
  if (!Number.isFinite(ogFrom) || !Number.isFinite(ogTo) || !Number.isFinite(fgFrom) || !Number.isFinite(fgTo)) {
    return recipe?.abvRange ? `${recipe.abvRange.min}% - ${recipe.abvRange.max}%` : "-";
  }
  const min = Math.max(0, (ogFrom - fgTo) * 131.25);
  const max = Math.max(0, (ogTo - fgFrom) * 131.25);
  return `${min.toFixed(2)}% - ${max.toFixed(2)}%`;
}

async function loadRecipes() {
  loading.value = true;
  error.value = "";

  try {
    const params = {
      q: filters.q || undefined,
      beerType: filters.beerType || undefined,
      stepType: filters.stepType || undefined,
      ingredientCategory: filters.ingredientCategory || undefined,
      hasDefaults: filters.hasDefaults || undefined,
      sort: filters.sort || undefined,
    };
    recipes.value = await listRecipes(params);
  } catch (err) {
    error.value = err?.response?.data?.error || err?.message || t("recipes.errors.fetch_failed");
  } finally {
    loading.value = false;
  }
}

function resetFilters() {
  filters.q = "";
  filters.beerType = "";
  filters.stepType = "";
  filters.ingredientCategory = "";
  filters.hasDefaults = "";
  filters.sort = "newest";
  mobileFiltersOpen.value = false;
  loadRecipes();
}

function applyMobileFilters() {
  mobileFiltersOpen.value = false;
  loadRecipes();
}

onMounted(loadRecipes);
</script>
