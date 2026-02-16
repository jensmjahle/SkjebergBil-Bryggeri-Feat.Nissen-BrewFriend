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

    <BaseCard v-else-if="!brew">
      <h3>{{ t("brews.plan.create_from_recipe") }}</h3>
      <p class="mt-2 text-sm opacity-80">{{ t("brews.plan.select_recipe_help") }}</p>

      <div class="mt-4 grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
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

      <p v-if="errorMessage" class="mt-3 text-sm text-red-600">{{ errorMessage }}</p>
    </BaseCard>

    <BaseCard v-else class="space-y-6">
      <div class="grid gap-4 md:grid-cols-2">
        <BaseInput v-model="form.name" :label="t('recipes.fields.name')" required />
        <BaseInput
          v-model="form.plannedStartAt"
          :label="t('brews.fields.planned_start')"
          type="datetime-local"
        />
      </div>

      <BaseInput v-model="form.notes" :label="t('recipes.fields.notes')" />

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
          </div>
        </BaseCard>

        <BaseCard>
          <p class="text-sm opacity-80">
            {{ t("brews.plan.summary", { steps: form.snapshot.steps.length, ingredients: form.snapshot.ingredients.length }) }}
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
import { computed, onMounted, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import BaseCard from "@/components/base/BaseCard.vue";
import BaseButton from "@/components/base/BaseButton.vue";
import BaseInput from "@/components/base/BaseInput.vue";
import BaseDropdown from "@/components/base/BaseDropdown.vue";
import { STEP_COMPONENTS, STEP_TYPE_OPTIONS, createDefaultStep } from "@/components/recipe-steps/index.js";
import { listRecipes } from "@/services/recipes.service.js";
import {
  createPlannedBrewFromRecipe,
  getBrew,
  startBrew,
  updateBrew,
} from "@/services/brews.service.js";

const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const gravityPattern = /^1\.\d{3}$/;

const loading = ref(true);
const creating = ref(false);
const saving = ref(false);
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
    name: "",
    beerType: "",
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
    },
    steps: [],
    ingredients: [],
  },
});

function newIngredientId() {
  if (globalThis.crypto?.randomUUID) return `ingredient-${globalThis.crypto.randomUUID()}`;
  return `ingredient-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const ingredientCategoryOptions = computed(() => [
  { label: t("recipes.ingredient_category.fermentable"), value: "fermentable" },
  { label: t("recipes.ingredient_category.hops"), value: "hops" },
  { label: t("recipes.ingredient_category.other"), value: "other" },
]);

const stepTypeOptions = computed(() =>
  STEP_TYPE_OPTIONS.map((step) => ({
    label: t(`recipes.step_types.${step.value}`),
    value: step.value,
  })),
);

const recipeOptions = computed(() =>
  (recipes.value || []).map((recipe) => ({ label: recipe.name, value: recipe._id })),
);

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

function resolveStepComponent(stepType) {
  return STEP_COMPONENTS[stepType] || STEP_COMPONENTS.custom;
}

function stepTypeLabel(value) {
  return t(`recipes.step_types.${value || "custom"}`);
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
  brew.value = brewDoc;
  form.name = brewDoc?.name || "";
  form.notes = brewDoc?.notes || "";
  form.plannedStartAt = toLocalDateTimeInput(brewDoc?.timeline?.plannedStartAt);

  const snapshot = brewDoc?.recipeSnapshot || {};
  form.snapshot.recipeId = snapshot.recipeId || brewDoc?.recipeId || "";
  form.snapshot.name = snapshot.name || "";
  form.snapshot.beerType = snapshot.beerType || "";
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
        notes: ing.notes || "",
        stepIds: Array.isArray(ing.stepIds) ? ing.stepIds : [],
      }))
    : [];
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
      notes: ingredient.notes?.trim() || undefined,
      stepIds: (ingredient.stepIds || []).filter((stepId) => allowedStepIds.has(stepId)),
    }))
    .filter((ingredient) => ingredient.name);

  return {
    recipeId: form.snapshot.recipeId || undefined,
    name: form.snapshot.name?.trim() || form.name?.trim() || undefined,
    beerType: form.snapshot.beerType?.trim() || undefined,
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

async function savePlan() {
  if (!brew.value?._id) return;
  if (!isGravityValid.value) {
    errorMessage.value = t("recipes.errors.gravity_format");
    return;
  }

  saving.value = true;
  successMessage.value = "";
  errorMessage.value = "";

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

onMounted(bootstrap);
</script>
