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
                <h1 class="truncate">{{ recipe.name }}</h1>
                <p class="mt-1 opacity-80">{{ recipe.beerType || t("recipes.common.unknown_type") }}</p>
                <p class="text-xs opacity-70">v{{ recipe.version || 1 }}</p>
              </div>
            </div>
          </div>

          <div class="flex flex-wrap gap-2">
            <router-link :to="`/oppskrifter/${recipe._id}/rediger`">
              <BaseButton variant="button3">{{ t("recipes.detail.edit") }}</BaseButton>
            </router-link>
            <router-link :to="{ path: '/oppskrifter/ny', query: { copyFrom: recipe._id } }">
              <BaseButton variant="button2">{{ t("recipes.detail.copy") }}</BaseButton>
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
        <div class="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 text-sm">
          <div>{{ t("recipes.metrics.og") }}: {{ recipe.defaults?.ogFrom || '-' }} - {{ recipe.defaults?.ogTo || '-' }}</div>
          <div>{{ t("recipes.metrics.fg") }}: {{ recipe.defaults?.fgFrom || '-' }} - {{ recipe.defaults?.fgTo || '-' }}</div>
          <div>{{ t("recipes.metrics.co2") }}: {{ formatMetric(recipe.defaults?.co2Volumes) }}</div>
          <div>{{ t("recipes.metrics.ibu") }}: {{ formatMetric(recipe.defaults?.ibu) }}</div>
          <div>{{ t("recipes.fields.batch_size_liters") }}: {{ formatMetric(recipe.defaults?.batchSizeLiters) }}</div>
          <div>{{ t("recipes.metrics.abv") }}: {{ abvText }}</div>
        </div>
      </BaseCard>

      <BaseCard>
        <h3>{{ t("recipes.detail.cost_summary") }}</h3>
        <div class="mt-3 grid gap-2 sm:grid-cols-2 text-sm">
          <p>
            {{ t("recipes.detail.total_ingredients_cost") }}:
            <strong>{{ formatCurrency(totalIngredientCost) }}</strong>
          </p>
          <p>
            {{ t("recipes.detail.liter_price") }}:
            <strong>{{ literPrice !== null ? formatCurrency(literPrice) : "-" }}</strong>
          </p>
        </div>
      </BaseCard>

      <BaseCard>
        <h3>{{ t("recipes.detail.ingredients") }}</h3>
        <div class="mt-3 space-y-2">
          <div v-if="!recipe.ingredients?.length" class="text-sm opacity-70">{{ t("recipes.detail.no_ingredients") }}</div>
          <div v-for="ing in recipe.ingredients || []" :key="ing.ingredientId" class="border-t border-border3 py-2">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div class="flex items-center gap-2">
                <img :src="ingredientCategoryIcon(ing.category)" :alt="ingredientCategoryText(ing.category)" class="h-7 w-7 rounded-md border border-border3 bg-white p-1 object-contain" />
                <h4>{{ ing.name }}</h4>
              </div>
              <span class="rounded-full bg-bg4 text-text4 px-2 py-1 text-xs">{{ ingredientCategoryText(ing.category) }}</span>
            </div>
            <p class="mt-1 text-sm opacity-90">{{ [ing.amount, ing.unit].filter(Boolean).join(' ') || '-' }}</p>
            <p class="mt-1 text-sm opacity-85">
              {{ t("recipes.fields.price") }}: {{ ing.price !== null && ing.price !== undefined ? formatCurrency(ing.price) : "-" }}
            </p>
            <p v-if="ing.notes" class="mt-1 text-sm opacity-80">{{ ing.notes }}</p>
            <div v-if="ingredientStepTags(ing).length" class="mt-2 space-y-1">
              <p class="text-xs font-semibold uppercase opacity-70">{{ t("recipes.detail.used_in_steps") }}</p>
              <div class="mt-1 flex flex-wrap gap-2">
                <span
                  v-for="stepTag in ingredientStepTags(ing)"
                  :key="`${ing.ingredientId}-${stepTag}`"
                  class="rounded-full border border-border3 px-2 py-1 text-xs"
                >
                  {{ stepTag }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </BaseCard>

      <BaseCard>
        <h3>{{ t("recipes.detail.steps") }}</h3>
        <div class="mt-3 space-y-3">
          <div v-for="step in recipe.steps || []" :key="`${step.stepId}-${step.order}`" class="border-t border-border3 py-2">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <h4>{{ step.order }}. {{ step.title }}</h4>
              <span class="rounded-full bg-bg4 text-text4 px-2 py-1 text-xs">{{ stepTypeLabel(step.stepType) }}</span>
            </div>
            <p v-if="step.description" class="mt-2 whitespace-pre-line text-sm opacity-90">{{ step.description }}</p>
            <div class="mt-2 flex flex-wrap gap-4 text-xs opacity-80">
              <span v-if="step.temperatureC !== null && step.temperatureC !== undefined">{{ t("recipes.detail.temp") }}: {{ step.temperatureC }} °C</span>
              <span v-if="step.durationMinutes !== null && step.durationMinutes !== undefined">{{ t("recipes.detail.time") }}: {{ stepDurationLabel(step) }}</span>
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
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import BaseCard from "@/components/base/BaseCard.vue";
import BaseButton from "@/components/base/BaseButton.vue";
import BaseDropdown from "@/components/base/BaseDropdown.vue";
import {
  deleteRecipeFamily,
  deleteRecipeVersion,
  getRecipe,
  listRecipeVersions,
} from "@/services/recipes.service.js";
import { STEP_TYPE_OPTIONS } from "@/components/recipe-steps/index.js";
import {
  ingredientCategoryIcon,
  ingredientCategoryLabel,
  resolveRecipeIconPath,
} from "@/utils/recipeAssets.js";

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

function ingredientCategoryText(category) {
  return ingredientCategoryLabel(t, category);
}

function ingredientsForStep(stepId) {
  return (recipe.value?.ingredients || []).filter((ing) => (ing.stepIds || []).includes(stepId));
}

function ingredientStepTags(ingredient) {
  const ids = Array.isArray(ingredient?.stepIds) ? ingredient.stepIds : [];
  const allSteps = recipe.value?.steps || [];
  return ids
    .map((stepId) => {
      const step = allSteps.find((item) => item.stepId === stepId);
      if (!step) return null;
      const orderPrefix = Number.isFinite(Number(step.order)) ? `${step.order}. ` : "";
      return `${orderPrefix}${step.title || stepTypeLabel(step.stepType)}`;
    })
    .filter(Boolean);
}

function stepTypeLabel(value) {
  return t(`recipes.step_types.${value || "custom"}`);
}

function isDayBasedStep(step) {
  const type = step?.stepType || "";
  return type === "primary_fermentation" || type === "secondary_fermentation" || type === "cold_crash";
}

function stepDurationLabel(step) {
  const minutes = Number(step?.durationMinutes);
  if (!Number.isFinite(minutes) || minutes <= 0) return "-";
  if (isDayBasedStep(step)) {
    const days = minutes / 1440;
    return Number.isInteger(days) ? `${days} d` : `${days.toFixed(1)} d`;
  }
  return `${Math.round(minutes)} ${t("recipes.detail.minutes")}`;
}

function formatMetric(value) {
  return value === null || value === undefined || value === "" ? "-" : value;
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

async function loadRecipe() {
  loading.value = true;
  error.value = "";
  try {
    recipe.value = await getRecipe(route.params.recipeId);
    selectedVersionId.value = recipe.value?._id || "";
    await loadVersions(recipe.value?._id);
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

onMounted(loadRecipe);
</script>
