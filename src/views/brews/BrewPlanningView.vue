<template>
  <section class="mx-auto w-full max-w-6xl px-4 py-8 space-y-6">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1>{{ t("brews.plan.title") }}</h1>
        <p class="mt-2 text-text2-faded">{{ brew ? form.name : t("brews.plan.subtitle") }}</p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <DeletePlannedBrewButton v-if="brew" :brew="brew" :disabled="saving || recipeSyncing || starting || inventorySavingIds.length > 0" @deleted="router.push('/brygg/tidligere')" />
        <router-link to="/brygg/tidligere">
          <BaseButton variant="button3">{{ t("brews.actions.back_to_list") }}</BaseButton>
        </router-link>
      </div>
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

      <p v-if="errorMessage" class="text-sm text-[var(--color-error-text,var(--color-danger))]">{{ errorMessage }}</p>
    </BaseCard>

    <template v-else>
      <div class="plan-stats" :aria-label="t('brews.plan.key_info')">
        <div v-for="stat in planStats" :key="stat.label" class="plan-stat">
          <component :is="stat.icon" class="h-5 w-5 shrink-0 opacity-60" aria-hidden="true" />
          <div class="min-w-0 flex-1">
            <template v-if="stat.editableVolume">
              <label for="plan-brew-volume" class="text-xs text-text2-faded">{{ stat.label }}</label>
              <BaseInput id="plan-brew-volume" v-model.number="form.snapshot.defaults.batchSizeLiters" :model-modifiers="{ number: true }" type="number" min="0.1" step="0.1" :disabled="saving || recipeSyncing || starting" :aria-describedby="'plan-volume-help'" :aria-invalid="isBatchSizeValid ? undefined : true" class="mt-1" />
            </template>
            <template v-else><p class="text-xs text-text2-faded">{{ stat.label }}</p><p class="mt-1 text-lg font-semibold tabular-nums">{{ stat.value }}</p></template>
          </div>
        </div>
      </div>
      <p id="plan-volume-help" class="text-sm text-text2-faded">{{ t('brews.plan.volume_scaling_help') }}</p>
      <p v-if="!isBatchSizeValid" role="alert" class="text-sm text-[var(--color-error-text,var(--color-danger))]">{{ t('brews.plan.volume_invalid') }}</p>

      <fieldset class="plan-layout min-w-0" :disabled="saving || recipeSyncing || starting" :aria-busy="saving || recipeSyncing || starting">
        <div class="min-w-0 space-y-4">
          <BrewInventoryChecklist :ingredients="form.snapshot.ingredients" :available-ids="inventoryAvailableIds" :saving-ids="inventorySavingIds" :disabled="saving || recipeSyncing || starting" :error="inventoryError" :pending="inventoryPending" @toggle="toggleIngredientStock" @edit="openRecipeEditor('ingredients')" />

          <details ref="recipeDetails" class="plan-panel plan-disclosure" :open="recipeExpanded" @toggle="recipeExpanded = $event.currentTarget.open">
            <summary class="plan-disclosure__summary">
              <ListChecks class="h-5 w-5 shrink-0 opacity-70" aria-hidden="true" />
              <span class="min-w-0 flex-1"><span class="plan-section-title block">{{ t('brews.plan.recipe_details') }}</span><span class="mt-1 block break-words text-sm text-text2-faded">{{ hasLinkedRecipe ? `${form.snapshot.name || t('brews.common.open_recipe')} · v${form.snapshot.recipeVersion}` : t('brews.common.no_recipe') }}</span><span class="mt-0.5 block text-xs text-text2-faded">{{ t('brews.plan.summary', { steps: form.snapshot.steps.length, ingredients: form.snapshot.ingredients.length }) }}</span></span>
              <ChevronDown class="plan-chevron h-5 w-5 shrink-0" aria-hidden="true" />
            </summary>
            <div class="mt-5 space-y-4">
              <BrewRecipeLink :brew="{ recipeId: form.snapshot.recipeId, recipeSnapshot: form.snapshot }" />
              <BaseToggle v-model="activeTab" :options="planTabOptions" full-width />
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
          <BaseButton type="button" variant="button2" :icon="Plus" @click="addStepByType">
            {{ t("recipes.actions.add_step") }}
          </BaseButton>
        </div>

        <div
          v-if="!form.snapshot.steps.length"
          class="rounded-lg border border-dashed border-border3 p-4 text-sm opacity-70"
        >
          {{ t("recipes.create.no_steps") }}
        </div>

        <RecipeStepEditorItem
          v-for="(step, idx) in form.snapshot.steps"
          :key="step.stepId || idx"
          :step="step"
          :index="idx"
          :total="form.snapshot.steps.length"
          :ingredients="form.snapshot.ingredients"
          :open="isStepOpen(step.stepId)"
          :is-new="isStepNew(step.stepId)"
          @update:step="updateStep(idx, $event)"
          @open="openStep(step.stepId)"
          @close="closeStep(step.stepId)"
          @move="moveStep(idx, $event)"
          @remove="removeStep(idx)"
        />

        <div v-if="form.snapshot.steps.length" class="flex justify-end">
          <BaseButton type="button" variant="button2" :icon="Plus" @click="addStepByType">
            {{ t("recipes.actions.add_step") }}
          </BaseButton>
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
          <BaseButton type="button" variant="button2" :icon="Plus" @click="addIngredient">
            {{ t("recipes.actions.add_ingredient") }}
          </BaseButton>
        </div>

        <div
          v-if="!form.snapshot.ingredients.length"
          class="rounded-lg border border-dashed border-border3 p-4 text-sm opacity-70"
        >
          {{ t("recipes.create.no_ingredients") }}
        </div>

        <RecipeIngredientEditorItem
          v-for="(ingredient, idx) in form.snapshot.ingredients"
          :key="ingredient.ingredientId"
          :ingredient="ingredient"
          :steps="form.snapshot.steps"
          :open="isIngredientOpen(ingredient.ingredientId)"
          :is-new="isIngredientNew(ingredient.ingredientId)"
          @open="openIngredient(ingredient.ingredientId)"
          @close="closeIngredient(ingredient.ingredientId)"
          @remove="removeIngredient(idx)"
        />

        <div v-if="form.snapshot.ingredients.length" class="flex justify-end">
          <BaseButton type="button" variant="button2" :icon="Plus" @click="addIngredient">
            {{ t("recipes.actions.add_ingredient") }}
          </BaseButton>
        </div>

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
                <dl class="grid grid-cols-2 gap-x-5 gap-y-4 rounded-lg bg-bg4 p-4 text-text4">
                  <div><dt class="text-xs opacity-65">{{ t('brews.plan.og_range') }}</dt><dd class="mt-1 font-semibold">{{ gravityRange(form.snapshot.defaults.ogFrom, form.snapshot.defaults.ogTo) }}</dd></div>
                  <div><dt class="text-xs opacity-65">{{ t('brews.plan.fg_range') }}</dt><dd class="mt-1 font-semibold">{{ gravityRange(form.snapshot.defaults.fgFrom, form.snapshot.defaults.fgTo) }}</dd></div>
                  <div><dt class="text-xs opacity-65">{{ t('brews.plan.total_mash') }}</dt><dd class="mt-1 font-semibold">{{ durationText(planningSummary.mashMinutes) }}</dd></div>
                  <div><dt class="text-xs opacity-65">{{ t('brews.plan.total_boil') }}</dt><dd class="mt-1 font-semibold">{{ durationText(planningSummary.boilMinutes) }}</dd></div>
                </dl>
                <div class="flex flex-wrap justify-between gap-3 text-sm"><span>{{ t('recipes.detail.total_ingredients_cost') }}: <strong>{{ formatCurrency(ingredientTotalCost) }}</strong></span><span>{{ t('recipes.detail.liter_price') }}: <strong>{{ ingredientLiterPrice !== null ? formatCurrency(ingredientLiterPrice) : '—' }}</strong></span></div>
              </div>
            </div>
          </details>

          <details class="plan-panel plan-disclosure">
            <summary class="plan-disclosure__summary">
              <FilePenLine class="h-5 w-5 shrink-0 opacity-70" aria-hidden="true" />
              <span class="min-w-0 flex-1"><span class="plan-section-title block">{{ t('brews.plan.save_to_recipe') }}</span><span class="mt-1 block text-xs text-text2-faded">{{ t(hasLinkedRecipe ? 'brews.plan.recipe_save_optional' : 'brews.common.no_recipe') }}</span></span>
              <ChevronDown class="plan-chevron h-5 w-5 shrink-0" aria-hidden="true" />
            </summary>
            <div class="mt-5 space-y-4">
              <BrewRecipeLink :brew="{ recipeId: form.snapshot.recipeId, recipeSnapshot: form.snapshot }" />
              <div class="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
                <div class="min-w-0 space-y-2"><BaseSegmentedToggle v-model="recipeSaveMode" :options="recipeSaveOptions" :label="t('brews.plan.recipe_save_mode')" :disabled="recipeSyncing || saving || inventorySavingIds.length > 0 || starting" /><p class="text-xs leading-relaxed text-text2-faded">{{ recipeSaveDescription }}</p></div>
                <BaseButton type="button" variant="button2" class="min-h-12" :disabled="recipeSyncing || saving || starting || inventorySavingIds.length > 0 || !form.name?.trim() || !isGravityValid || (recipeSaveMode === 'update' && !hasLinkedRecipe)" @click="saveRecipeSelection">{{ recipeSyncing ? t('common.saving') : t('common.save') }}</BaseButton>
              </div>
              <p v-if="recipeSyncMessage" role="status" class="text-sm text-text2-faded">{{ recipeSyncMessage }}</p>
            </div>
          </details>
        </div>

        <aside class="min-w-0 space-y-4">
          <section class="plan-panel" :aria-label="t('brews.plan.plan_info')">
            <h2 class="plan-section-title flex items-center gap-2.5"><ClipboardList class="h-5 w-5 opacity-70" aria-hidden="true" />{{ t('brews.plan.plan_info') }}</h2>
            <div class="mt-5 space-y-3">
              <div class="plan-form-row"><label for="plan-brew-name">{{ t('recipes.fields.name') }}</label><BaseInput id="plan-brew-name" v-model="form.name" required /></div>
              <div class="plan-form-row"><label for="plan-brew-date">{{ t('brews.fields.planned_start') }}</label><BaseInput id="plan-brew-date" v-model="form.plannedStartAt" type="datetime-local" /></div>
              <div class="plan-form-row"><label for="plan-brew-brewers">{{ t('brews.fields.brewers') }}</label><BaseInput id="plan-brew-brewers" v-model="form.brewersInput" maxlength="3600" :placeholder="t('brews.plan.brewers_placeholder')" /></div>
              <details class="plan-notes border-t border-border3 pt-3">
                <summary class="flex cursor-pointer items-center gap-2 text-sm"><StickyNote class="h-4 w-4 opacity-60" aria-hidden="true" />{{ t('recipes.fields.notes') }}<ChevronDown class="plan-chevron ml-auto h-4 w-4 opacity-60" aria-hidden="true" /></summary>
                <textarea v-model="form.notes" :aria-label="t('recipes.fields.notes')" rows="3" maxlength="3000" class="mt-3 w-full rounded-lg border border-border4 bg-bg4 px-3 py-2 text-sm text-text4 focus:outline-none focus:ring-2 focus:ring-button1-border" />
              </details>
            </div>
          </section>
          <section class="plan-panel" :aria-label="t('brews.plan.recipe_targets')">
            <h2 class="plan-section-title flex items-center gap-2.5"><Target class="h-5 w-5 opacity-70" aria-hidden="true" />{{ t('brews.plan.recipe_targets') }}</h2>
            <div class="mt-5 space-y-4">
              <BaseRangeInput v-model:from="form.snapshot.defaults.ogFrom" v-model:to="form.snapshot.defaults.ogTo" :error="ogError ? t(`brews.plan.gravity_${ogError}`) : ''" :label="t('brews.plan.og_range')" :from-label="t('brews.plan.range_from')" :to-label="t('brews.plan.range_to')" from-placeholder="1.048" to-placeholder="1.052" />
              <BaseRangeInput v-model:from="form.snapshot.defaults.fgFrom" v-model:to="form.snapshot.defaults.fgTo" :error="fgError ? t(`brews.plan.gravity_${fgError}`) : ''" :label="t('brews.plan.fg_range')" :from-label="t('brews.plan.range_from')" :to-label="t('brews.plan.range_to')" from-placeholder="1.010" to-placeholder="1.014" />
              <div class="grid grid-cols-2 gap-3 border-t border-border3 pt-4">
                <BaseInput v-model.number="form.snapshot.defaults.ibu" :model-modifiers="{ number: true }" type="number" min="0" step="1" :label="t('recipes.metrics.ibu')" />
                <BaseInput v-model.number="form.snapshot.defaults.co2Volumes" :model-modifiers="{ number: true }" type="number" min="0" step="0.1" :label="t('recipes.metrics.co2')" />
              </div>
            </div>
          </section>
        </aside>
      </fieldset>

      <div class="plan-action-bar">
        <div class="min-w-0 flex-1"><span class="text-sm font-medium">{{ t('brews.plan.ready_title') }}</span><p class="mt-0.5 text-xs text-text2-faded">{{ t(planningSummary.inventoryComplete ? 'brews.plan.ready_inventory' : 'brews.plan.review_inventory') }}</p></div>
        <div class="flex shrink-0 gap-2">
          <BaseButton type="button" variant="button3" :icon="Save" :disabled="saving || recipeSyncing || starting || inventorySavingIds.length > 0 || !form.name?.trim() || !isGravityValid || !isBatchSizeValid" @click="savePlan">{{ saving ? t('common.saving') : t('brews.actions.save_plan') }}</BaseButton>
          <BaseButton type="button" variant="button2" :icon="Play" :disabled="saving || recipeSyncing || starting || inventorySavingIds.length > 0 || !form.name?.trim() || !isGravityValid || !isBatchSizeValid" @click="startBrewDay">{{ starting ? t('common.loading') : t('brews.actions.start_brew_day') }}</BaseButton>
        </div>
        <p v-if="successMessage" role="status" class="w-full text-sm text-text2-faded">{{ successMessage }}</p>
        <p v-if="errorMessage" role="alert" class="w-full text-sm text-[var(--color-error-text,var(--color-danger))]">{{ errorMessage }}</p>
      </div>
    </template>
  </section>
</template>

<script setup>
import { scaleIngredientAmountText, scaleBoilScheduleText } from "@/utils/batchScaling.js";
import { detachBoilIngredient } from "@/utils/recipeIngredientLinks.js";
import { computed, nextTick, onMounted, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import BaseCard from "@/components/base/BaseCard.vue";
import DeletePlannedBrewButton from '@/components/brews/DeletePlannedBrewButton.vue';
import BrewRecipeLink from '@/components/brews/BrewRecipeLink.vue';
import BaseButton from "@/components/base/BaseButton.vue";
import BaseInput from "@/components/base/BaseInput.vue";
import BaseDropdown from "@/components/base/BaseDropdown.vue";
import BaseToggle from "@/components/base/BaseToggle.vue";
import BaseRangeInput from "@/components/base/BaseRangeInput.vue";
import BrewInventoryChecklist from "@/components/brews/BrewInventoryChecklist.vue";
import { gravityRangeError, brewPlanningSummary } from "@/utils/brewPlanningSummary.js";
import BaseSegmentedToggle from '@/components/base/BaseSegmentedToggle.vue';
import { Plus, CopyPlus, FilePenLine, Beaker, Timer, Flame, Coins, ListChecks, ChevronDown, ClipboardList, StickyNote, Target, Save, Play } from "lucide-vue-next";
import RecipeStepEditorItem from "@/components/recipes/RecipeStepEditorItem.vue";
import RecipeIngredientEditorItem from "@/components/recipes/RecipeIngredientEditorItem.vue";
import { STEP_TYPE_OPTIONS, createDefaultStep } from "@/components/recipe-steps/index.js";
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
  setBrewIngredientAvailable,
  updateBrew,
} from "@/services/brews.service.js";
import { ingredientCategoryOptions as buildIngredientCategoryOptions } from "@/utils/recipeAssets.js";

const route = useRoute();
const router = useRouter();
const { t, locale } = useI18n();


const loading = ref(true);
const creating = ref(false);
const saving = ref(false);
const starting = ref(false);
const recipeExpanded = ref(false);
const recipeDetails = ref(null);
const inventoryAvailableIds = ref([]);
const inventorySavingIds = ref([]);
const inventoryError = ref('');
const recipeSyncing = ref(false);
const recipeSaveMode = ref('new-version');
const recipeSyncMessage = ref("");
const suppressBatchAutoScale = ref(false);
const scaleBaseline = { liters: null, amounts: new Map(), additions: new Map(), hopSchedules: new Map() };
let applyingBatchScale = false;
const successMessage = ref("");
const errorMessage = ref("");
const brew = ref(null);
const recipes = ref([]);

const selectedRecipeId = ref("");
const selectedStepType = ref("mash");
const selectedIngredientCategory = ref("fermentable");
const activeTab = ref("steps");
const openStepIds = ref([]);
const newStepIds = ref([]);
const openIngredientIds = ref([]);
const newIngredientIds = ref([]);

const form = reactive({
  brewersInput: '',
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

const planTabOptions = computed(() => [
  { label: t("recipes.tabs.steps"), value: "steps" },
  { label: t("recipes.tabs.ingredients"), value: "ingredients" },
  { label: t("brews.plan.overview"), value: "overview" },
]);

const recipeOptions = computed(() =>
  (recipes.value || []).map((recipe) => ({ label: recipe.name, value: recipe._id })),
);

const hasLinkedRecipe = computed(() => Boolean(form.snapshot.recipeId));
const recipeSaveOptions = computed(() => [
  { value: 'update', label: t('brews.plan.update_recipe'), icon: FilePenLine, disabled: !hasLinkedRecipe.value },
  { value: 'new-version', label: t(hasLinkedRecipe.value ? 'brews.plan.new_recipe_version' : 'brews.plan.new_recipe'), icon: CopyPlus },
]);
const recipeSaveDescription = computed(() => t(!hasLinkedRecipe.value
  ? 'brews.plan.new_recipe_help'
  : recipeSaveMode.value === 'update' ? 'brews.plan.update_recipe_help' : 'brews.plan.new_recipe_version_help'));
watch(hasLinkedRecipe, linked => { recipeSaveMode.value = linked ? 'update' : 'new-version'; });

function saveRecipeSelection() {
  if (recipeSyncing.value || saving.value || starting.value || inventorySavingIds.value.length) return;
  return recipeSaveMode.value === 'update' ? updateLinkedRecipeVersion() : saveAsNewRecipeVersion();
}

const ogError = computed(() => gravityRangeError(form.snapshot.defaults.ogFrom, form.snapshot.defaults.ogTo));
const fgError = computed(() => gravityRangeError(form.snapshot.defaults.fgFrom, form.snapshot.defaults.fgTo));
const gravityErrorMessage = computed(() => {
  const error = ogError.value || fgError.value;
  return error ? t(`brews.plan.gravity_${error}`) : '';
});
const isGravityValid = computed(() => !ogError.value && !fgError.value);

const ingredientTotalCost = computed(() =>
  form.snapshot.ingredients.reduce((sum, ingredient) => {
    const price = Number(ingredient?.price);
    if (!Number.isFinite(price) || price < 0) return sum;
    return sum + price;
  }, 0),
);

const planningSummary = computed(() => brewPlanningSummary(form.snapshot, inventoryAvailableIds.value));
const isBatchSizeValid = computed(() => toPositiveNumber(form.snapshot.defaults.batchSizeLiters) !== null);
const planStats = computed(() => [
  { editableVolume: true, icon: Beaker, label: t('recipes.fields.batch_size_liters'), value: form.snapshot.defaults.batchSizeLiters > 0 ? `${form.snapshot.defaults.batchSizeLiters} L` : '—' },
  { icon: Timer, label: t('brews.plan.total_mash'), value: durationText(planningSummary.value.mashMinutes) },
  { icon: Flame, label: t('brews.plan.total_boil'), value: durationText(planningSummary.value.boilMinutes) },
  { icon: Coins, label: t('brews.plan.cost_short'), value: formatCurrency(ingredientTotalCost.value) },
]);
const inventoryPending = computed(() => inventoryAvailableIds.value.some(id =>
  form.snapshot.ingredients.some(ingredient => ingredient.ingredientId === id)
  && !brew.value?.recipeSnapshot?.ingredients?.some(ingredient => ingredient.ingredientId === id),
));
function durationText(minutes) { return `${new Intl.NumberFormat(locale.value, { maximumFractionDigits: 1 }).format(minutes)} ${t('recipes.detail.minutes')}`; }
function gravityRange(from, to) { return from || to ? `${from || '—'} – ${to || '—'}` : '—'; }
async function openRecipeEditor(tab) {
  activeTab.value = tab;
  recipeExpanded.value = true;
  await nextTick();
  recipeDetails.value?.scrollIntoView({ block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
}
async function toggleIngredientStock(id, available) {
  if (saving.value || recipeSyncing.value || starting.value || inventorySavingIds.value.includes(id)) return;
  const previous = inventoryAvailableIds.value.includes(id);
  const setChecked = value => { inventoryAvailableIds.value = value ? [...new Set([...inventoryAvailableIds.value, id])] : inventoryAvailableIds.value.filter(value => value !== id); };
  setChecked(available);
  inventoryError.value = '';
  if (!brew.value?.recipeSnapshot?.ingredients?.some(ingredient => ingredient.ingredientId === id)) return;
  inventorySavingIds.value = [...inventorySavingIds.value, id];
  try {
    await setBrewIngredientAvailable(brew.value._id, id, available);
    // Do not hydrate the form here: a stock checkbox must never overwrite unsaved edits.
    const savedIds = new Set(brew.value.inventory?.availableIngredientIds || []);
    if (available) savedIds.add(id); else savedIds.delete(id);
    brew.value = { ...brew.value, inventory: { availableIngredientIds: [...savedIds] } };
  } catch (err) {
    setChecked(previous);
    inventoryError.value = err?.response?.data?.error || err?.message || t('brews.plan.inventory_save_failed');
  } finally { inventorySavingIds.value = inventorySavingIds.value.filter(value => value !== id); }
}

const ingredientLiterPrice = computed(() => {
  const liters = Number(form.snapshot.defaults.batchSizeLiters);
  if (!Number.isFinite(liters) || liters <= 0) return null;
  return ingredientTotalCost.value / liters;
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

function captureScaleBaseline() {
  scaleBaseline.liters = toPositiveNumber(form.snapshot.defaults.batchSizeLiters);
  scaleBaseline.amounts = new Map(
    form.snapshot.ingredients.map((ingredient) => [ingredient.ingredientId, ingredient.amount]),
  );
  scaleBaseline.hopSchedules = new Map(form.snapshot.steps.map(step => [step.stepId, step.data?.hopSchedule]));
  scaleBaseline.additions = new Map(form.snapshot.steps.flatMap(step =>
    (step.data?.additions || []).map(item => [JSON.stringify([step.stepId, item.additionId]), item.amount]),
  ));
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
  form.snapshot.steps.push(step);
  openStepIds.value = [...openStepIds.value, step.stepId];
  newStepIds.value = [...newStepIds.value, step.stepId];
}

function updateStep(index, value) {
  form.snapshot.steps.splice(index, 1, value);
}

function removeStep(index) {
  const removed = form.snapshot.steps[index];
  form.snapshot.steps.splice(index, 1);
  if (removed?.stepId) {
    closeStep(removed.stepId);
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
  form.snapshot.ingredients.push(ingredient);
  openIngredientIds.value = [...openIngredientIds.value, ingredient.ingredientId];
  newIngredientIds.value = [...newIngredientIds.value, ingredient.ingredientId];
}

function removeIngredient(index) {
  const removed = form.snapshot.ingredients[index];
  detachBoilIngredient(form.snapshot.steps, removed);
  form.snapshot.ingredients.splice(index, 1);
  if (removed?.ingredientId) closeIngredient(removed.ingredientId);
}

function hydrateForm(brewDoc) {
  suppressBatchAutoScale.value = true;
  openStepIds.value = [];
  newStepIds.value = [];
  openIngredientIds.value = [];
  newIngredientIds.value = [];
  brew.value = brewDoc;
  form.name = brewDoc?.name || "";
  form.notes = brewDoc?.notes || "";
  form.brewersInput = (brewDoc?.brewers || []).join(', ');
  form.plannedStartAt = toLocalDateTimeInput(brewDoc?.timeline?.plannedStartAt);

  inventoryError.value = '';
  inventoryAvailableIds.value = [...(brewDoc?.inventory?.availableIngredientIds || [])];
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
        phase: step.phase || undefined,
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
  captureScaleBaseline();
  suppressBatchAutoScale.value = false;
}

function snapshotPayload() {
  const stepPayload = form.snapshot.steps
    .map((step, index) => ({
      stepId: step.stepId,
      order: index + 1,
      stepType: step.stepType || "custom",
      phase: step.phase || undefined,
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
    beerType: form.snapshot.beerType?.trim() || "",
    iconPath: form.snapshot.iconPath?.trim() || undefined,
    flavorProfile: form.snapshot.flavorProfile?.trim() || "",
    color: form.snapshot.color?.trim() || "",
    imageUrl: form.snapshot.imageUrl?.trim() || "",
    defaults: {
      ogFrom: form.snapshot.defaults.ogFrom?.trim() || "",
      ogTo: form.snapshot.defaults.ogTo?.trim() || "",
      fgFrom: form.snapshot.defaults.fgFrom?.trim() || "",
      fgTo: form.snapshot.defaults.fgTo?.trim() || "",
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
  form.snapshot.beerType = recipeDoc?.beerType ?? form.snapshot.beerType;
  form.snapshot.iconPath = recipeDoc?.iconPath || form.snapshot.iconPath;
  form.snapshot.flavorProfile = recipeDoc?.flavorProfile ?? form.snapshot.flavorProfile;
  form.snapshot.color = recipeDoc?.color ?? form.snapshot.color;
  form.snapshot.imageUrl = recipeDoc?.imageUrl ?? form.snapshot.imageUrl;
}

async function syncBrewWithLinkedRecipe(recipeDoc) {
  if (!brew.value?._id) return;
  applyLinkedRecipe(recipeDoc);
  const updatedBrew = await updateBrew(brew.value._id, {
    recipeId: form.snapshot.recipeId || undefined,
    recipeSnapshot: snapshotPayload(),
    inventory: { availableIngredientIds: inventoryAvailableIds.value },
    progress: {
      currentStepIndex: brew.value?.progress?.currentStepIndex || 0,
    },
  });
  hydrateForm(updatedBrew);
}

async function updateLinkedRecipeVersion() {
  if (!hasLinkedRecipe.value || !form.snapshot.recipeId) return;
  if (!isGravityValid.value) {
    errorMessage.value = gravityErrorMessage.value;
    return;
  }

  recipeSyncing.value = true;
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
  }
}

async function saveAsNewRecipeVersion() {
  if (!form.name?.trim()) return;
  if (!isGravityValid.value) {
    errorMessage.value = gravityErrorMessage.value;
    return;
  }

  recipeSyncing.value = true;
  recipeSyncMessage.value = "";
  errorMessage.value = "";

  try {
    const payload = recipePayloadFromSnapshot();
    const wasLinked = hasLinkedRecipe.value;
    const nextRecipe = wasLinked
      ? await createRecipeVersion(form.snapshot.recipeId, payload)
      : await createRecipe(payload);
    await syncBrewWithLinkedRecipe(nextRecipe);
    recipeSyncMessage.value = wasLinked
      ? t("brews.plan.recipe_version_created")
      : t("brews.plan.recipe_created_and_linked");
  } catch (err) {
    errorMessage.value =
      err?.response?.data?.error || err?.message || t("recipes.errors.save_failed");
  } finally {
    recipeSyncing.value = false;
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
  if (!brew.value?._id || saving.value || recipeSyncing.value || inventorySavingIds.value.length) return;
  if (!isGravityValid.value) {
    errorMessage.value = gravityErrorMessage.value;
    return;
  }

  if (!isBatchSizeValid.value) {
    errorMessage.value = t('brews.plan.volume_invalid');
    return;
  }
  saving.value = true;
  successMessage.value = "";
  errorMessage.value = "";
  recipeSyncMessage.value = "";

  try {
    const updated = await updateBrew(brew.value._id, {
      name: form.name?.trim() || undefined,
      notes: form.notes?.trim() || "",
      brewers: form.brewersInput.split(',').map(name=>name.trim()).filter(Boolean),
      timeline: {
        plannedStartAt: toIsoOrUndefined(form.plannedStartAt) || null,
      },
      recipeSnapshot: snapshotPayload(),
      inventory: { availableIngredientIds: inventoryAvailableIds.value },
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
  if (!brew.value?._id || starting.value || saving.value || recipeSyncing.value || inventorySavingIds.value.length) return;
  starting.value = true;
  try {
    await savePlan();
    if (errorMessage.value) return;
    const started = await startBrew(brew.value._id);
    await router.push(`/brygg/${started._id}`);
  } catch (err) {
    errorMessage.value = err?.response?.data?.error || err?.message || t('brews.errors.start_failed');
  } finally { starting.value = false; }
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
  (nextValue) => {
    if (suppressBatchAutoScale.value) return;
    const nextLiters = toPositiveNumber(nextValue);
    if (!nextLiters) return;
    if (!scaleBaseline.liters) {
      captureScaleBaseline();
      return;
    }
    const ratio = nextLiters / scaleBaseline.liters;
    applyingBatchScale = true;
    form.snapshot.ingredients.forEach((ingredient) => {
      if (!scaleBaseline.amounts.has(ingredient.ingredientId)) return;
      ingredient.amount = scaleIngredientAmountText(
        scaleBaseline.amounts.get(ingredient.ingredientId),
        ratio,
      );
    });
    form.snapshot.steps.forEach(step => {
      const legacyText = scaleBaseline.hopSchedules.get(step.stepId);
      if (typeof legacyText === "string" && step.data) step.data.hopSchedule = scaleBoilScheduleText(legacyText, ratio);
      (step.data?.additions || []).forEach(item => {
      const key = JSON.stringify([step.stepId, item.additionId]);
      if (scaleBaseline.additions.has(key)) item.amount = scaleIngredientAmountText(scaleBaseline.additions.get(key), ratio);
      });
    });
    applyingBatchScale = false;
  },
  { flush: "sync" },
);

watch(
  () =>
    form.snapshot.ingredients
      .map((ingredient) => `${ingredient.ingredientId}:${ingredient.amount ?? ""}`)
      .join("|") + JSON.stringify(form.snapshot.steps.map(step => [step.stepId, step.data?.additions, step.data?.hopSchedule])),
  () => {
    if (applyingBatchScale || suppressBatchAutoScale.value) return;
    captureScaleBaseline();
  },
  { flush: "sync" },
);

onMounted(bootstrap);
</script>

<style>
.plan-panel { min-width: 0; padding: 20px; border: 1px solid var(--color-border3); border-radius: 12px; background: var(--color-bg2); color: var(--color-text2); }
.plan-section-title { font-size: 16px; line-height: 1.4; font-weight: 700; color: inherit; }
</style>
<style scoped>
.plan-stats { display: grid; grid-template-columns: repeat(4,minmax(0,1fr)); border: 1px solid var(--color-border3); border-radius: 12px; padding: 20px 0; background: var(--color-bg2); }
.plan-stat { display: flex; align-items: center; gap: 12px; padding: 0 24px; }
.plan-stat + .plan-stat { border-left: 1px solid var(--color-border3); }
.plan-layout { padding: 0; margin: 0; border: 0; display: grid; grid-template-columns: minmax(0,1.85fr) minmax(300px,1fr); gap: 20px; align-items: start; }
.plan-disclosure__summary { display: flex; align-items: center; gap: 12px; cursor: pointer; list-style: none; }
.plan-disclosure__summary::-webkit-details-marker { display: none; }
.plan-disclosure__summary:focus-visible { outline: 2px solid var(--color-button1-border); outline-offset: 6px; border-radius: 3px; }
.plan-chevron { transition: transform .15s; }
.plan-disclosure[open] > summary .plan-chevron, .plan-notes[open] > summary .plan-chevron { transform: rotate(180deg); }
.plan-form-row { display: grid; grid-template-columns: 90px minmax(0,1fr); gap: 10px; align-items: center; font-size: 13px; }
.plan-action-bar { position: sticky; bottom: 12px; z-index: 20; display: flex; flex-wrap: wrap; align-items: center; gap: 12px; padding: 16px 20px; border: 1px solid var(--color-border3); border-radius: 12px; background: var(--color-bg1); box-shadow: 0 4px 24px color-mix(in srgb, var(--color-text1) 8%, transparent); }
@media(max-width: 900px) { .plan-layout { grid-template-columns: minmax(0,1fr); } .plan-layout aside { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 16px; } .plan-layout aside > * { margin-top: 0; } }
@media(max-width: 640px) { .plan-stats { grid-template-columns: repeat(2,minmax(0,1fr)); padding: 0; } .plan-stat { padding: 16px; } .plan-stat:nth-child(3) { border-left: 0; } .plan-stat:nth-child(n+3) { border-top: 1px solid var(--color-border3); } .plan-layout aside { display: block; } .plan-layout aside > * + * { margin-top: 16px; } .plan-action-bar { position: static; padding: 12px; } .plan-action-bar > .flex { width: 100%; flex-wrap: wrap; } .plan-action-bar > .flex > * { flex: 1; } }
@media(max-width: 380px) { .plan-form-row { grid-template-columns: minmax(0,1fr); gap: 4px; } }
@media(prefers-reduced-motion: reduce) { .plan-chevron { transition: none; } }
</style>
