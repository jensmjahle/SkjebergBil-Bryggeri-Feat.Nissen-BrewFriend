<template>
  <RecipeEditorForm
    :key="route.params.recipeId"
    :form="form"
    :beer-type-options="beerTypeOptions"
    :submitting="isSubmitting"
    :image-upload-message="imageUploadMessage"
    :error-message="errorMessage"
    :success-message="successMessage"
    @submit="handleSubmit"
    @upload="handleImageUpload"
    @invalid-step="openStep"
    @invalid-ingredient="openIngredient"
    :title="
      isNewVersionMode
        ? t('recipes.edit.new_version_title')
        : t('recipes.edit.title')
    "
    :subtitle="
      isNewVersionMode
        ? t('recipes.edit.new_version_subtitle')
        : t('recipes.edit.subtitle')
    "
    :submit-label="
      isNewVersionMode
        ? t('recipes.actions.save_new_version')
        : t('recipes.actions.save')
    "
    :loading="loading"
    :load-error="loadError"
    :busy="isSubmitting || imageUploading"
    :back-to="`/oppskrifter/${route.params.recipeId}`"
  >
    <template #steps>
      <div class="space-y-3">
        <div class="flex flex-wrap items-end gap-3">
          <div class="w-full sm:max-w-xs">
            <BaseDropdown
              v-model="selectedStepType"
              :label="t('recipes.fields.add_step_type')"
              :options="stepTypeOptions"
              :placeholder="t('recipes.create.select_step')"
            />
          </div>
          <BaseButton
            type="button"
            variant="button2"
            :icon="Plus"
            @click="addStepByType"
            >{{ t("recipes.actions.add_step") }}</BaseButton
          >
        </div>

        <p
          v-if="!form.steps.length"
          class="rounded-lg border border-dashed border-border3 p-4 text-sm text-text2-faded"
        >
          {{ t("recipes.create.no_steps") }}
        </p>
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
          <BaseButton
            type="button"
            variant="button2"
            :icon="Plus"
            @click="addStepByType"
            >{{ t("recipes.actions.add_step") }}</BaseButton
          >
        </div>
      </div>
    </template>
    <template #ingredients>
      <div class="space-y-3">
        <div class="flex flex-wrap items-end gap-3">
          <div class="w-full sm:max-w-xs">
            <BaseDropdown
              v-model="selectedIngredientCategory"
              :label="t('recipes.fields.category')"
              :options="ingredientCategoryOptions"
              :placeholder="t('recipes.create.select_category')"
            />
          </div>
          <BaseButton
            type="button"
            variant="button2"
            :icon="Plus"
            @click="addIngredient"
            >{{ t("recipes.actions.add_ingredient") }}</BaseButton
          >
        </div>

        <p
          v-if="!form.ingredients.length"
          class="rounded-lg border border-dashed border-border3 p-4 text-sm text-text2-faded"
        >
          {{ t("recipes.create.no_ingredients") }}
        </p>
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
          <BaseButton
            type="button"
            variant="button2"
            :icon="Plus"
            @click="addIngredient"
            >{{ t("recipes.actions.add_ingredient") }}</BaseButton
          >
        </div>
      </div>
    </template>
  </RecipeEditorForm>
</template>

<script setup>
import { detachBoilIngredient } from "@/utils/recipeIngredientLinks.js";
import RecipeEditorForm from "@/components/recipes/RecipeEditorForm.vue";
import { gravityRangeError } from "@/utils/brewPlanningSummary.js";

import { computed, onBeforeUnmount, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import BaseButton from "@/components/base/BaseButton.vue";
import BaseDropdown from "@/components/base/BaseDropdown.vue";
import { Plus } from "lucide-vue-next";
import RecipeStepEditorItem from "@/components/recipes/RecipeStepEditorItem.vue";
import RecipeIngredientEditorItem from "@/components/recipes/RecipeIngredientEditorItem.vue";
import {
  createRecipeVersion,
  getRecipe,
  updateRecipe,
  uploadRecipeImage,
} from "@/services/recipes.service.js";
import {
  STEP_TYPE_OPTIONS,
  createDefaultStep,
} from "@/components/recipe-steps/index.js";
import {
  DEFAULT_RECIPE_ICON_PATH,
  ingredientCategoryOptions as buildIngredientCategoryOptions,
} from "@/utils/recipeAssets.js";

const route = useRoute();
const router = useRouter();
const { t } = useI18n();

const isNewVersionMode = computed(
  () => String(route.query.nyVersjon || route.query.newVersion || "") === "1",
);

const loading = ref(true);
const loadError = ref("");
const isSubmitting = ref(false);
const successMessage = ref("");
const errorMessage = ref("");
const imageUploadMessage = ref("");
const imageUploading = ref(false);

const selectedStepType = ref("mash");
const selectedIngredientCategory = ref("fermentable");
const openStepIds = ref([]);
const newStepIds = ref([]);
const openIngredientIds = ref([]);
const newIngredientIds = ref([]);

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

const ingredientCategoryOptions = computed(() =>
  buildIngredientCategoryOptions(t),
);

const stepTypeOptions = computed(() =>
  STEP_TYPE_OPTIONS.map((step) => ({
    label: t(`recipes.step_types.${step.value}`),
    value: step.value,
  })),
);

function newIngredientId() {
  if (globalThis.crypto?.randomUUID)
    return `ingredient-${globalThis.crypto.randomUUID()}`;
  return `ingredient-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const form = reactive({
  name: "",
  beerType: "",
  iconPath: DEFAULT_RECIPE_ICON_PATH,
  flavorProfile: "",
  color: "",
  imageUrl: "",
  sourceUrl: "",
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

const isGravityValid = computed(
  () =>
    !gravityRangeError(form.defaults.ogFrom, form.defaults.ogTo) &&
    !gravityRangeError(form.defaults.fgFrom, form.defaults.fgTo),
);

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
  const tmp = form.steps[index];
  form.steps[index] = form.steps[target];
  form.steps[target] = tmp;
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
  openIngredientIds.value = openIngredientIds.value.filter(
    (id) => id !== ingredientId,
  );
  newIngredientIds.value = newIngredientIds.value.filter(
    (id) => id !== ingredientId,
  );
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
  openIngredientIds.value = [
    ...openIngredientIds.value,
    ingredient.ingredientId,
  ];
  newIngredientIds.value = [...newIngredientIds.value, ingredient.ingredientId];
}
function removeIngredient(index) {
  const removed = form.ingredients[index];
  detachBoilIngredient(form.steps, removed);
  form.ingredients.splice(index, 1);
  if (removed?.ingredientId) closeIngredient(removed.ingredientId);
}

function sanitizeNumber(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function hydrateForm(recipe) {
  openStepIds.value = [];
  newStepIds.value = [];
  openIngredientIds.value = [];
  newIngredientIds.value = [];
  form.name = recipe?.name || "";
  form.beerType = recipe?.beerType || "";
  form.iconPath = recipe?.iconPath || DEFAULT_RECIPE_ICON_PATH;
  form.flavorProfile = recipe?.flavorProfile || "";
  form.color = recipe?.color || "";
  form.imageUrl = recipe?.imageUrl || "";
  form.sourceUrl = recipe?.sourceUrl || "";
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
        phase: s.phase || undefined,
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

let loadSequence = 0;
onBeforeUnmount(() => { loadSequence++; });

async function loadRecipe(recipeId) {
  const sequence = ++loadSequence;
  successMessage.value = "";
  errorMessage.value = "";
  imageUploadMessage.value = "";
  loading.value = true;
  loadError.value = "";
  try {
    const recipe = await getRecipe(recipeId);
    if (sequence !== loadSequence) return;
    hydrateForm(recipe);
  } catch (err) {
    if (sequence !== loadSequence) return;
    loadError.value =
      err?.response?.data?.error ||
      err?.message ||
      t("recipes.errors.fetch_failed");
  } finally {
    if (sequence === loadSequence) loading.value = false;
  }
}

async function handleImageUpload(event) {
  const file = event?.target?.files?.[0];
  if (!file || imageUploading.value || isSubmitting.value) return;
  const sequence = loadSequence;
  imageUploading.value = true;
  imageUploadMessage.value = t("recipes.create.image_uploading");
  try {
    const data = await uploadRecipeImage(file);
    if (sequence !== loadSequence) return;
    form.imageUrl = data.url;
    imageUploadMessage.value = t("recipes.create.image_uploaded");
  } catch (err) {
    if (sequence !== loadSequence) return;
    imageUploadMessage.value =
      err?.response?.data?.error ||
      err?.message ||
      t("recipes.errors.upload_failed");
  } finally {
    imageUploading.value = false;
  }
}

async function handleSubmit() {
  if (loading.value || loadError.value || isSubmitting.value || imageUploading.value) return;
  if (!isGravityValid.value) {
    errorMessage.value = t("recipes.errors.gravity_format");
    return;
  }

  const sequence = loadSequence;
  const recipeId = route.params.recipeId;
  const newVersion = isNewVersionMode.value;
  isSubmitting.value = true;
  successMessage.value = "";
  errorMessage.value = "";
  try {
    const payload = {
      name: form.name.trim(),
      beerType: form.beerType || "",
      iconPath: form.iconPath || undefined,
      flavorProfile: form.flavorProfile?.trim() || "",
      color: form.color?.trim() || "",
      imageUrl: form.imageUrl?.trim() || "",
      sourceUrl: form.sourceUrl?.trim() || "",
      defaults: {
        ogFrom: form.defaults.ogFrom?.trim() || "",
        ogTo: form.defaults.ogTo?.trim() || "",
        fgFrom: form.defaults.fgFrom?.trim() || "",
        fgTo: form.defaults.fgTo?.trim() || "",
        co2Volumes: sanitizeNumber(form.defaults.co2Volumes),
        ibu: sanitizeNumber(form.defaults.ibu),
        batchSizeLiters: sanitizeNumber(form.defaults.batchSizeLiters),
      },
      steps: form.steps
        .map((s, idx) => ({
          stepId: s.stepId,
          order: idx + 1,
          stepType: s.stepType || "custom",
          phase: s.phase || undefined,
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
          stepIds: (ing.stepIds || []).filter((id) =>
            form.steps.some((s) => s.stepId === id),
          ),
        }))
        .filter((ing) => ing.name),
    };

    if (newVersion) {
      const created = await createRecipeVersion(recipeId, payload);
      if (sequence !== loadSequence) return;
      successMessage.value = t("recipes.edit.version_created");
      if (created?._id) {
        await router.push(`/oppskrifter/${created._id}`);
      }
      return;
    }

    await updateRecipe(recipeId, payload);
    if (sequence !== loadSequence) return;
    successMessage.value = t("recipes.edit.saved");
  } catch (err) {
    if (sequence !== loadSequence) return;
    errorMessage.value =
      err?.response?.data?.error ||
      err?.message ||
      (isNewVersionMode.value
        ? t("recipes.errors.version_failed")
        : t("recipes.errors.update_failed"));
  } finally {
    isSubmitting.value = false;
  }
}

watch(() => route.params.recipeId, loadRecipe, { immediate: true });
watch(form, () => { successMessage.value = ""; }, { deep: true });
</script>
