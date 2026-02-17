<template>
  <section class="mx-auto w-full max-w-6xl px-4 py-8 space-y-6">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1>{{ t("brews.plan.title") }}</h1>
        <p class="mt-2 opacity-80">{{ t("brews.plan.subtitle") }}</p>
      </div>
      <router-link to="/brygg/tidligere">
        <BaseButton variant="button3">{{ t("brews.actions.back_to_list") }}</BaseButton>
      </router-link>
    </div>

    <BaseCard v-if="loading">
      <p>{{ t("common.loading") }}</p>
    </BaseCard>

    <BaseCard v-else-if="!brew" class="space-y-5">
      <div>
        <h3>{{ t("brews.plan.create_from_recipe") }}</h3>
        <p class="mt-2 text-sm opacity-80">{{ t("brews.plan.select_recipe_help") }}</p>
      </div>

      <div class="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
        <BaseDropdown
          v-model="selectedRecipeId"
          :label="t('recipes.fields.name')"
          :options="recipeOptions"
          :placeholder="t('brews.plan.select_recipe')"
        />
        <BaseButton
          type="button"
          :disabled="creating || !selectedRecipeId"
          @click="createPlanFromSelection"
        >
          {{ creating ? t("common.loading") : t("brews.actions.create_plan") }}
        </BaseButton>
      </div>

      <div class="border-t border-border3 pt-4">
        <h4>{{ t("brews.plan.create_empty_title") }}</h4>
        <p class="mt-1 text-sm opacity-80">{{ t("brews.plan.create_empty_help") }}</p>
        <div class="mt-3">
          <BaseButton type="button" variant="button3" :disabled="creating" @click="createEmptyPlan">
            {{ creating ? t("common.loading") : t("brews.actions.create_empty_plan") }}
          </BaseButton>
        </div>
      </div>

      <p v-if="errorMessage" class="text-sm text-red-600">{{ errorMessage }}</p>
    </BaseCard>

    <BaseCard v-else class="space-y-6">
      <div class="grid gap-4 md:grid-cols-3">
        <BaseInput v-model="form.name" :label="t('recipes.fields.name')" required />
        <BaseInput
          v-model="form.plannedStartAt"
          :label="t('brews.fields.planned_start')"
          type="datetime-local"
        />
        <BaseInput
          v-model.number="form.snapshot.defaults.batchSizeLiters"
          :model-modifiers="{ number: true }"
          type="number"
          step="0.1"
          :label="t('recipes.fields.batch_size_liters')"
        />
      </div>

      <BaseInput v-model="form.notes" :label="t('recipes.fields.notes')" />

      <div class="rounded-lg border border-border3 p-4">
        <p class="text-sm font-medium">{{ t("recipes.detail.version") }}</p>
        <p class="mt-1 text-sm opacity-80">{{ linkedRecipeVersionText }}</p>
        <div class="mt-3 flex flex-wrap gap-2">
          <BaseButton
            type="button"
            variant="button3"
            :disabled="recipeSyncing || !form.name?.trim() || !isGravityValid || !hasLinkedRecipe"
            @click="updateLinkedRecipeVersion"
          >
            {{ recipeSyncing && recipeSyncAction === "update" ? t("common.saving") : t("brews.actions.update_recipe_version") }}
          </BaseButton>
          <BaseButton
            type="button"
            variant="button2"
            :disabled="recipeSyncing || !form.name?.trim() || !isGravityValid"
            @click="saveAsNewRecipeVersion"
          >
            {{ recipeSyncing && recipeSyncAction === "new-version" ? t("common.saving") : t("brews.actions.create_recipe_version") }}
          </BaseButton>
        </div>
        <p v-if="recipeSyncMessage" class="mt-2 text-sm opacity-80">{{ recipeSyncMessage }}</p>
      </div>

      <div class="flex flex-wrap gap-2">
        <BaseButton
          type="button"
          :variant="activeTab === 'steps' ? 'button1' : 'button3'"
          @click="activeTab = 'steps'"
        >
          {{ t("recipes.tabs.steps") }}
        </BaseButton>
        <BaseButton
          type="button"
          :variant="activeTab === 'ingredients' ? 'button1' : 'button3'"
          @click="activeTab = 'ingredients'"
        >
          {{ t("recipes.tabs.ingredients") }}
        </BaseButton>
        <BaseButton
          type="button"
          :variant="activeTab === 'overview' ? 'button1' : 'button3'"
          @click="activeTab = 'overview'"
        >
          {{ t("brews.plan.overview") }}
        </BaseButton>
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
          <BaseButton type="button" variant="button2" @click="addStepByType">
            {{ t("recipes.actions.add_step") }}
          </BaseButton>
        </div>

        <div
          v-if="!form.snapshot.steps.length"
          class="rounded-lg border border-dashed border-border3 p-4 text-sm opacity-70"
        >
          {{ t("recipes.create.no_steps") }}
        </div>

        <div
          v-for="(step, idx) in form.snapshot.steps"
          :key="step.stepId || idx"
          class="space-y-2"
        >
          <component
            :is="resolveStepComponent(step.stepType)"
            :model-value="step"
            :step-number="idx + 1"
            @update:model-value="updateStep(idx, $event)"
          />

          <div class="flex flex-wrap justify-end gap-2">
            <BaseButton
              type="button"
              variant="button3"
              :disabled="idx === 0"
              @click="moveStep(idx, -1)"
            >
              {{ t("recipes.actions.up") }}
            </BaseButton>
            <BaseButton
              type="button"
              variant="button3"
              :disabled="idx === form.snapshot.steps.length - 1"
              @click="moveStep(idx, 1)"
            >
              {{ t("recipes.actions.down") }}
            </BaseButton>
            <BaseButton type="button" variant="button4" @click="removeStep(idx)">
              {{ t("recipes.actions.remove") }}
            </BaseButton>
          </div>
        </div>
      </div>

      <div v-else-if="activeTab === 'ingredients'" class="space-y-3">
        <div class="flex flex-wrap items-end gap-3">
          <div class="w-full sm:max-w-xs">
            <BaseDropdown
              v-model="selectedIngredientCategory"
              :label="t('recipes.fields.category')"
              :options="ingredientCategoryOptions"
              :placeholder="t('recipes.create.select_category')"
            />
          </div>
          <BaseButton type="button" variant="button2" @click="addIngredient">
            {{ t("recipes.actions.add_ingredient") }}
          </BaseButton>
        </div>

        <div
          v-if="!form.snapshot.ingredients.length"
          class="rounded-lg border border-dashed border-border3 p-4 text-sm opacity-70"
        >
          {{ t("recipes.create.no_ingredients") }}
        </div>

        <BaseCard
          v-for="(ingredient, idx) in form.snapshot.ingredients"
          :key="ingredient.ingredientId"
          class="space-y-3"
        >
          <div class="flex items-center gap-2 text-sm">
            <img :src="ingredientCategoryIcon(ingredient.category)" :alt="ingredientCategoryText(ingredient.category)" class="h-7 w-7 rounded-md border border-border3 bg-white p-1 object-contain" />
            <span class="opacity-80">{{ ingredientCategoryText(ingredient.category) }}</span>
          </div>

          <div class="grid gap-3 md:grid-cols-2">
            <BaseInput v-model="ingredient.name" :label="t('recipes.fields.name')" />
            <BaseDropdown
              v-model="ingredient.category"
              :label="t('recipes.fields.category')"
              :options="ingredientCategoryOptions"
              :placeholder="t('recipes.create.select_category')"
            />
            <BaseInput v-model="ingredient.amount" :label="t('recipes.fields.amount')" />
            <BaseInput v-model="ingredient.unit" :label="t('recipes.fields.unit')" />
            <BaseInput
              v-model.number="ingredient.price"
              :model-modifiers="{ number: true }"
              type="number"
              step="0.01"
              :label="t('recipes.fields.price')"
            />
          </div>
          <BaseInput v-model="ingredient.notes" :label="t('recipes.fields.notes')" />

          <div>
            <p class="mb-2 text-sm font-medium">{{ t("recipes.fields.link_to_steps") }}</p>
            <div v-if="!form.snapshot.steps.length" class="text-sm opacity-70">
              {{ t("recipes.create.add_steps_first") }}
            </div>
            <div v-else class="grid gap-2 sm:grid-cols-2">
              <label
                v-for="step in form.snapshot.steps"
                :key="`${ingredient.ingredientId}-${step.stepId}`"
                class="flex items-center gap-2 text-sm"
              >
                <input
                  type="checkbox"
                  :checked="ingredient.stepIds.includes(step.stepId)"
                  @change="toggleIngredientStep(ingredient, step.stepId)"
                />
                <span>{{ step.title || stepTypeLabel(step.stepType) }}</span>
              </label>
            </div>
          </div>

          <div class="flex justify-end">
            <BaseButton type="button" variant="button4" @click="removeIngredient(idx)">
              {{ t("recipes.actions.remove_ingredient") }}
            </BaseButton>
          </div>
        </BaseCard>

        <div v-if="form.snapshot.ingredients.length" class="rounded-lg border border-border3 p-4">
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

      <div v-else class="space-y-4">
        <BaseCard>
          <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <BaseInput v-model="form.snapshot.defaults.ogFrom" :label="t('recipes.fields.og_from')" placeholder="1.056" />
            <BaseInput v-model="form.snapshot.defaults.ogTo" :label="t('recipes.fields.og_to')" placeholder="1.062" />
            <BaseInput v-model="form.snapshot.defaults.fgFrom" :label="t('recipes.fields.fg_from')" placeholder="1.010" />
            <BaseInput v-model="form.snapshot.defaults.fgTo" :label="t('recipes.fields.fg_to')" placeholder="1.014" />
            <BaseInput
              v-model.number="form.snapshot.defaults.co2Volumes"
              :model-modifiers="{ number: true }"
              type="number"
              step="0.1"
              :label="t('recipes.metrics.co2')"
            />
            <BaseInput
              v-model.number="form.snapshot.defaults.ibu"
              :model-modifiers="{ number: true }"
              type="number"
              step="1"
              :label="t('recipes.metrics.ibu')"
            />
            <BaseInput
              v-model.number="form.snapshot.defaults.batchSizeLiters"
              :model-modifiers="{ number: true }"
              type="number"
              step="0.1"
              :label="t('recipes.fields.batch_size_liters')"
            />
          </div>
        </BaseCard>

        <BaseCard>
          <p class="text-sm opacity-80">
            {{ t("brews.plan.summary", { steps: form.snapshot.steps.length, ingredients: form.snapshot.ingredients.length }) }}
          </p>
          <p class="mt-2 text-sm opacity-90">
            {{ t("recipes.detail.total_ingredients_cost") }}:
            <strong>{{ formatCurrency(ingredientTotalCost) }}</strong>
          </p>
          <p class="mt-1 text-sm opacity-90">
            {{ t("recipes.detail.liter_price") }}:
            <strong>{{ ingredientLiterPrice !== null ? formatCurrency(ingredientLiterPrice) : "-" }}</strong>
          </p>
        </BaseCard>
      </div>

      <div class="flex flex-wrap items-center gap-3">
        <BaseButton
          type="button"
          :disabled="saving || !form.name?.trim() || !isGravityValid"
          @click="savePlan"
        >
          {{ saving ? t("common.saving") : t("brews.actions.save_plan") }}
        </BaseButton>
        <BaseButton
          type="button"
          variant="button2"
          :disabled="saving || !form.name?.trim() || !isGravityValid"
          @click="startBrewDay"
        >
          {{ t("brews.actions.start_brew_day") }}
        </BaseButton>
        <p v-if="successMessage" class="text-sm text-green-600">{{ successMessage }}</p>
        <p v-if="errorMessage" class="text-sm text-red-600">{{ errorMessage }}</p>
      </div>
    </BaseCard>
  </section>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import BaseCard from "@/components/base/BaseCard.vue";
import BaseButton from "@/components/base/BaseButton.vue";
import BaseInput from "@/components/base/BaseInput.vue";
import BaseDropdown from "@/components/base/BaseDropdown.vue";
import { STEP_COMPONENTS, STEP_TYPE_OPTIONS, createDefaultStep } from "@/components/recipe-steps/index.js";
import {
  createRecipe,
  createRecipeVersion,
  listRecipes,
  updateRecipe,
} from "@/services/recipes.service.js";
import {
  createBrew,
  createPlannedBrewFromRecipe,
  getBrew,
  startBrew,
  updateBrew,
} from "@/services/brews.service.js";
import {
  ingredientCategoryIcon,
  ingredientCategoryLabel,
  ingredientCategoryOptions as buildIngredientCategoryOptions,
} from "@/utils/recipeAssets.js";

const route = useRoute();
const router = useRouter();
const { t, locale } = useI18n();
const gravityPattern = /^1\.\d{3}$/;

const loading = ref(true);
const creating = ref(false);
const saving = ref(false);
const recipeSyncing = ref(false);
const recipeSyncAction = ref("");
const recipeSyncMessage = ref("");
const suppressBatchAutoScale = ref(false);
const successMessage = ref("");
const errorMessage = ref("");
const brew = ref(null);
const recipes = ref([]);

const selectedRecipeId = ref("");
const selectedStepType = ref("mash");
const selectedIngredientCategory = ref("fermentable");
const activeTab = ref("steps");

const form = reactive({
  name: "",
  notes: "",
  plannedStartAt: "",
  snapshot: {
    recipeId: "",
    recipeGroupId: "",
    recipeVersion: 1,
    name: "",
    beerType: "",
    iconPath: "",
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
  },
});

function newIngredientId() {
  if (globalThis.crypto?.randomUUID) return `ingredient-${globalThis.crypto.randomUUID()}`;
  return `ingredient-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const ingredientCategoryOptions = computed(() => buildIngredientCategoryOptions(t));

const stepTypeOptions = computed(() =>
  STEP_TYPE_OPTIONS.map((step) => ({
    label: t(`recipes.step_types.${step.value}`),
    value: step.value,
  })),
);

const recipeOptions = computed(() =>
  (recipes.value || []).map((recipe) => ({ label: recipe.name, value: recipe._id })),
);

const hasLinkedRecipe = computed(() => Boolean(form.snapshot.recipeId));
const linkedRecipeVersionText = computed(() => {
  if (!hasLinkedRecipe.value) return t("brews.plan.no_linked_recipe");
  const version = form.snapshot.recipeVersion || 1;
  return t("brews.plan.linked_recipe_version", { version });
});

const isGravityValid = computed(() => {
  const fields = [
    form.snapshot.defaults.ogFrom,
    form.snapshot.defaults.ogTo,
    form.snapshot.defaults.fgFrom,
    form.snapshot.defaults.fgTo,
  ];
  const allEmpty = fields.every((v) => !v);
  if (allEmpty) return true;
  return fields.every((v) => gravityPattern.test(v || ""));
});

const ingredientTotalCost = computed(() =>
  form.snapshot.ingredients.reduce((sum, ingredient) => {
    const price = Number(ingredient?.price);
    if (!Number.isFinite(price) || price < 0) return sum;
    return sum + price;
  }, 0),
);

const ingredientLiterPrice = computed(() => {
  const liters = Number(form.snapshot.defaults.batchSizeLiters);
  if (!Number.isFinite(liters) || liters <= 0) return null;
  return ingredientTotalCost.value / liters;
});

function resolveStepComponent(stepType) {
  return STEP_COMPONENTS[stepType] || STEP_COMPONENTS.custom;
}

function stepTypeLabel(value) {
  return t(`recipes.step_types.${value || "custom"}`);
}

function ingredientCategoryText(category) {
  return ingredientCategoryLabel(t, category);
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

function toLocalDateTimeInput(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function toIsoOrUndefined(value) {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
}

function sanitizeNumber(value) {
  return typeof value === "number" && !Number.isNaN(value) ? value : null;
}

function toPositiveNumber(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

function scaleIngredientAmountText(amountValue, ratio) {
  if (amountValue === null || amountValue === undefined) return amountValue;
  const rawText = String(amountValue).trim();
  if (!rawText) return amountValue;

  const normalized = rawText.replace(",", ".");
  if (!/^-?\d+(\.\d+)?$/.test(normalized)) return amountValue;

  const amount = Number(normalized);
  if (!Number.isFinite(amount)) return amountValue;

  const scaled = amount * ratio;
  const rounded = Math.round(scaled * 1000) / 1000;
  let text = Number.isInteger(rounded)
    ? String(rounded)
    : rounded.toFixed(3).replace(/\.?0+$/, "");

  if (rawText.includes(",")) text = text.replace(".", ",");
  return text;
}

function addStepByType() {
  form.snapshot.steps.push(createDefaultStep(selectedStepType.value || "custom"));
}

function updateStep(index, value) {
  form.snapshot.steps.splice(index, 1, value);
}

function removeStep(index) {
  const removed = form.snapshot.steps[index];
  form.snapshot.steps.splice(index, 1);
  if (removed?.stepId) {
    form.snapshot.ingredients.forEach((ing) => {
      ing.stepIds = ing.stepIds.filter((id) => id !== removed.stepId);
    });
  }
}

function moveStep(index, direction) {
  const target = index + direction;
  if (target < 0 || target >= form.snapshot.steps.length) return;
  const current = form.snapshot.steps[index];
  form.snapshot.steps[index] = form.snapshot.steps[target];
  form.snapshot.steps[target] = current;
}

function addIngredient() {
  form.snapshot.ingredients.push({
    ingredientId: newIngredientId(),
    name: "",
    category: selectedIngredientCategory.value || "other",
    amount: "",
    unit: "",
    price: null,
    notes: "",
    stepIds: [],
  });
}

function removeIngredient(index) {
  form.snapshot.ingredients.splice(index, 1);
}

function toggleIngredientStep(ingredient, stepId) {
  const set = new Set(ingredient.stepIds || []);
  if (set.has(stepId)) set.delete(stepId);
  else set.add(stepId);
  ingredient.stepIds = Array.from(set);
}

function hydrateForm(brewDoc) {
  suppressBatchAutoScale.value = true;
  brew.value = brewDoc;
  form.name = brewDoc?.name || "";
  form.notes = brewDoc?.notes || "";
  form.plannedStartAt = toLocalDateTimeInput(brewDoc?.timeline?.plannedStartAt);

  const snapshot = brewDoc?.recipeSnapshot || {};
  form.snapshot.recipeId = snapshot.recipeId || brewDoc?.recipeId || "";
  form.snapshot.recipeGroupId = snapshot.recipeGroupId || "";
  form.snapshot.recipeVersion = Number(snapshot.recipeVersion || 1) || 1;
  form.snapshot.name = snapshot.name || "";
  form.snapshot.beerType = snapshot.beerType || "";
  form.snapshot.iconPath = snapshot.iconPath || "";
  form.snapshot.flavorProfile = snapshot.flavorProfile || "";
  form.snapshot.color = snapshot.color || "";
  form.snapshot.imageUrl = snapshot.imageUrl || "";
  form.snapshot.defaults = {
    ogFrom: snapshot?.defaults?.ogFrom || "",
    ogTo: snapshot?.defaults?.ogTo || "",
    fgFrom: snapshot?.defaults?.fgFrom || "",
    fgTo: snapshot?.defaults?.fgTo || "",
    co2Volumes: snapshot?.defaults?.co2Volumes ?? null,
    ibu: snapshot?.defaults?.ibu ?? null,
    batchSizeLiters: snapshot?.defaults?.batchSizeLiters ?? null,
  };
  form.snapshot.steps = Array.isArray(snapshot?.steps)
    ? snapshot.steps.map((step) => ({
        stepId: step.stepId || createDefaultStep(step.stepType || "custom").stepId,
        stepType: step.stepType || "custom",
        title: step.title || "",
        description: step.description || "",
        durationMinutes: step.durationMinutes ?? null,
        temperatureC: step.temperatureC ?? null,
        co2Volumes: step.co2Volumes ?? null,
        data: step.data || {},
      }))
    : [];
  form.snapshot.ingredients = Array.isArray(snapshot?.ingredients)
    ? snapshot.ingredients.map((ing) => ({
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
  suppressBatchAutoScale.value = false;
}

function snapshotPayload() {
  const stepPayload = form.snapshot.steps
    .map((step, index) => ({
      stepId: step.stepId,
      order: index + 1,
      stepType: step.stepType || "custom",
      title: step.title?.trim(),
      description: step.description?.trim() || undefined,
      durationMinutes: sanitizeNumber(step.durationMinutes),
      temperatureC: sanitizeNumber(step.temperatureC),
      co2Volumes: sanitizeNumber(step.co2Volumes),
      data: step.data || {},
    }))
    .filter((step) => step.title);

  const allowedStepIds = new Set(stepPayload.map((step) => step.stepId));

  const ingredientPayload = form.snapshot.ingredients
    .map((ingredient) => ({
      ingredientId: ingredient.ingredientId,
      name: ingredient.name?.trim(),
      category: ingredient.category || "other",
      amount: ingredient.amount?.trim() || undefined,
      unit: ingredient.unit?.trim() || undefined,
      price: sanitizeNumber(ingredient.price),
      notes: ingredient.notes?.trim() || undefined,
      stepIds: (ingredient.stepIds || []).filter((stepId) => allowedStepIds.has(stepId)),
    }))
    .filter((ingredient) => ingredient.name);

  return {
    recipeId: form.snapshot.recipeId || undefined,
    recipeGroupId: form.snapshot.recipeGroupId || undefined,
    recipeVersion: Number(form.snapshot.recipeVersion || 1) || 1,
    name: form.snapshot.name?.trim() || form.name?.trim() || undefined,
    beerType: form.snapshot.beerType?.trim() || undefined,
    iconPath: form.snapshot.iconPath?.trim() || undefined,
    flavorProfile: form.snapshot.flavorProfile?.trim() || undefined,
    color: form.snapshot.color?.trim() || undefined,
    imageUrl: form.snapshot.imageUrl?.trim() || undefined,
    defaults: {
      ogFrom: form.snapshot.defaults.ogFrom?.trim() || undefined,
      ogTo: form.snapshot.defaults.ogTo?.trim() || undefined,
      fgFrom: form.snapshot.defaults.fgFrom?.trim() || undefined,
      fgTo: form.snapshot.defaults.fgTo?.trim() || undefined,
      co2Volumes: sanitizeNumber(form.snapshot.defaults.co2Volumes),
      ibu: sanitizeNumber(form.snapshot.defaults.ibu),
      batchSizeLiters: sanitizeNumber(form.snapshot.defaults.batchSizeLiters),
    },
    steps: stepPayload,
    ingredients: ingredientPayload,
  };
}

async function loadRecipes() {
  recipes.value = await listRecipes({ sort: "name_asc" });
}

async function loadExistingBrew(brewId) {
  const brewDoc = await getBrew(brewId);
  hydrateForm(brewDoc);
}

async function createFromRecipe(recipeId) {
  creating.value = true;
  errorMessage.value = "";
  try {
    const brewDoc = await createPlannedBrewFromRecipe(recipeId);
    hydrateForm(brewDoc);
    await router.replace({
      name: "brygg-planlegging",
      params: { brewId: brewDoc._id },
    });
  } catch (err) {
    errorMessage.value =
      err?.response?.data?.error || err?.message || t("brews.errors.create_failed");
  } finally {
    creating.value = false;
  }
}

async function createPlanFromSelection() {
  if (!selectedRecipeId.value) return;
  await createFromRecipe(selectedRecipeId.value);
}

function recipePayloadFromSnapshot() {
  const snapshot = snapshotPayload();
  return {
    name: form.name?.trim() || snapshot.name || t("brews.plan.empty_brew_name"),
    beerType: snapshot.beerType,
    iconPath: snapshot.iconPath,
    flavorProfile: snapshot.flavorProfile,
    color: snapshot.color,
    imageUrl: snapshot.imageUrl,
    defaults: snapshot.defaults,
    steps: snapshot.steps,
    ingredients: snapshot.ingredients,
  };
}

function applyLinkedRecipe(recipeDoc) {
  form.snapshot.recipeId = recipeDoc?._id || "";
  form.snapshot.recipeGroupId = recipeDoc?.recipeGroupId || "";
  form.snapshot.recipeVersion = Number(recipeDoc?.version || 1) || 1;
  form.snapshot.name = recipeDoc?.name || form.snapshot.name || form.name;
  form.snapshot.beerType = recipeDoc?.beerType || form.snapshot.beerType;
  form.snapshot.iconPath = recipeDoc?.iconPath || form.snapshot.iconPath;
  form.snapshot.flavorProfile = recipeDoc?.flavorProfile || form.snapshot.flavorProfile;
  form.snapshot.color = recipeDoc?.color || form.snapshot.color;
  form.snapshot.imageUrl = recipeDoc?.imageUrl || form.snapshot.imageUrl;
}

async function syncBrewWithLinkedRecipe(recipeDoc) {
  if (!brew.value?._id) return;
  applyLinkedRecipe(recipeDoc);
  const updatedBrew = await updateBrew(brew.value._id, {
    recipeId: form.snapshot.recipeId || undefined,
    recipeSnapshot: snapshotPayload(),
    progress: {
      currentStepIndex: brew.value?.progress?.currentStepIndex || 0,
    },
  });
  hydrateForm(updatedBrew);
}

async function updateLinkedRecipeVersion() {
  if (!hasLinkedRecipe.value || !form.snapshot.recipeId) return;
  if (!isGravityValid.value) {
    errorMessage.value = t("recipes.errors.gravity_format");
    return;
  }

  recipeSyncing.value = true;
  recipeSyncAction.value = "update";
  recipeSyncMessage.value = "";
  errorMessage.value = "";

  try {
    const updatedRecipe = await updateRecipe(
      form.snapshot.recipeId,
      recipePayloadFromSnapshot(),
    );
    await syncBrewWithLinkedRecipe(updatedRecipe);
    recipeSyncMessage.value = t("brews.plan.recipe_version_updated");
  } catch (err) {
    errorMessage.value =
      err?.response?.data?.error || err?.message || t("recipes.errors.update_failed");
  } finally {
    recipeSyncing.value = false;
    recipeSyncAction.value = "";
  }
}

async function saveAsNewRecipeVersion() {
  if (!form.name?.trim()) return;
  if (!isGravityValid.value) {
    errorMessage.value = t("recipes.errors.gravity_format");
    return;
  }

  recipeSyncing.value = true;
  recipeSyncAction.value = "new-version";
  recipeSyncMessage.value = "";
  errorMessage.value = "";

  try {
    const payload = recipePayloadFromSnapshot();
    const nextRecipe = hasLinkedRecipe.value
      ? await createRecipeVersion(form.snapshot.recipeId, payload)
      : await createRecipe(payload);
    await syncBrewWithLinkedRecipe(nextRecipe);
    recipeSyncMessage.value = hasLinkedRecipe.value
      ? t("brews.plan.recipe_version_created")
      : t("brews.plan.recipe_created_and_linked");
  } catch (err) {
    errorMessage.value =
      err?.response?.data?.error || err?.message || t("recipes.errors.save_failed");
  } finally {
    recipeSyncing.value = false;
    recipeSyncAction.value = "";
  }
}

async function createEmptyPlan() {
  creating.value = true;
  errorMessage.value = "";
  recipeSyncMessage.value = "";
  try {
    const emptyName = t("brews.plan.empty_brew_name");
    const brewDoc = await createBrew({
      name: emptyName,
      status: "planned",
      recipeSnapshot: {
        name: emptyName,
        defaults: {},
        steps: [],
        ingredients: [],
      },
      progress: {
        currentStepIndex: 0,
      },
    });
    hydrateForm(brewDoc);
    await router.replace({
      name: "brygg-planlegging",
      params: { brewId: brewDoc._id },
    });
  } catch (err) {
    errorMessage.value =
      err?.response?.data?.error || err?.message || t("brews.errors.create_failed");
  } finally {
    creating.value = false;
  }
}

async function savePlan() {
  if (!brew.value?._id) return;
  if (!isGravityValid.value) {
    errorMessage.value = t("recipes.errors.gravity_format");
    return;
  }

  saving.value = true;
  successMessage.value = "";
  errorMessage.value = "";
  recipeSyncMessage.value = "";

  try {
    const updated = await updateBrew(brew.value._id, {
      name: form.name?.trim() || undefined,
      notes: form.notes?.trim() || undefined,
      timeline: {
        plannedStartAt: toIsoOrUndefined(form.plannedStartAt),
      },
      recipeSnapshot: snapshotPayload(),
      progress: {
        currentStepIndex: brew.value?.progress?.currentStepIndex || 0,
      },
    });

    hydrateForm(updated);
    successMessage.value = t("brews.plan.saved");
  } catch (err) {
    errorMessage.value =
      err?.response?.data?.error || err?.message || t("brews.errors.save_failed");
  } finally {
    saving.value = false;
  }
}

async function startBrewDay() {
  if (!brew.value?._id) return;
  await savePlan();
  if (errorMessage.value) return;

  try {
    const started = await startBrew(brew.value._id);
    await router.push(`/brygg/${started._id}`);
  } catch (err) {
    errorMessage.value =
      err?.response?.data?.error || err?.message || t("brews.errors.start_failed");
  }
}

async function bootstrap() {
  loading.value = true;
  errorMessage.value = "";
  try {
    await loadRecipes();

    if (route.params?.brewId) {
      await loadExistingBrew(route.params.brewId);
      return;
    }

    if (route.query?.recipeId) {
      selectedRecipeId.value = String(route.query.recipeId);
      await createFromRecipe(selectedRecipeId.value);
    }
  } catch (err) {
    errorMessage.value =
      err?.response?.data?.error || err?.message || t("brews.errors.fetch_failed");
  } finally {
    loading.value = false;
  }
}

watch(
  () => form.snapshot.defaults.batchSizeLiters,
  (nextValue, previousValue) => {
    if (suppressBatchAutoScale.value) return;
    const nextLiters = toPositiveNumber(nextValue);
    const previousLiters = toPositiveNumber(previousValue);
    if (!nextLiters || !previousLiters || nextLiters === previousLiters) return;

    const ratio = nextLiters / previousLiters;
    form.snapshot.ingredients.forEach((ingredient) => {
      ingredient.amount = scaleIngredientAmountText(ingredient.amount, ratio);
    });
  },
  { flush: "sync" },
);

onMounted(bootstrap);
</script>
