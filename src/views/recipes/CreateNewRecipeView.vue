<template>
  <section class="mx-auto w-full max-w-5xl px-4 py-8">
    <BaseCard>
      <div class="mb-6">
        <h1>{{ t("recipes.create.title") }}</h1>
        <p class="mt-2 opacity-80">{{ t("recipes.create.subtitle") }}</p>
        <p v-if="isPrefillingCopy" class="mt-2 text-sm opacity-70">{{ t("recipes.create.copy_loading") }}</p>
      </div>

      <form class="space-y-6" @submit.prevent="handleSubmit">
        <div class="grid gap-4 md:grid-cols-2">
          <BaseInput v-model="form.name" :label="t('recipes.fields.name')" required :placeholder="t('recipes.create.name_placeholder')" />
          <BaseDropdown v-model="form.beerType" :label="t('recipes.fields.beer_type')" :options="beerTypeOptions" :placeholder="t('recipes.create.select_beer_type')" />
          <BaseInput v-model="form.color" :label="t('recipes.fields.color')" :placeholder="t('recipes.create.color_placeholder')" />
          <BaseInput v-model="form.imageUrl" :label="t('recipes.fields.image_url')" :placeholder="t('recipes.create.image_url_placeholder')" />
        </div>

        <div class="space-y-2 rounded-lg border border-border3 p-4">
          <h3>{{ t("recipes.fields.icon") }}</h3>
          <RecipeIconPicker v-model="form.iconPath" />
        </div>

        <div class="space-y-3 rounded-lg border border-border3 p-4">
          <h3>{{ t("recipes.fields.image") }}</h3>
          <input type="file" accept="image/*" @change="handleImageUpload" class="block w-full text-sm" />
          <p v-if="imageUploadMessage" class="text-sm opacity-80">{{ imageUploadMessage }}</p>
          <img v-if="resolvedImageSrc" :src="resolvedImageSrc" :alt="t('recipes.detail.image_alt')" class="max-h-56 rounded-lg border border-border3 object-cover" />
        </div>

        <div>
          <label class="mb-1 block text-sm font-medium text-[var(--color-text1)]">{{ t("recipes.fields.flavor_profile") }}</label>
          <textarea
            v-model="form.flavorProfile"
            rows="3"
            class="w-full rounded-lg border border-border4 bg-bg4 px-3 py-2 text-text4 focus:outline-none focus:ring-2 focus:ring-button1"
            :placeholder="t('recipes.create.flavor_placeholder')"
          />
        </div>

        <div class="space-y-2">
          <h3>{{ t("recipes.fields.defaults") }}</h3>
          <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <BaseInput v-model="form.defaults.ogFrom" :label="t('recipes.fields.og_from')" placeholder="1.056" />
            <BaseInput v-model="form.defaults.ogTo" :label="t('recipes.fields.og_to')" placeholder="1.062" />
            <BaseInput v-model="form.defaults.fgFrom" :label="t('recipes.fields.fg_from')" placeholder="1.010" />
            <BaseInput v-model="form.defaults.fgTo" :label="t('recipes.fields.fg_to')" placeholder="1.014" />
            <BaseInput v-model.number="form.defaults.co2Volumes" :model-modifiers="{ number: true }" type="number" step="0.1" :label="t('recipes.metrics.co2')" />
            <BaseInput v-model.number="form.defaults.ibu" :model-modifiers="{ number: true }" type="number" step="1" :label="t('recipes.metrics.ibu')" />
            <BaseInput
              v-model.number="form.defaults.batchSizeLiters"
              :model-modifiers="{ number: true }"
              type="number"
              step="0.1"
              :label="t('recipes.fields.batch_size_liters')"
            />
          </div>
          <p class="text-sm opacity-80">{{ t("recipes.metrics.abv_estimated") }}: {{ abvText }}</p>
        </div>

        <div class="flex">
          <BaseToggle v-model="activeTab" :options="recipeTabOptions" />
        </div>

        <div v-if="activeTab === 'steps'" class="space-y-3">
          <div class="flex flex-wrap items-end gap-3">
            <div class="w-full sm:max-w-xs">
              <BaseDropdown
                v-model="selectedStepType"
                :label="t('recipes.fields.add_step_type')"
                :options="stepTypeOptions"
                :placeholder="t('recipes.create.select_step')"
              />
            </div>
            <BaseButton type="button" variant="button2" :icon="Plus" @click="addStepByType">{{ t("recipes.actions.add_step") }}</BaseButton>
          </div>

          <div v-if="!form.steps.length" class="rounded-lg border border-dashed border-border3 p-4 text-sm opacity-70">
            {{ t("recipes.create.no_steps") }}
          </div>

          <RecipeStepEditorItem
            v-for="(step, idx) in form.steps"
            :key="step.stepId || idx"
            :step="step"
            :index="idx"
            :total="form.steps.length"
            :ingredients="form.ingredients"
            :open="isStepOpen(step.stepId)"
            :is-new="isStepNew(step.stepId)"
            @update:step="updateStep(idx, $event)"
            @open="openStep(step.stepId)"
            @close="closeStep(step.stepId)"
            @move="moveStep(idx, $event)"
            @remove="removeStep(idx)"
          />

          <div v-if="form.steps.length" class="flex justify-end">
            <BaseButton type="button" variant="button2" :icon="Plus" @click="addStepByType">{{ t("recipes.actions.add_step") }}</BaseButton>
          </div>
        </div>

        <div v-else class="space-y-3">
          <div class="flex flex-wrap items-end gap-3">
            <div class="w-full sm:max-w-xs">
              <BaseDropdown v-model="selectedIngredientCategory" :label="t('recipes.fields.category')" :options="ingredientCategoryOptions" :placeholder="t('recipes.create.select_category')" />
            </div>
            <BaseButton type="button" variant="button2" :icon="Plus" @click="addIngredient">{{ t("recipes.actions.add_ingredient") }}</BaseButton>
          </div>

          <div v-if="!form.ingredients.length" class="rounded-lg border border-dashed border-border3 p-4 text-sm opacity-70">
            {{ t("recipes.create.no_ingredients") }}
          </div>

          <RecipeIngredientEditorItem
            v-for="(ingredient, idx) in form.ingredients"
            :key="ingredient.ingredientId"
            :ingredient="ingredient"
            :steps="form.steps"
            :open="isIngredientOpen(ingredient.ingredientId)"
            :is-new="isIngredientNew(ingredient.ingredientId)"
            @open="openIngredient(ingredient.ingredientId)"
            @close="closeIngredient(ingredient.ingredientId)"
            @remove="removeIngredient(idx)"
          />

          <div v-if="form.ingredients.length" class="flex justify-end">
            <BaseButton type="button" variant="button2" :icon="Plus" @click="addIngredient">{{ t("recipes.actions.add_ingredient") }}</BaseButton>
          </div>

          <div v-if="form.ingredients.length" class="rounded-lg border border-border3 p-4">
            <h4>{{ t("recipes.detail.cost_summary") }}</h4>
            <p class="mt-2 text-sm opacity-90">
              {{ t("recipes.detail.total_ingredients_cost") }}:
              <strong>{{ formatCurrency(ingredientTotalCost) }}</strong>
            </p>
            <p class="mt-1 text-sm opacity-90">
              {{ t("recipes.detail.liter_price") }}:
              <strong>{{ ingredientLiterPrice !== null ? formatCurrency(ingredientLiterPrice) : "-" }}</strong>
            </p>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-3">
          <BaseButton type="submit" :disabled="isSubmitting || !isGravityValid">
            {{ isSubmitting ? t("common.saving") : t("recipes.actions.create") }}
          </BaseButton>
          <BaseButton type="button" variant="button3" :disabled="isSubmitting" @click="resetForm">{{ t("common.reset") }}</BaseButton>
          <p v-if="successMessage" class="text-sm text-green-600">{{ successMessage }}</p>
          <p v-if="errorMessage" class="text-sm text-red-600">{{ errorMessage }}</p>
        </div>
      </form>
    </BaseCard>
  </section>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import { useRoute } from "vue-router";
import { useI18n } from "vue-i18n";
import BaseCard from "@/components/base/BaseCard.vue";
import BaseButton from "@/components/base/BaseButton.vue";
import BaseInput from "@/components/base/BaseInput.vue";
import BaseDropdown from "@/components/base/BaseDropdown.vue";
import BaseToggle from "@/components/base/BaseToggle.vue";
import { Plus } from "lucide-vue-next";
import RecipeIconPicker from "@/components/recipes/RecipeIconPicker.vue";
import RecipeStepEditorItem from "@/components/recipes/RecipeStepEditorItem.vue";
import RecipeIngredientEditorItem from "@/components/recipes/RecipeIngredientEditorItem.vue";
import { createRecipe, getRecipe, uploadRecipeImage } from "@/services/recipes.service.js";
import { STEP_TYPE_OPTIONS, createDefaultStep } from "@/components/recipe-steps/index.js";
import {
  DEFAULT_RECIPE_ICON_PATH,
  ingredientCategoryOptions as buildIngredientCategoryOptions,
} from "@/utils/recipeAssets.js";

const route = useRoute();
const { t, locale } = useI18n();
const gravityPattern = /^1\.\d{3}$/;

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

const ingredientCategoryOptions = computed(() => buildIngredientCategoryOptions(t));

const stepTypeOptions = computed(() =>
  STEP_TYPE_OPTIONS.map((step) => ({ label: t(`recipes.step_types.${step.value}`), value: step.value })),
);

const recipeTabOptions = computed(() => [
  { label: t("recipes.tabs.steps"), value: "steps" },
  { label: t("recipes.tabs.ingredients"), value: "ingredients" },
]);

function newIngredientId() {
  if (globalThis.crypto?.randomUUID) return `ingredient-${globalThis.crypto.randomUUID()}`;
  return `ingredient-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const initialState = () => ({
  name: "",
  beerType: "",
  iconPath: DEFAULT_RECIPE_ICON_PATH,
  flavorProfile: "",
  color: "",
  imageUrl: "",
  defaults: {
    ogFrom: "",
    ogTo: "",
    fgFrom: "",
    fgTo: "",
    co2Volumes: null,
    ibu: null,
    batchSizeLiters: null,
  },
  steps: [],
  ingredients: [],
});

const form = reactive(initialState());
const activeTab = ref("steps");
const selectedStepType = ref("mash");
const selectedIngredientCategory = ref("fermentable");
const isSubmitting = ref(false);
const successMessage = ref("");
const errorMessage = ref("");
const imageUploadMessage = ref("");
const isPrefillingCopy = ref(false);
const openStepIds = ref([]);
const newStepIds = ref([]);
const openIngredientIds = ref([]);
const newIngredientIds = ref([]);

const resolvedImageSrc = computed(() => {
  if (!form.imageUrl) return "";
  if (form.imageUrl.startsWith("http://") || form.imageUrl.startsWith("https://")) return form.imageUrl;
  if (form.imageUrl.startsWith("/")) {
    const base = window.env?.VITE_API_URL || "http://localhost:3000";
    return `${base}${form.imageUrl}`;
  }
  return form.imageUrl;
});

function parseGravity(value) {
  if (!value || !gravityPattern.test(value)) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

const abvText = computed(() => {
  const ogFrom = parseGravity(form.defaults.ogFrom);
  const ogTo = parseGravity(form.defaults.ogTo);
  const fgFrom = parseGravity(form.defaults.fgFrom);
  const fgTo = parseGravity(form.defaults.fgTo);

  if (ogFrom === null || ogTo === null || fgFrom === null || fgTo === null) {
    return t("recipes.metrics.abv_missing");
  }

  const min = Math.max(0, (ogFrom - fgTo) * 131.25);
  const max = Math.max(0, (ogTo - fgFrom) * 131.25);
  return `${min.toFixed(2)}% - ${max.toFixed(2)}% ABV`;
});

const ingredientTotalCost = computed(() =>
  form.ingredients.reduce((sum, ingredient) => {
    const price = Number(ingredient?.price);
    if (!Number.isFinite(price) || price < 0) return sum;
    return sum + price;
  }, 0),
);

const ingredientLiterPrice = computed(() => {
  const liters = Number(form.defaults.batchSizeLiters);
  if (!Number.isFinite(liters) || liters <= 0) return null;
  return ingredientTotalCost.value / liters;
});

const isGravityValid = computed(() => {
  const fields = [form.defaults.ogFrom, form.defaults.ogTo, form.defaults.fgFrom, form.defaults.fgTo];
  const allEmpty = fields.every((v) => !v);
  if (allEmpty) return true;
  return fields.every((v) => gravityPattern.test(v || ""));
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

function isStepOpen(stepId) {
  return openStepIds.value.includes(stepId);
}

function isStepNew(stepId) {
  return newStepIds.value.includes(stepId);
}

function openStep(stepId) {
  if (!stepId || isStepOpen(stepId)) return;
  openStepIds.value = [...openStepIds.value, stepId];
}

function closeStep(stepId) {
  openStepIds.value = openStepIds.value.filter((id) => id !== stepId);
  newStepIds.value = newStepIds.value.filter((id) => id !== stepId);
}

function addStepByType() {
  const step = createDefaultStep(selectedStepType.value || "custom");
  form.steps.push(step);
  openStepIds.value = [...openStepIds.value, step.stepId];
  newStepIds.value = [...newStepIds.value, step.stepId];
}

function updateStep(index, value) {
  form.steps.splice(index, 1, value);
}

function removeStep(index) {
  const removed = form.steps[index];
  form.steps.splice(index, 1);
  if (removed?.stepId) {
    closeStep(removed.stepId);
    form.ingredients.forEach((ing) => {
      ing.stepIds = ing.stepIds.filter((id) => id !== removed.stepId);
    });
  }
}

function moveStep(index, direction) {
  const target = index + direction;
  if (target < 0 || target >= form.steps.length) return;
  const current = form.steps[index];
  form.steps[index] = form.steps[target];
  form.steps[target] = current;
}

function isIngredientOpen(ingredientId) {
  return openIngredientIds.value.includes(ingredientId);
}

function isIngredientNew(ingredientId) {
  return newIngredientIds.value.includes(ingredientId);
}

function openIngredient(ingredientId) {
  if (!ingredientId || isIngredientOpen(ingredientId)) return;
  openIngredientIds.value = [...openIngredientIds.value, ingredientId];
}

function closeIngredient(ingredientId) {
  openIngredientIds.value = openIngredientIds.value.filter((id) => id !== ingredientId);
  newIngredientIds.value = newIngredientIds.value.filter((id) => id !== ingredientId);
}

function addIngredient() {
  const ingredient = {
    ingredientId: newIngredientId(),
    name: "",
    category: selectedIngredientCategory.value || "other",
    amount: "",
    unit: "",
    price: null,
    notes: "",
    stepIds: [],
  };
  form.ingredients.push(ingredient);
  openIngredientIds.value = [...openIngredientIds.value, ingredient.ingredientId];
  newIngredientIds.value = [...newIngredientIds.value, ingredient.ingredientId];
}

function removeIngredient(index) {
  const removed = form.ingredients[index];
  form.ingredients.splice(index, 1);
  if (removed?.ingredientId) closeIngredient(removed.ingredientId);
}

function resetForm() {
  Object.assign(form, initialState());
  openStepIds.value = [];
  newStepIds.value = [];
  openIngredientIds.value = [];
  newIngredientIds.value = [];
  activeTab.value = "steps";
  selectedStepType.value = "mash";
  selectedIngredientCategory.value = "fermentable";
  successMessage.value = "";
  errorMessage.value = "";
  imageUploadMessage.value = "";
}

function sanitizeNumber(value) {
  return typeof value === "number" && !Number.isNaN(value) ? value : null;
}

async function handleImageUpload(event) {
  const file = event?.target?.files?.[0];
  if (!file) return;
  imageUploadMessage.value = t("recipes.create.image_uploading");
  try {
    const data = await uploadRecipeImage(file);
    form.imageUrl = data.url;
    imageUploadMessage.value = t("recipes.create.image_uploaded");
  } catch (err) {
    imageUploadMessage.value = err?.response?.data?.error || err?.message || t("recipes.errors.upload_failed");
  }
}

function hydrateForm(recipe) {
  openStepIds.value = [];
  newStepIds.value = [];
  openIngredientIds.value = [];
  newIngredientIds.value = [];
  form.name = recipe?.name ? `${recipe.name} (${t("recipes.create.copy_suffix")})` : "";
  form.beerType = recipe?.beerType || "";
  form.iconPath = recipe?.iconPath || DEFAULT_RECIPE_ICON_PATH;
  form.flavorProfile = recipe?.flavorProfile || "";
  form.color = recipe?.color || "";
  form.imageUrl = recipe?.imageUrl || "";
  form.defaults = {
    ogFrom: recipe?.defaults?.ogFrom || "",
    ogTo: recipe?.defaults?.ogTo || "",
    fgFrom: recipe?.defaults?.fgFrom || "",
    fgTo: recipe?.defaults?.fgTo || "",
    co2Volumes: recipe?.defaults?.co2Volumes ?? null,
    ibu: recipe?.defaults?.ibu ?? null,
    batchSizeLiters: recipe?.defaults?.batchSizeLiters ?? null,
  };
  form.steps = Array.isArray(recipe?.steps)
    ? recipe.steps.map((s) => ({
        stepId: s.stepId || createDefaultStep(s.stepType || "custom").stepId,
        stepType: s.stepType || "custom",
        title: s.title || "",
        description: s.description || "",
        durationMinutes: s.durationMinutes ?? null,
        temperatureC: s.temperatureC ?? null,
        co2Volumes: s.co2Volumes ?? null,
        data: s.data || {},
      }))
    : [];
  form.ingredients = Array.isArray(recipe?.ingredients)
    ? recipe.ingredients.map((ing) => ({
        ingredientId: ing.ingredientId || newIngredientId(),
        name: ing.name || "",
        category: ing.category || "other",
        amount: ing.amount || "",
        unit: ing.unit || "",
        price: ing.price ?? null,
        notes: ing.notes || "",
        stepIds: Array.isArray(ing.stepIds) ? ing.stepIds : [],
      }))
    : [];
}

async function handleSubmit() {
  if (!form.name?.trim()) return;
  if (!isGravityValid.value) {
    errorMessage.value = t("recipes.errors.gravity_format");
    return;
  }

  isSubmitting.value = true;
  successMessage.value = "";
  errorMessage.value = "";

  try {
    const payload = {
      name: form.name.trim(),
      beerType: form.beerType || undefined,
      iconPath: form.iconPath || undefined,
      flavorProfile: form.flavorProfile?.trim() || undefined,
      color: form.color?.trim() || undefined,
      imageUrl: form.imageUrl?.trim() || undefined,
      defaults: {
        ogFrom: form.defaults.ogFrom?.trim() || undefined,
        ogTo: form.defaults.ogTo?.trim() || undefined,
        fgFrom: form.defaults.fgFrom?.trim() || undefined,
        fgTo: form.defaults.fgTo?.trim() || undefined,
        co2Volumes: sanitizeNumber(form.defaults.co2Volumes),
        ibu: sanitizeNumber(form.defaults.ibu),
        batchSizeLiters: sanitizeNumber(form.defaults.batchSizeLiters),
      },
      steps: form.steps
        .map((s, index) => ({
          stepId: s.stepId,
          order: index + 1,
          stepType: s.stepType || "custom",
          title: s.title?.trim(),
          description: s.description?.trim() || undefined,
          durationMinutes: sanitizeNumber(s.durationMinutes),
          temperatureC: sanitizeNumber(s.temperatureC),
          co2Volumes: sanitizeNumber(s.co2Volumes),
          data: s.data || {},
        }))
        .filter((s) => s.title),
      ingredients: form.ingredients
        .map((ing) => ({
          ingredientId: ing.ingredientId,
          name: ing.name?.trim(),
          category: ing.category || "other",
          amount: ing.amount?.trim() || undefined,
          unit: ing.unit?.trim() || undefined,
          price: sanitizeNumber(ing.price),
          notes: ing.notes?.trim() || undefined,
          stepIds: (ing.stepIds || []).filter((id) => form.steps.some((s) => s.stepId === id)),
        }))
        .filter((ing) => ing.name),
    };

    await createRecipe(payload);
    resetForm();
    successMessage.value = t("recipes.create.saved");
  } catch (err) {
    errorMessage.value = err?.response?.data?.error || err?.message || t("recipes.errors.save_failed");
  } finally {
    isSubmitting.value = false;
  }
}

async function prefillFromCopySource() {
  const copyFrom = route.query.copyFrom;
  if (!copyFrom) return;

  isPrefillingCopy.value = true;
  errorMessage.value = "";
  try {
    const recipe = await getRecipe(copyFrom);
    hydrateForm(recipe);
  } catch (err) {
    errorMessage.value = err?.response?.data?.error || err?.message || t("recipes.errors.copy_load_failed");
  } finally {
    isPrefillingCopy.value = false;
  }
}

onMounted(prefillFromCopySource);
</script>
