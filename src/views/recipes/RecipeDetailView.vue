<template>
  <section class="mx-auto w-full max-w-5xl px-4 py-2 md:py-8 space-y-2 md:space-y-6">
    <BaseCard v-if="loading">
      <p>{{ t("common.loading") }}</p>
    </BaseCard>

    <BaseCard v-else-if="error">
      <p class="text-red-600">{{ error }}</p>
    </BaseCard>

    <template v-else-if="recipe">
      <BaseCard>
        <div class="flex flex-wrap items-start justify-between gap-2">
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-3">
              <img :src="recipeIcon" :alt="recipe.name" class="h-14 w-14 rounded-lg border border-border3 bg-white p-2 object-contain" />
              <div class="min-w-0">
                <h1 class="truncate text-xl sm:text-3xl">{{ recipe.name }}</h1>
                <p class="mt-1 opacity-80">{{ recipe.beerType || t("recipes.common.unknown_type") }}</p>
                <p class="text-xs opacity-70">v{{ recipe.version || 1 }}</p>
              </div>
            </div>
          </div>

          <div class="hidden flex-wrap gap-2 sm:flex">
            <router-link :to="`/oppskrifter/${recipe._id}/rediger`">
              <BaseButton variant="button3">{{ t("recipes.detail.edit") }}</BaseButton>
            </router-link>
            <router-link :to="{ path: '/oppskrifter/ny', query: { copyFrom: recipe._id } }">
              <BaseButton variant="button2">{{ t("recipes.detail.copy") }}</BaseButton>
            </router-link>
            <router-link :to="{ path: `/oppskrifter/${recipe._id}/rediger`, query: { nyVersjon: '1' } }">
              <BaseButton variant="button2">{{ t("recipes.detail.new_version") }}</BaseButton>
            </router-link>
            <BaseButton
              type="button"
              variant="button4"
              :disabled="deletingVersion || deletingFamily"
              @click="deleteCurrentVersion"
            >
              {{ deletingVersion ? t("common.loading") : t("recipes.actions.delete_version") }}
            </BaseButton>
            <BaseButton
              type="button"
              variant="button4"
              :disabled="deletingVersion || deletingFamily"
              @click="deleteAllVersions"
            >
              {{ deletingFamily ? t("common.loading") : t("recipes.actions.delete_recipe") }}
            </BaseButton>
          </div>

          <div ref="actionMenuRoot" class="relative sm:hidden">
            <BaseButton
              class="flex items-center justify-center"
              variant="button3"
              :icon="EllipsisVertical"
              icon-position="left"
              :aria-label="t('recipes.detail.actions_menu')"
              :aria-expanded="actionMenuOpen"
              @click.stop="actionMenuOpen = !actionMenuOpen"
            />
            <div
              v-if="actionMenuOpen"
              class="absolute right-0 top-full z-30 mt-1 min-w-[12rem] rounded-lg border border-border3 bg-bg2 p-1 shadow-lg"
            >
              <router-link
                :to="`/oppskrifter/${recipe._id}/rediger`"
                class="block rounded-md px-3 py-2 text-sm hover:bg-bg4"
                @click="actionMenuOpen = false"
              >
                {{ t("recipes.detail.edit") }}
              </router-link>
              <router-link
                :to="{ path: '/oppskrifter/ny', query: { copyFrom: recipe._id } }"
                class="block rounded-md px-3 py-2 text-sm hover:bg-bg4"
                @click="actionMenuOpen = false"
              >
                {{ t("recipes.detail.copy") }}
              </router-link>
              <router-link
                :to="{ path: `/oppskrifter/${recipe._id}/rediger`, query: { nyVersjon: '1' } }"
                class="block rounded-md px-3 py-2 text-sm hover:bg-bg4"
                @click="actionMenuOpen = false"
              >
                {{ t("recipes.detail.new_version") }}
              </router-link>
              <button
                type="button"
                class="w-full rounded-md px-3 py-2 text-left text-sm text-red-600 hover:bg-bg4 disabled:opacity-50"
                :disabled="deletingVersion || deletingFamily"
                @click="runMenuAction(deleteCurrentVersion)"
              >
                {{ deletingVersion ? t("common.loading") : t("recipes.actions.delete_version") }}
              </button>
              <button
                type="button"
                class="w-full rounded-md px-3 py-2 text-left text-sm text-red-600 hover:bg-bg4 disabled:opacity-50"
                :disabled="deletingVersion || deletingFamily"
                @click="runMenuAction(deleteAllVersions)"
              >
                {{ deletingFamily ? t("common.loading") : t("recipes.actions.delete_recipe") }}
              </button>
            </div>
          </div>
        </div>

        <div v-if="versionOptions.length > 1" class="mt-4 max-w-sm">
          <BaseDropdown
            v-model="selectedVersionId"
            :label="t('recipes.detail.version')"
            :options="versionOptions"
            @update:model-value="switchVersion"
          />
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
        <RecipeDefaultsSummary :defaults="recipe.defaults" :abv-text="abvText" :show-abv="true" />
      </BaseCard>

      <BaseCard>
        <h3>{{ t("recipes.detail.cost_summary") }}</h3>
        <RecipeCostSummary
          :total-cost-text="formatCurrency(totalIngredientCost)"
          :liter-price-text="literPrice !== null ? formatCurrency(literPrice) : '-'"
        />
      </BaseCard>

      <BaseToggle
        class="sm:hidden"
        :model-value="activePanel"
        :options="panelToggleOptions"
        :full-width="true"
        @update:model-value="activePanel = $event"
      />

      <BaseCard :class="panelClass('brews')">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3>{{ t("recipes.detail.brew_history") }}</h3>
            <p class="mt-1 text-sm opacity-70">
              {{ t("recipes.detail.brew_history_hint", { version: recipe.version || 1 }) }}
            </p>
          </div>
          <div class="text-right">
            <BaseStarRating
              :model-value="activeVersionRating.average"
              :count="activeVersionRating.count"
              :readonly="true"
              :size="22"
              :show-value="true"
              :empty-text="t('recipes.detail.not_rated')"
              :aria-label="t('recipes.detail.version_rating')"
            />
            <p class="mt-1 text-xs opacity-70">
              {{ t("recipes.detail.rating_from_brews", { count: activeVersionRating.count }) }}
            </p>
          </div>
        </div>

        <div class="mt-4 space-y-2">
          <p v-if="brewHistoryError" class="text-sm text-red-600">{{ brewHistoryError }}</p>
          <p v-else-if="loadingBrewHistory" class="text-sm opacity-70">{{ t("common.loading") }}</p>
          <p v-else-if="!brewHistory.length" class="text-sm opacity-70">
            {{ t("recipes.detail.no_brews") }}
          </p>

          <div v-else class="space-y-2">
          <router-link
            v-for="brew in brewHistory"
            :key="brew._id"
            :to="`/brygg/${brew._id}`"
            class="block rounded-lg border border-border3 p-3 transition hover:border-border2"
          >
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div class="min-w-0">
                <p class="truncate font-medium">{{ brew.name || t("recipes.detail.untitled_brew") }}</p>
                <p class="text-xs opacity-70">
                  {{ formatDate(brew.brewedAt) }}
                  <span v-if="brew.version"> &middot; v{{ brew.version }}</span>
                </p>
              </div>
              <BaseStarRating
                :model-value="brew.rating"
                :readonly="true"
                :size="16"
                :show-value="true"
                :empty-text="t('recipes.detail.not_rated')"
                :aria-label="t('recipes.detail.brew_rating')"
              />
            </div>
            <p v-if="brew.note" class="mt-2 whitespace-pre-line text-sm opacity-85">{{ brew.note }}</p>
          </router-link>
          </div>
        </div>
      </BaseCard>

      <BaseCard :class="panelClass('ingredients')">
        <h3>{{ t("recipes.detail.ingredients") }}</h3>
        <div class="mt-3 space-y-2">
          <div v-if="!recipe.ingredients?.length" class="text-sm opacity-70">{{ t("recipes.detail.no_ingredients") }}</div>
          <RecipeIngredientItem
            v-for="ing in recipe.ingredients || []"
            :key="ing.ingredientId"
            :ingredient="ing"
            :steps="recipe.steps || []"
          />
        </div>
      </BaseCard>

      <BaseCard :class="panelClass('steps')">
        <h3>{{ t("recipes.detail.steps") }}</h3>
        <div class="mt-3 space-y-3">
          <RecipeStepItem
            v-for="step in recipe.steps || []"
            :key="`${step.stepId}-${step.order}`"
            :step="step"
            :ingredients="recipe.ingredients || []"
          />
        </div>
      </BaseCard>
    </template>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import BaseCard from "@/components/base/BaseCard.vue";
import BaseButton from "@/components/base/BaseButton.vue";
import BaseDropdown from "@/components/base/BaseDropdown.vue";
import BaseToggle from "@/components/base/BaseToggle.vue";
import { EllipsisVertical } from "lucide-vue-next";
import RecipeDefaultsSummary from "@/components/recipes/RecipeDefaultsSummary.vue";
import RecipeCostSummary from "@/components/recipes/RecipeCostSummary.vue";
import RecipeIngredientItem from "@/components/recipes/RecipeIngredientItem.vue";
import RecipeStepItem from "@/components/recipes/RecipeStepItem.vue";
import BaseStarRating from "@/components/base/BaseStarRating.vue";
import {
  deleteRecipeFamily,
  deleteRecipeVersion,
  getRecipe,
  listRecipeBrews,
  listRecipeVersions,
} from "@/services/recipes.service.js";
import { resolveRecipeIconPath } from "@/utils/recipeAssets.js";

const route = useRoute();
const router = useRouter();
const { t, locale } = useI18n();
const loading = ref(true);
const error = ref("");
const recipe = ref(null);
const versionOptions = ref([]);
const versionDocs = ref([]);
const selectedVersionId = ref("");
const deletingVersion = ref(false);
const deletingFamily = ref(false);
const activePanel = ref("steps");
const actionMenuOpen = ref(false);
const actionMenuRoot = ref(null);
const brewHistory = ref([]);
const loadingBrewHistory = ref(false);
const brewHistoryError = ref("");

const panelToggleOptions = computed(() => [
  { label: t("recipes.detail.steps"), value: "steps" },
  { label: t("recipes.detail.ingredients"), value: "ingredients" },
  { label: t("recipes.detail.brews_tab"), value: "brews" },
]);

function runMenuAction(action) {
  actionMenuOpen.value = false;
  return action();
}

function handleDocumentClick(event) {
  if (!actionMenuOpen.value) return;
  const root = actionMenuRoot.value;
  if (!root) return;
  if (event?.target instanceof Node && !root.contains(event.target)) {
    actionMenuOpen.value = false;
  }
}

// The toggle only governs the narrow layout - from the sm breakpoint up, all
// three panels are shown at once and the toggle is hidden.
function panelClass(panel) {
  return activePanel.value === panel ? "" : "hidden sm:block";
}

// The rating shown at the top is the one for the version currently being
// viewed - the average of every brew made from it.
const activeVersionRating = computed(() => {
  const rating = recipe.value?.rating;
  return {
    average: Number.isFinite(Number(rating?.average)) ? Number(rating.average) : null,
    count: Number(rating?.count) || 0,
  };
});

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString(locale.value === "no" ? "nb-NO" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

async function loadBrewHistory(recipeId) {
  if (!recipeId) {
    brewHistory.value = [];
    return;
  }

  loadingBrewHistory.value = true;
  brewHistoryError.value = "";
  try {
    const brews = await listRecipeBrews(recipeId);
    brewHistory.value = Array.isArray(brews) ? brews : [];
  } catch (err) {
    brewHistory.value = [];
    brewHistoryError.value =
      err?.response?.data?.error || err?.message || t("recipes.errors.fetch_failed");
  } finally {
    loadingBrewHistory.value = false;
  }
}

const resolvedImageSrc = computed(() => {
  const url = recipe.value?.imageUrl;
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  const base = window.env?.VITE_API_URL || "http://localhost:3000";
  return `${base}${url}`;
});

const recipeIcon = computed(() => resolveRecipeIconPath(recipe.value?.iconPath));

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

const totalIngredientCost = computed(() => {
  const backendTotal = Number(recipe.value?.costSummary?.totalIngredientCost);
  if (Number.isFinite(backendTotal)) return backendTotal;
  return (recipe.value?.ingredients || []).reduce((sum, ingredient) => {
    const price = Number(ingredient?.price);
    if (!Number.isFinite(price) || price < 0) return sum;
    return sum + price;
  }, 0);
});

const literPrice = computed(() => {
  const backendLiterPrice = Number(recipe.value?.costSummary?.literPrice);
  if (Number.isFinite(backendLiterPrice)) return backendLiterPrice;
  const liters = Number(recipe.value?.defaults?.batchSizeLiters);
  if (!Number.isFinite(liters) || liters <= 0) return null;
  return totalIngredientCost.value / liters;
});

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

async function loadRecipe() {
  loading.value = true;
  error.value = "";
  try {
    recipe.value = await getRecipe(route.params.recipeId);
    selectedVersionId.value = recipe.value?._id || "";
    await loadVersions(recipe.value?._id);
    await loadBrewHistory(recipe.value?._id);
  } catch (err) {
    error.value = err?.response?.data?.error || err?.message || t("recipes.errors.fetch_failed");
    versionOptions.value = [];
  } finally {
    loading.value = false;
  }
}

async function loadVersions(recipeId) {
  if (!recipeId) {
    versionOptions.value = [];
    versionDocs.value = [];
    return;
  }

  try {
    const versions = await listRecipeVersions(recipeId);
    versionDocs.value = Array.isArray(versions) ? versions : [];
    versionOptions.value = (versions || []).map((versionDoc) => {
      const labelParts = [`v${versionDoc.version || 1}`];
      if (versionDoc.isLatest) labelParts.push(t("recipes.detail.latest"));
      if (versionDoc.updatedAt) {
        labelParts.push(new Date(versionDoc.updatedAt).toLocaleDateString());
      }
      return {
        label: labelParts.join(" - "),
        value: versionDoc._id,
      };
    });
  } catch (_err) {
    versionOptions.value = [];
    versionDocs.value = [];
  }
}

async function switchVersion(recipeId) {
  if (!recipeId || String(recipeId) === String(route.params.recipeId)) return;
  await router.push(`/oppskrifter/${recipeId}`);
}

function nextVersionAfterDelete(currentId) {
  const remaining = (versionDocs.value || []).filter(
    (versionDoc) => String(versionDoc?._id || "") !== String(currentId || ""),
  );
  if (!remaining.length) return null;
  const latest = remaining.find((versionDoc) => versionDoc?.isLatest);
  if (latest?._id) return latest;
  return [...remaining].sort((a, b) => Number(b?.version || 1) - Number(a?.version || 1))[0];
}

async function deleteCurrentVersion() {
  if (!recipe.value?._id) return;
  const version = recipe.value?.version || 1;
  const confirmed = window.confirm(
    t("recipes.detail.confirm_delete_version", { version }),
  );
  if (!confirmed) return;

  deletingVersion.value = true;
  error.value = "";
  try {
    const currentId = recipe.value._id;
    const nextVersion = nextVersionAfterDelete(currentId);
    await deleteRecipeVersion(currentId);
    if (!nextVersion?._id) {
      await router.push("/oppskrifter");
      return;
    }
    await router.push(`/oppskrifter/${nextVersion._id}`);
  } catch (err) {
    error.value = err?.response?.data?.error || err?.message || t("recipes.errors.update_failed");
  } finally {
    deletingVersion.value = false;
  }
}

async function deleteAllVersions() {
  if (!recipe.value?._id) return;
  const confirmed = window.confirm(t("recipes.detail.confirm_delete_recipe"));
  if (!confirmed) return;

  deletingFamily.value = true;
  error.value = "";
  try {
    await deleteRecipeFamily(recipe.value._id);
    await router.push("/oppskrifter");
  } catch (err) {
    error.value = err?.response?.data?.error || err?.message || t("recipes.errors.update_failed");
  } finally {
    deletingFamily.value = false;
  }
}

watch(
  () => route.params.recipeId,
  () => {
    loadRecipe();
  },
);

onMounted(() => {
  document.addEventListener("click", handleDocumentClick);
  loadRecipe();
});

onBeforeUnmount(() => {
  document.removeEventListener("click", handleDocumentClick);
});
</script>
