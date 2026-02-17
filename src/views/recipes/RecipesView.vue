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

    <div v-else class="grid auto-rows-fr gap-4 md:grid-cols-2 xl:grid-cols-3">
      <router-link
        v-for="recipe in recipes"
        :key="recipe._id"
        :to="`/oppskrifter/${recipe._id}`"
        class="block h-full"
      >
        <BaseCard class="flex h-[280px] cursor-pointer flex-col gap-4 transition hover:scale-[1.01]">
          <div class="flex items-start gap-3">
            <img
              :src="recipeIcon(recipe)"
              :alt="recipe.name"
              class="h-14 w-14 rounded-lg border border-border3 bg-white p-2 object-contain"
            />
            <div class="min-w-0 flex-1">
              <h3 class="truncate text-xl font-semibold">{{ recipe.name }}</h3>
              <p class="text-sm opacity-80">{{ recipe.beerType || t("recipes.common.unknown_type") }}</p>
            </div>
            <span class="rounded-full bg-bg4 px-2 py-1 text-xs">v{{ recipe.version || 1 }}</span>
          </div>

          <div class="grid grid-cols-1 gap-1 text-sm opacity-90">
            <p>{{ t("recipes.metrics.abv") }}: <strong>{{ abvText(recipe) }}</strong></p>
            <p>{{ t("recipes.fields.beer_type") }}: <strong>{{ recipe.beerType || t("recipes.common.unknown_type") }}</strong></p>
          </div>

          <p class="flex-1 overflow-hidden text-sm opacity-85 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:4]">
            {{ recipe.flavorProfile || t("recipes.list.no_flavor_profile") }}
          </p>
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
import {
  ingredientCategoryOptions as buildIngredientCategoryOptions,
  resolveRecipeIconPath,
} from "@/utils/recipeAssets.js";

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

const ingredientCategoryOptions = computed(() => buildIngredientCategoryOptions(t));

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

function recipeIcon(recipe) {
  return resolveRecipeIconPath(recipe?.iconPath);
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
