<template>
  <section class="mx-auto w-full px-2 pb-8 pt-3 space-y-2 md:space-y-6">
    <BaseCard v-if="loading">
      <p>{{ t("common.loading") }}</p>
    </BaseCard>

    <BaseCard v-else-if="error">
      <p class="text-red-600">{{ error }}</p>
    </BaseCard>

    <template v-else-if="brew">
      <div class="lg:sticky lg:top-14 lg:z-20 lg:bg-bg1 lg:py-2">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0 flex-1">
            <h1 class="truncate text-xl sm:text-3xl">{{ brew.name }}</h1>
            <div class="mt-1 space-y-1 lg:flex lg:flex-wrap lg:items-center lg:gap-x-2 lg:gap-y-1 lg:space-y-0">
              <p class="text-sm opacity-80">{{ statusLabel(brew.status) }}</p>
              <p v-if="brew.progress?.brewStartedAt" class="text-xs opacity-70">
                {{ t("brews.fields.brew_started_at") }}: {{ formatDateTime(brew.progress.brewStartedAt) }}
              </p>
              <p v-if="brew.progress?.brewStartedAt" class="text-xs opacity-70">
                {{ t("brews.fields.brew_day_elapsed") }}: {{ formatStopwatch(brewDayElapsedSeconds) }}
              </p>
              <p class="text-xs opacity-70">
                {{ t("brews.fields.total_step_time") }}: {{ formatStopwatch(totalStepElapsedSeconds) }}
              </p>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <BaseToggle
              class="hidden sm:flex"
              :model-value="activePanel"
              :options="panelToggleOptions"
              @update:model-value="setActivePanel"
            />

            <div ref="headerMenuRoot" class="relative">
              <BaseButton
                variant="button3"
                :icon="EllipsisVertical"
                icon-position="left"
                :aria-label="t('brews.current.more_actions')"
                @click.stop="toggleHeaderMenu"
              >
                <span class="hidden lg:inline">{{ t("brews.current.menu") }}</span>
              </BaseButton>
              <div
                v-if="headerMenuOpen"
                class="absolute right-0 top-full z-30 mt-1 min-w-[10.5rem] rounded-lg border border-border3 bg-bg2 p-1 shadow-lg"
              >
                <button
                  type="button"
                  class="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-bg4"
                  @click="editBrewAction"
                >
                  {{ t("brews.actions.edit") }}
                </button>
                <button
                  type="button"
                  class="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-bg4"
                  @click="finishBrewAction"
                >
                  {{ isCompleted ? t("brews.actions.reevaluate") : t("brews.actions.finish") }}
                </button>
                <button
                  type="button"
                  class="w-full rounded-md px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                  @click="deleteBrewAction"
                >
                  {{ t("brews.actions.delete") }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="space-y-3">
        <BaseToggle
          class="sm:hidden"
          :model-value="activePanel"
          :options="panelToggleOptions"
          :full-width="true"
          @update:model-value="setActivePanel"
        />

        <div v-if="brew.status === 'planned'" class="flex">
          <BaseButton variant="button2" @click="startBrewDayAction">
            {{ t("brews.actions.start_brew_day") }}
          </BaseButton>
        </div>
      </div>

      <template v-if="activePanel === 'progress'">
        <div class="lg:grid lg:grid-cols-[minmax(0,3fr)_minmax(0,7fr)] lg:items-start lg:gap-6">
        <BaseCard
          v-if="currentStep"
          class="space-y-5 lg:sticky lg:top-36 lg:col-start-2 lg:row-start-1 lg:max-h-[calc(100vh-10rem)] lg:min-w-0 lg:overflow-y-auto"
        >
          <div class="lg:grid lg:grid-cols-[minmax(0,1fr)_16.25rem] lg:gap-5">
          <div class="space-y-5">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p class="text-xs uppercase tracking-wide opacity-70">
                {{ t("brews.current.step_label", { current: currentStepIndex + 1, total: steps.length }) }}
              </p>
              <h3>{{ currentStep.title }}</h3>
              <p class="text-sm opacity-80">{{ stepTypeLabel(currentStep.stepType) }}</p>
            </div>
            <span class="rounded-full bg-bg4 text-text4 px-2 py-1 text-xs">
              {{ stepStatusLabel(currentStepProgress?.status || "pending", currentStepProgress) }}
            </span>
          </div>

          <div class="grid gap-2 text-sm opacity-90 md:grid-cols-3">
            <p>{{ t("recipes.detail.time") }}: {{ stepDurationLabel(currentStep) }}</p>
            <p>{{ t("recipes.detail.temp") }}: {{ currentStep.temperatureC ?? "-" }} °C</p>
          </div>

          <div class="space-y-3 md:rounded-lg md:border border-border3 md:p-4">
            <p v-if="currentStep.description" class="whitespace-pre-line text-sm opacity-90">{{ currentStep.description }}</p>

            <div v-if="currentStepDataEntries.length" class="space-y-1 text-sm">
              <p class="text-xs font-semibold uppercase tracking-wide opacity-70">{{ t("brews.current.step_details") }}</p>
              <p v-for="entry in currentStepDataEntries" :key="entry.key" class="opacity-85">
                {{ entry.label }}: {{ entry.value }}
              </p>
            </div>

            <div v-if="currentStepIngredients.length" class="space-y-1 text-sm">
              <p class="text-xs font-semibold uppercase tracking-wide opacity-70">{{ t("recipes.detail.ingredients_in_step") }}</p>
              <div class="flex flex-wrap gap-2">
                <span
                  v-for="ingredient in currentStepIngredients"
                  :key="`active-${ingredient.ingredientId}`"
                  class="inline-flex items-center gap-1 rounded-full border border-border3 px-2 py-1 text-xs"
                >
                  <img :src="ingredientCategoryIcon(ingredient.category)" :alt="ingredientCategoryText(ingredient.category)" class="h-4 w-4 rounded-sm bg-white p-0.5 object-contain" />
                  {{ ingredient.name }}{{ ingredient.amount ? ` (${ingredient.amount}${ingredient.unit ? ` ${ingredient.unit}` : ""})` : "" }}
                </span>
              </div>
              <template v-for="ingredient in currentStepIngredients" :key="`active-note-${ingredient.ingredientId}`">
                <p v-if="ingredient.notes" class="text-xs opacity-75">
                  {{ ingredient.name }}: {{ ingredient.notes }}
                </p>
              </template>
            </div>
          </div>

          <div class="space-y-2 rounded-lg md:border border-border3 md:p-4">
            <label class="block text-sm font-medium">
              {{ t("brews.current.step_note_label") }}
            </label>
            <textarea
              v-model="stepNoteInput"
              class="w-full rounded-lg border border-border4 bg-bg4 text-text4 px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-button1"
              rows="3"
              :placeholder="t('brews.current.step_note_placeholder')"
            />
            <div class="flex flex-wrap items-center gap-2">
              <BaseButton
                type="button"
                variant="button3"
                :disabled="savingStepNote"
                @click="saveCurrentStepNote"
              >
                {{ savingStepNote ? t("common.saving") : t("brews.actions.save_step_note") }}
              </BaseButton>
              <p v-if="stepNoteMessage" class="text-sm opacity-80">{{ stepNoteMessage }}</p>
            </div>
          </div>

          </div>

          <aside class="mt-5 space-y-3 lg:mt-0">
            <CircularCountdown
              v-if="showRoundTimer"
              class="mx-auto"
              :remaining-seconds="timerRemainingSeconds"
              :total-seconds="timerTotalSeconds"
              :label="t('brews.current.timer_remaining')"
              :show-days="isCurrentStepDayBased"
            />

          <div class="space-y-2">
            <div class="grid grid-cols-3 gap-2">
              <BaseButton type="button" variant="button3" :disabled="currentStepIndex <= 0" @click="previousStep">
                {{ t("brews.actions.previous_step") }}
              </BaseButton>
              <BaseButton type="button" variant="button3" :disabled="currentStepIndex >= steps.length - 1" @click="nextStep">
                {{ t("brews.actions.next_step") }}
              </BaseButton>
              <BaseButton type="button" variant="button4" @click="resetCurrentStepAction">
                {{ t("brews.actions.reset_step") }}
              </BaseButton>
            </div>

            <div class="grid grid-cols-2 gap-2">
              <BaseButton
                type="button"
                :variant="isCurrentStepActive ? 'button4' : 'button2'"
                @click="toggleCurrentStepRunning"
              >
                {{ currentStepActionLabel }}
              </BaseButton>
              <BaseButton type="button" variant="button1" @click="completeCurrentStepAction">
                {{ t("brews.actions.complete_step") }}
              </BaseButton>
            </div>
          </div>
          </aside>
          </div>
        </BaseCard>

        <BaseCard v-if="steps.length" class="space-y-3 lg:col-start-1 lg:row-start-1 lg:min-w-0">
          <h3>{{ t("brews.current.all_steps") }}</h3>
          <div class="space-y-2">
            <RecipeStepItem
              v-for="(step, index) in steps"
              :key="step.stepId || index"
              :step="step"
              :ingredients="ingredients"
              :clickable="true"
              :active="index === currentStepIndex"
              :completed="stepProgress(step.stepId)?.status === 'completed'"
              @select="showStep(index)"
            />
          </div>
        </BaseCard>

        </div>

      </template>

      <template v-else-if="activePanel === 'recipe'">
        <BaseCard>
          <h3>{{ t("recipes.detail.defaults") }}</h3>
          <RecipeDefaultsSummary :defaults="brew.recipeSnapshot?.defaults || {}" />
        </BaseCard>

        <BaseCard>
          <h3>{{ t("recipes.detail.cost_summary") }}</h3>
          <RecipeCostSummary
            :total-cost-text="formatCurrency(recipeTotalIngredientCost)"
            :liter-price-text="recipeLiterPrice !== null ? formatCurrency(recipeLiterPrice) : '-'"
          />
        </BaseCard>

        <BaseCard>
          <h3>{{ t("recipes.detail.ingredients") }}</h3>
          <div class="mt-3 space-y-2">
            <div v-if="!ingredients.length" class="text-sm opacity-70">{{ t("recipes.detail.no_ingredients") }}</div>
            <RecipeIngredientItem
              v-for="ingredient in ingredients"
              :key="ingredient.ingredientId"
              :ingredient="ingredient"
              :steps="steps"
            />
          </div>
        </BaseCard>

        <BaseCard>
          <h3>{{ t("recipes.detail.steps") }}</h3>
          <div class="mt-3 space-y-3">
            <RecipeStepItem
              v-for="step in steps"
              :key="`${step.stepId}-${step.order}`"
              :step="step"
              :ingredients="ingredients"
            />
          </div>
        </BaseCard>
      </template>

      <template v-else>
        <BaseCard class="space-y-4">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3>{{ t("brews.current.measurements_tab") }}</h3>
              <p
                v-if="showFermentationPanel"
                class="mt-1 text-sm opacity-80"
              >
                {{ t("brews.current.fermentation_remaining") }}:
                <strong>{{ formatDuration(fermentationRemainingSeconds) }}</strong>
              </p>
            </div>
            <BaseButton type="button" :disabled="addingMeasurement" @click="openNewMeasurement">
              {{ t("brews.actions.add_measurement") }}
            </BaseButton>
          </div>

          <div class="grid gap-2 text-sm opacity-90 sm:grid-cols-2 lg:grid-cols-3">
            <p>{{ t("brews.fields.target_og") }}: {{ targetOgRangeText }}</p>
            <p>{{ t("brews.fields.target_fg") }}: {{ targetFgRangeText }}</p>
            <p>{{ t("brews.fields.target_ph") }}: {{ formatValue(targetPhValue) }}</p>
            <p>{{ t("brews.fields.target_co2") }}: {{ formatValue(targetCo2Value) }}</p>
            <p>{{ t("brews.fields.target_ibu") }}: {{ formatValue(targetIbuValue) }}</p>
            <p>{{ t("brews.fields.actual_abv") }}: {{ abvText }}</p>
          </div>

          <div class="grid gap-3 sm:grid-cols-2">
            <div class="flex items-end gap-2">
              <BaseInput
                v-model="actualOgInput"
                class="flex-1"
                :label="t('brews.fields.actual_og')"
                placeholder="1.056"
              />
              <BaseButton type="button" :disabled="savingActualOg" @click="saveActualOg">
                {{ savingActualOg ? t("common.saving") : t("common.save") }}
              </BaseButton>
            </div>
            <div class="flex items-end gap-2">
              <BaseInput
                v-model="actualFgInput"
                class="flex-1"
                :label="t('brews.fields.actual_fg')"
                placeholder="1.012"
              />
              <BaseButton type="button" :disabled="savingActualFg" @click="saveActualFg">
                {{ savingActualFg ? t("common.saving") : t("common.save") }}
              </BaseButton>
            </div>
          </div>

          <p v-if="measurementMessage" class="text-sm opacity-80">{{ measurementMessage }}</p>
        </BaseCard>

        <BaseCard class="space-y-4">
          <h3>{{ t("brews.current.measurement_graph") }}</h3>
          <div class="flex flex-wrap gap-2">
            <BaseButton
              v-for="series in measurementSeriesToggleOptions"
              :key="series.key"
              type="button"
              :variant="seriesVisibility[series.key] ? 'button1' : 'button3'"
              @click="toggleMeasurementSeries(series.key)"
            >
              {{ series.label }}
            </BaseButton>
          </div>

          <GravityProgressChart
            :datasets="measurementChartDatasets"
            :empty-text="t('brews.current.no_measurements')"
          />
        </BaseCard>

        <BaseCard class="space-y-2">
          <h4>{{ t("brews.current.latest_measurements") }}</h4>
          <div
            v-if="!measurementSeries.length"
            class="rounded-lg border border-dashed border-border3 p-3 text-sm opacity-70"
          >
            {{ t("brews.current.no_measurements") }}
          </div>
          <div v-else class="space-y-2">
            <div
              v-for="measurement in latestMeasurements"
              :key="measurement._id || measurement.takenAt"
              class="rounded-lg border border-border3 p-3 text-sm"
            >
              <div class="flex items-start justify-between gap-2">
                <p class="font-medium">{{ formatDateTime(measurement.takenAt) }}</p>
                <div class="flex shrink-0 gap-1">
                  <button
                    type="button"
                    class="rounded-md p-1 opacity-70 transition-opacity hover:opacity-100"
                    :aria-label="t('brews.actions.edit_measurement')"
                    :title="t('brews.actions.edit_measurement')"
                    :disabled="addingMeasurement"
                    @click="openEditMeasurement(measurement)"
                  >
                    <Pencil class="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    class="rounded-md p-1 opacity-70 transition-opacity hover:opacity-100"
                    :aria-label="t('brews.actions.delete_measurement')"
                    :title="t('brews.actions.delete_measurement')"
                    :disabled="addingMeasurement"
                    @click="removeMeasurement(measurement)"
                  >
                    <Trash2 class="h-4 w-4" />
                  </button>
                </div>
              </div>
              <p v-if="!measurementReadings(measurement).length" class="opacity-60">
                {{ t("brews.current.measurement_empty") }}
              </p>
              <p v-else class="opacity-80">
                <span v-for="(reading, index) in measurementReadings(measurement)" :key="reading.key">
                  <span v-if="index > 0"> | </span>{{ reading.label }}: {{ reading.value }}
                </span>
              </p>
              <p v-if="measurement.note" class="opacity-80">{{ measurement.note }}</p>
            </div>
          </div>
        </BaseCard>
      </template>

      <BrewMeasurementModal
        :open="measurementModalOpen"
        :loading="addingMeasurement"
        :measurement="editingMeasurement"
        @close="closeMeasurementModal"
        @submit="submitMeasurement"
      />

      <BrewEvaluationModal
        :open="evaluationModalOpen"
        :loading="finishingBrew"
        :evaluation="brew?.evaluation"
        @close="evaluationModalOpen = false"
        @submit="submitEvaluation"
      />
    </template>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { EllipsisVertical, Pencil, Trash2 } from "lucide-vue-next";
import BaseCard from "@/components/base/BaseCard.vue";
import BaseButton from "@/components/base/BaseButton.vue";
import BaseInput from "@/components/base/BaseInput.vue";
import BaseToggle from "@/components/base/BaseToggle.vue";
import CircularCountdown from "@/components/brews/CircularCountdown.vue";
import GravityProgressChart from "@/components/brews/GravityProgressChart.vue";
import RecipeDefaultsSummary from "@/components/recipes/RecipeDefaultsSummary.vue";
import RecipeCostSummary from "@/components/recipes/RecipeCostSummary.vue";
import RecipeIngredientItem from "@/components/recipes/RecipeIngredientItem.vue";
import RecipeStepItem from "@/components/recipes/RecipeStepItem.vue";
import BrewMeasurementModal from "@/components/modals/BrewMeasurementModal.vue";
import BrewEvaluationModal from "@/components/modals/BrewEvaluationModal.vue";
import {
  addBrewMeasurement,
  deleteBrewMeasurement,
  finishBrew,
  updateBrewMeasurement,
  completeBrewStep,
  deleteBrew,
  getBrew,
  pauseBrewStep,
  resetBrewStep,
  saveBrewStepNote,
  setCurrentBrewStep,
  startBrew,
  startBrewStep,
  updateBrew,
} from "@/services/brews.service.js";
import {
  connectBrewLive,
  disconnectBrewLive,
  on as onBrewLive,
  off as offBrewLive,
} from "@/services/brewLive.service.js";
import {
  ingredientCategoryIcon,
  ingredientCategoryLabel,
} from "@/utils/recipeAssets.js";

const route = useRoute();
const router = useRouter();
const { t, locale } = useI18n();

const loading = ref(true);
const error = ref("");
const brew = ref(null);
const activePanel = ref("progress");
const nowTs = ref(Date.now());
const addingMeasurement = ref(false);
const measurementModalOpen = ref(false);
const editingMeasurement = ref(null);
const evaluationModalOpen = ref(false);
const finishingBrew = ref(false);
const measurementMessage = ref("");
const lastAlarmKey = ref("");
const actualOgInput = ref("");
const actualFgInput = ref("");
const savingActualOg = ref(false);
const savingActualFg = ref(false);
const stepNoteInput = ref("");
const savingStepNote = ref(false);
const stepNoteMessage = ref("");
const headerMenuOpen = ref(false);
const headerMenuRoot = ref(null);
const seriesVisibility = ref({
  gravity: true,
  expectedGravity: true,
  temperature: false,
  expectedTemperature: false,
  ph: false,
});

let clockInterval = null;

const gravityPattern = /^1\.\d{3}$/;
const graphStepTypes = ["primary_fermentation", "secondary_fermentation", "cold_crash"];
const dayStepTypes = [...graphStepTypes];

const steps = computed(() => brew.value?.recipeSnapshot?.steps || []);
const ingredients = computed(() => brew.value?.recipeSnapshot?.ingredients || []);

const currentStepIndex = computed(() => {
  const index = Number(brew.value?.progress?.currentStepIndex || 0);
  if (!steps.value.length) return 0;
  if (!Number.isFinite(index)) return 0;
  return Math.max(0, Math.min(index, steps.value.length - 1));
});

const stepProgressById = computed(() => {
  const entries = brew.value?.progress?.stepProgress || [];
  return new Map(entries.map((entry) => [entry.stepId, entry]));
});

const currentStep = computed(() => steps.value[currentStepIndex.value] || null);
const currentStepProgress = computed(() =>
  currentStep.value ? stepProgressById.value.get(currentStep.value.stepId) || null : null,
);
const isCurrentStepDayBased = computed(() =>
  dayStepTypes.includes(currentStep.value?.stepType || ""),
);
const currentStepIngredients = computed(() =>
  currentStep.value ? ingredientsForStep(currentStep.value.stepId) : [],
);
const currentStepDataEntries = computed(() => {
  const data = currentStep.value?.data;
  if (!data || typeof data !== "object") return [];
  return Object.entries(data)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(([key, value]) => ({
      key,
      label: prettifyDataKey(key),
      value: String(value),
    }));
});

const isCurrentStepActive = computed(
  () => currentStepProgress.value?.status === "active",
);

const currentStepActionLabel = computed(() => {
  if (isCurrentStepActive.value) return t("brews.actions.pause_step");
  const pausedRemaining = Number(currentStepProgress.value?.pausedRemainingSeconds);
  if (Number.isFinite(pausedRemaining) && pausedRemaining > 0) {
    return t("brews.actions.resume_step");
  }
  return t("brews.actions.start_step");
});

const timerTotalSeconds = computed(() => {
  if (Number.isFinite(Number(currentStepProgress.value?.timerDurationSeconds))) {
    return Number(currentStepProgress.value.timerDurationSeconds);
  }
  if (Number.isFinite(Number(currentStep.value?.durationMinutes))) {
    return Number(currentStep.value.durationMinutes) * 60;
  }
  return 0;
});

const timerRemainingSeconds = computed(() => {
  if (!timerTotalSeconds.value) return 0;
  if (currentStepProgress.value?.status === "completed") return 0;

  const pausedRemaining = Number(currentStepProgress.value?.pausedRemainingSeconds);
  const endsAt = currentStepProgress.value?.timerEndsAt
    ? new Date(currentStepProgress.value.timerEndsAt).getTime()
    : null;

  if (!endsAt || Number.isNaN(endsAt)) {
    if (Number.isFinite(pausedRemaining) && pausedRemaining >= 0) {
      return Math.min(pausedRemaining, timerTotalSeconds.value);
    }
    return timerTotalSeconds.value;
  }

  const remaining = Math.floor((endsAt - nowTs.value) / 1000);
  return remaining;
});

const showRoundTimer = computed(() => Boolean(currentStep.value && timerTotalSeconds.value > 0));

const showFermentationPanel = computed(() =>
  graphStepTypes.includes(currentStep.value?.stepType || ""),
);

const fermentationRemainingSeconds = computed(() => {
  if (!showFermentationPanel.value) return 0;
  return timerRemainingSeconds.value;
});

const measurementSeries = computed(() =>
  [...(brew.value?.measurements || [])].sort(
    (a, b) => new Date(a.takenAt).getTime() - new Date(b.takenAt).getTime(),
  ),
);

const latestMeasurements = computed(() => [...measurementSeries.value].reverse().slice(0, 8));
const panelToggleOptions = computed(() => [
  { label: t("brews.current.progress_tab"), value: "progress" },
  { label: t("brews.current.recipe_tab"), value: "recipe" },
  { label: t("brews.current.measurements_tab"), value: "measurements" },
]);

const measurementSeriesToggleOptions = computed(() => [
  { key: "gravity", label: t("brews.current.series_gravity") },
  { key: "expectedGravity", label: t("brews.current.series_expected_gravity") },
  { key: "temperature", label: t("brews.current.series_temperature") },
  { key: "expectedTemperature", label: t("brews.current.series_expected_temperature") },
  { key: "ph", label: t("brews.current.series_ph") },
]);

const brewDayElapsedSeconds = computed(() => {
  const startedAt = brew.value?.progress?.brewStartedAt
    ? new Date(brew.value.progress.brewStartedAt).getTime()
    : null;
  if (!startedAt || Number.isNaN(startedAt)) return 0;
  return Math.max(0, Math.floor((nowTs.value - startedAt) / 1000));
});
const totalStepElapsedSeconds = computed(() =>
  (brew.value?.progress?.stepProgress || []).reduce((sum, entry) => {
    const current =
      Number(entry?.loggedDurationSeconds) ||
      Number(entry?.elapsedSeconds) ||
      Number(entry?.accumulatedActiveSeconds) ||
      0;
    return sum + (Number.isFinite(current) ? current : 0);
  }, 0),
);
const targetOgRangeText = computed(() => {
  const defaults = brew.value?.recipeSnapshot?.defaults || {};
  return `${defaults.ogFrom || "-"} - ${defaults.ogTo || "-"}`;
});
const targetFgRangeText = computed(() => {
  const defaults = brew.value?.recipeSnapshot?.defaults || {};
  return `${defaults.fgFrom || "-"} - ${defaults.fgTo || "-"}`;
});

const targetPhValue = computed(() => {
  const value = Number(brew.value?.targetMetrics?.ph);
  return Number.isFinite(value) ? Number(value.toFixed(2)) : "-";
});

const targetCo2Value = computed(() => {
  const fromMetrics = Number(brew.value?.targetMetrics?.co2Volumes);
  if (Number.isFinite(fromMetrics)) return Number(fromMetrics.toFixed(2));
  const fromDefaults = Number(brew.value?.recipeSnapshot?.defaults?.co2Volumes);
  return Number.isFinite(fromDefaults) ? Number(fromDefaults.toFixed(2)) : "-";
});

const targetIbuValue = computed(() => {
  const fromMetrics = Number(brew.value?.targetMetrics?.ibu);
  if (Number.isFinite(fromMetrics)) return Number(fromMetrics.toFixed(1));
  const fromDefaults = Number(brew.value?.recipeSnapshot?.defaults?.ibu);
  return Number.isFinite(fromDefaults) ? Number(fromDefaults.toFixed(1)) : "-";
});

const recipeTotalIngredientCost = computed(() => {
  const backendTotal = Number(brew.value?.recipeCostSummary?.totalIngredientCost);
  if (Number.isFinite(backendTotal)) return backendTotal;
  return (ingredients.value || []).reduce((sum, ingredient) => {
    const price = Number(ingredient?.price);
    if (!Number.isFinite(price) || price < 0) return sum;
    return sum + price;
  }, 0);
});

const recipeLiterPrice = computed(() => {
  const backendLiterPrice = Number(brew.value?.recipeCostSummary?.literPrice);
  if (Number.isFinite(backendLiterPrice)) return backendLiterPrice;
  const liters = Number(brew.value?.recipeSnapshot?.defaults?.batchSizeLiters);
  if (!Number.isFinite(liters) || liters <= 0) return null;
  return recipeTotalIngredientCost.value / liters;
});

function abvFrom(og, fg) {
  if (!Number.isFinite(og) || !Number.isFinite(fg)) return null;
  return Math.max(0, (og - fg) * 131.25);
}

function formatAbv(abv) {
  return abv === null ? "-" : `${abv.toFixed(2)}%`;
}

const plannedAbv = computed(() => abvFrom(Number(targetOg.value), Number(targetFg.value)));

// Once a real FG is saved the ABV is recalculated from it. A saved OG is used
// when there is one, otherwise the planned OG stands in.
const actualAbv = computed(() => {
  const savedFg = parseGravityValue(actualFgInput.value);
  if (savedFg === null) return null;
  const savedOg = parseGravityValue(actualOgInput.value);
  const og = savedOg === null ? Number(targetOg.value) : savedOg;
  return abvFrom(og, savedFg);
});

const abvText = computed(() => {
  if (actualAbv.value === null) return formatAbv(plannedAbv.value);
  if (plannedAbv.value === null) return formatAbv(actualAbv.value);
  return t("brews.current.actual_abv_planned", {
    actual: formatAbv(actualAbv.value),
    planned: formatAbv(plannedAbv.value),
  });
});

const targetOg = computed(() => {
  const defaults = brew.value?.recipeSnapshot?.defaults || {};
  const ogFrom = Number(defaults.ogFrom);
  const ogTo = Number(defaults.ogTo);
  if (Number.isFinite(ogFrom) && Number.isFinite(ogTo)) {
    return Number(((ogFrom + ogTo) / 2).toFixed(3));
  }
  if (Number.isFinite(ogFrom)) return ogFrom;
  if (Number.isFinite(ogTo)) return ogTo;
  const target = Number(brew.value?.targetMetrics?.og);
  return Number.isFinite(target) ? target : null;
});

const targetFg = computed(() => {
  const defaults = brew.value?.recipeSnapshot?.defaults || {};
  const fgFrom = Number(defaults.fgFrom);
  const fgTo = Number(defaults.fgTo);
  if (Number.isFinite(fgFrom) && Number.isFinite(fgTo)) {
    return Number(((fgFrom + fgTo) / 2).toFixed(3));
  }
  if (Number.isFinite(fgFrom)) return fgFrom;
  if (Number.isFinite(fgTo)) return fgTo;
  const target = Number(brew.value?.targetMetrics?.fg);
  return Number.isFinite(target) ? target : null;
});

const fermentationSteps = computed(() =>
  (steps.value || []).filter((step) => graphStepTypes.includes(step?.stepType || "")),
);

const fermentationStartMs = computed(() => {
  const timelineStart = brew.value?.timeline?.fermentationStartAt
    ? new Date(brew.value.timeline.fermentationStartAt).getTime()
    : NaN;
  if (Number.isFinite(timelineStart)) return timelineStart;

  const brewStart = brew.value?.progress?.brewStartedAt
    ? new Date(brew.value.progress.brewStartedAt).getTime()
    : NaN;
  if (Number.isFinite(brewStart)) return brewStart;

  const firstMeasurement = measurementSeries.value[0]?.takenAt
    ? new Date(measurementSeries.value[0].takenAt).getTime()
    : NaN;
  return Number.isFinite(firstMeasurement) ? firstMeasurement : NaN;
});

const fermentationDurationMs = computed(() => {
  const durationMinutes = fermentationSteps.value.reduce((sum, step) => {
    const minutes = Number(step?.durationMinutes);
    if (!Number.isFinite(minutes) || minutes <= 0) return sum;
    return sum + minutes;
  }, 0);

  if (durationMinutes > 0) return durationMinutes * 60 * 1000;

  const first = measurementSeries.value[0]?.takenAt
    ? new Date(measurementSeries.value[0].takenAt).getTime()
    : NaN;
  const last = measurementSeries.value.length
    ? new Date(measurementSeries.value[measurementSeries.value.length - 1].takenAt).getTime()
    : NaN;
  if (Number.isFinite(first) && Number.isFinite(last) && last > first) return last - first;

  return 7 * 24 * 60 * 60 * 1000;
});

const fermentationEndMs = computed(() => {
  if (!Number.isFinite(fermentationStartMs.value)) return NaN;
  return fermentationStartMs.value + fermentationDurationMs.value;
});

const expectedTemperatureSegments = computed(() => {
  if (!Number.isFinite(fermentationStartMs.value)) return [];

  let cursor = fermentationStartMs.value;
  let previousTemperature = null;
  const segments = [];

  for (const step of fermentationSteps.value) {
    const minutes = Number(step?.durationMinutes);
    if (!Number.isFinite(minutes) || minutes <= 0) continue;
    const durationMs = minutes * 60 * 1000;
    const rawTemp = Number(step?.temperatureC);
    const temperature = Number.isFinite(rawTemp) ? rawTemp : previousTemperature;
    segments.push({
      from: cursor,
      to: cursor + durationMs,
      temperature,
    });
    if (Number.isFinite(rawTemp)) previousTemperature = rawTemp;
    cursor += durationMs;
  }

  return segments;
});

// Every series is plotted as {x: timestamp, y: value} so the chart can use a real
// time axis. Measurements without a given value are simply left out of that
// series instead of being plotted as a gap or a zero.
function measurementPoints(readValue) {
  const points = [];
  for (const measurement of measurementSeries.value) {
    const ts = new Date(measurement?.takenAt).getTime();
    if (!Number.isFinite(ts)) continue;
    const value = readValue(measurement);
    if (!Number.isFinite(value)) continue;
    points.push({ x: ts, y: value });
  }
  return points;
}

const actualGravityPoints = computed(() =>
  measurementPoints((measurement) => Number(measurementGravityValue(measurement))),
);

const actualTemperaturePoints = computed(() =>
  measurementPoints((measurement) => Number(measurement?.temperatureC)),
);

// pH is never 0 either, so treat a stored 0 as "not measured".
const actualPhPoints = computed(() =>
  measurementPoints((measurement) => {
    const value = Number(measurement?.ph);
    return value > 0 ? value : NaN;
  }),
);

const expectedCurveTimes = computed(() => {
  const start = fermentationStartMs.value;
  const end = fermentationEndMs.value;
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return [];

  const segments = 60;
  const stepSize = (end - start) / segments;
  return Array.from({ length: segments + 1 }, (_, idx) => Math.round(start + stepSize * idx));
});

const expectedGravityPoints = computed(() =>
  expectedCurveTimes.value
    .map((ts) => ({ x: ts, y: expectedGravityAt(ts) }))
    .filter((point) => Number.isFinite(point.y)),
);

// The expected temperature is constant within each fermentation step, so the
// segment boundaries are enough to draw it as a staircase.
const expectedTemperaturePoints = computed(() => {
  const points = [];
  for (const segment of expectedTemperatureSegments.value) {
    const temperature = Number(segment?.temperature);
    if (!Number.isFinite(temperature)) continue;
    const value = Number(temperature.toFixed(2));
    points.push({ x: segment.from, y: value });
    points.push({ x: segment.to, y: value });
  }
  return points;
});

const measurementChartDatasets = computed(() => {
  const datasets = [];

  if (seriesVisibility.value.gravity) {
    datasets.push({
      label: t("brews.current.series_gravity"),
      data: actualGravityPoints.value,
      borderColor: "rgb(16, 185, 129)",
      backgroundColor: "rgba(16, 185, 129, 0.15)",
      fill: false,
      pointRadius: 3,
      pointHoverRadius: 4,
      yAxisID: "yGravity",
    });
  }

  if (seriesVisibility.value.expectedGravity) {
    datasets.push({
      label: t("brews.current.series_expected_gravity"),
      data: expectedGravityPoints.value,
      borderColor: "rgb(245, 158, 11)",
      borderDash: [6, 6],
      fill: false,
      pointRadius: 0,
      pointHoverRadius: 0,
      yAxisID: "yGravity",
      tension: 0,
    });
  }

  if (seriesVisibility.value.temperature) {
    datasets.push({
      label: t("brews.current.series_temperature"),
      data: actualTemperaturePoints.value,
      borderColor: "rgb(59, 130, 246)",
      fill: false,
      pointRadius: 3,
      pointHoverRadius: 4,
      yAxisID: "yTemperature",
    });
  }

  if (seriesVisibility.value.expectedTemperature) {
    datasets.push({
      label: t("brews.current.series_expected_temperature"),
      data: expectedTemperaturePoints.value,
      borderColor: "rgb(147, 197, 253)",
      borderDash: [5, 5],
      fill: false,
      pointRadius: 0,
      pointHoverRadius: 0,
      yAxisID: "yTemperature",
      tension: 0,
    });
  }

  if (seriesVisibility.value.ph) {
    datasets.push({
      label: t("brews.current.series_ph"),
      data: actualPhPoints.value,
      borderColor: "rgb(236, 72, 153)",
      fill: false,
      pointRadius: 3,
      pointHoverRadius: 4,
      yAxisID: "yPh",
    });
  }

  return datasets;
});

function measurementGravityValue(measurement) {
  const candidates = [
    measurement?.gravity,
    measurement?.sg,
    measurement?.og,
    measurement?.fg,
  ];
  for (const value of candidates) {
    const numeric = Number(value);
    // A gravity is always around 1.000, so a 0 is a missing value, not a reading.
    if (Number.isFinite(numeric) && numeric > 0) return numeric;
  }
  return null;
}

function expectedGravityAt(timestampMs) {
  const og = Number(targetOg.value);
  const fg = Number(targetFg.value);
  const start = Number(fermentationStartMs.value);
  const end = Number(fermentationEndMs.value);
  const ts = Number(timestampMs);

  if (!Number.isFinite(og) || !Number.isFinite(fg)) return null;
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null;
  if (!Number.isFinite(ts)) return null;
  if (ts <= start) return og;
  if (ts >= end) return fg;

  const ratio = (ts - start) / (end - start);
  const steepness = 4.5;
  const normalized = (1 - Math.exp(-steepness * ratio)) / (1 - Math.exp(-steepness));
  return Number((og - (og - fg) * normalized).toFixed(3));
}

function statusLabel(status) {
  return t(`brews.status.${status || "planned"}`);
}

function stepStatusLabel(status, entry = null) {
  const pausedRemaining = Number(entry?.pausedRemainingSeconds);
  if (status === "pending" && Number.isFinite(pausedRemaining) && pausedRemaining > 0) {
    return t("brews.step_status.paused");
  }
  return t(`brews.step_status.${status || "pending"}`);
}

function stepTypeLabel(value) {
  return t(`recipes.step_types.${value || "custom"}`);
}

function ingredientCategoryText(category) {
  return ingredientCategoryLabel(t, category);
}

function ingredientsForStep(stepId) {
  return ingredients.value.filter((ingredient) => (ingredient.stepIds || []).includes(stepId));
}

function stepProgress(stepId) {
  return stepProgressById.value.get(stepId);
}

function isDayBasedStep(step) {
  return dayStepTypes.includes(step?.stepType || "");
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

function prettifyDataKey(key) {
  return String(key)
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^./, (char) => char.toUpperCase());
}

function playAlarmTune() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const notes = [523.25, 659.25, 783.99, 659.25];
    notes.forEach((frequency, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = frequency;
      osc.connect(gain);
      gain.connect(ctx.destination);

      const startAt = ctx.currentTime + idx * 0.18;
      gain.gain.setValueAtTime(0.0001, startAt);
      gain.gain.exponentialRampToValueAtTime(0.22, startAt + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.16);

      osc.start(startAt);
      osc.stop(startAt + 0.17);
    });

    setTimeout(() => {
      ctx.close().catch(() => {});
    }, 1200);
  } catch (_err) {
    // no-op when browser blocks autoplay/audio
  }
}

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
}

function formatValue(value) {
  if (value === null || value === undefined || value === "") return "-";
  return value;
}

// Gravity and pH are never 0, so a stored 0 means the field was left blank.
function isPositiveReading(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0;
}

const measurementFields = [
  { key: "gravity", labelKey: "brews.measurements.gravity", positiveOnly: true },
  { key: "temperatureC", labelKey: "brews.measurements.temperature", suffix: " °C" },
  { key: "ph", labelKey: "brews.measurements.ph", positiveOnly: true },
  { key: "og", labelKey: "brews.measurements.og", positiveOnly: true },
  { key: "fg", labelKey: "brews.measurements.fg", positiveOnly: true },
  { key: "sg", labelKey: "brews.measurements.sg", positiveOnly: true },
  { key: "co2Volumes", labelKey: "brews.measurements.co2_volumes" },
  { key: "ibu", labelKey: "brews.measurements.ibu" },
];

// A measurement only carries the fields that were actually filled in, so the
// list shows those and leaves the rest out entirely.
function measurementReadings(measurement) {
  const readings = [];

  for (const field of measurementFields) {
    const raw = measurement?.[field.key];
    if (raw === null || raw === undefined || raw === "") continue;
    const numeric = Number(raw);
    if (!Number.isFinite(numeric)) continue;
    if (field.positiveOnly && !isPositiveReading(numeric)) continue;
    readings.push({
      key: field.key,
      label: t(field.labelKey),
      value: `${numeric}${field.suffix || ""}`,
    });
  }

  return readings;
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

function parseGravityValue(value) {
  const text = String(value || "").trim();
  if (!gravityPattern.test(text)) return null;
  const n = Number(text);
  return Number.isFinite(n) ? n : null;
}

function formatGravityValue(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return "";
  return n.toFixed(3);
}

function formatDuration(seconds) {
  const value = Number(seconds) || 0;
  const sign = value < 0 ? "-" : "";
  const total = Math.abs(Math.floor(value));
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  if (days > 0) return `${sign}${days}d ${hours}h ${minutes}m`;
  return `${sign}${hours}h ${minutes}m`;
}

function formatStopwatch(seconds) {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  const hh = String(hours).padStart(2, "0");
  const mm = String(minutes).padStart(2, "0");
  const ss = String(secs).padStart(2, "0");
  if (days > 0) return `${days}d ${hh}:${mm}:${ss}`;
  return `${hh}:${mm}:${ss}`;
}

function hydrateActualMetricsInputs() {
  actualOgInput.value = formatGravityValue(brew.value?.actualMetrics?.og);
  actualFgInput.value = formatGravityValue(brew.value?.actualMetrics?.fg);
}

function hydrateCurrentStepNote() {
  stepNoteInput.value = String(currentStepProgress.value?.note || "");
}

function toggleMeasurementSeries(seriesKey) {
  if (!Object.prototype.hasOwnProperty.call(seriesVisibility.value, seriesKey)) return;
  seriesVisibility.value = {
    ...seriesVisibility.value,
    [seriesKey]: !seriesVisibility.value[seriesKey],
  };
}

function setActivePanel(value) {
  if (value === "recipe") {
    activePanel.value = "recipe";
    return;
  }
  if (value === "measurements") {
    activePanel.value = "measurements";
    return;
  }
  activePanel.value = "progress";
}

function toggleHeaderMenu() {
  headerMenuOpen.value = !headerMenuOpen.value;
}

function closeHeaderMenu() {
  headerMenuOpen.value = false;
}

function handleDocumentClick(event) {
  if (!headerMenuOpen.value) return;
  const root = headerMenuRoot.value;
  if (!root) return;
  if (event?.target instanceof Node && !root.contains(event.target)) {
    headerMenuOpen.value = false;
  }
}

async function editBrewAction() {
  closeHeaderMenu();
  if (!brew.value?._id) return;
  await router.push(`/brygg/${brew.value._id}/planlegging`);
}

const isCompleted = computed(() => brew.value?.status === "completed");

// Finishing a brew means evaluating it, so the rating modal comes first.
function finishBrewAction() {
  closeHeaderMenu();
  if (!brew.value?._id) return;
  evaluationModalOpen.value = true;
}

async function submitEvaluation(payload) {
  if (!brew.value?._id) return;

  finishingBrew.value = true;
  error.value = "";
  try {
    brew.value = await finishBrew(brew.value._id, payload || {});
    evaluationModalOpen.value = false;
    measurementMessage.value = t("brews.current.brew_finished");
  } catch (err) {
    error.value = err?.response?.data?.error || err?.message || t("brews.errors.save_failed");
  } finally {
    finishingBrew.value = false;
  }
}

async function deleteBrewAction() {
  closeHeaderMenu();
  if (!brew.value?._id) return;

  const confirmed = window.confirm(t("brews.current.confirm_delete"));
  if (!confirmed) return;

  try {
    await deleteBrew(brew.value._id);
    await router.push("/brygg/tidligere");
  } catch (err) {
    error.value = err?.response?.data?.error || err?.message || t("brews.errors.save_failed");
  }
}

// OG and FG are saved one at a time - the backend only touches the fields that
// are present in the payload, so saving one leaves the other untouched.
async function saveActualMetric(field, rawValue, savingFlag, successKey) {
  if (!brew.value?._id) return;

  const value = parseGravityValue(rawValue);
  if (value === null) {
    error.value = t("brews.current.actual_format_error");
    return;
  }

  savingFlag.value = true;
  error.value = "";
  try {
    brew.value = await updateBrew(brew.value._id, {
      actualMetrics: { [field]: value },
    });
    hydrateActualMetricsInputs();
    measurementMessage.value = t(successKey);
  } catch (err) {
    error.value = err?.response?.data?.error || err?.message || t("brews.errors.save_failed");
  } finally {
    savingFlag.value = false;
  }
}

function saveActualOg() {
  return saveActualMetric("og", actualOgInput.value, savingActualOg, "brews.current.og_saved");
}

function saveActualFg() {
  return saveActualMetric("fg", actualFgInput.value, savingActualFg, "brews.current.fg_saved");
}

async function saveCurrentStepNote() {
  if (!brew.value?._id || !currentStep.value?.stepId) return;

  savingStepNote.value = true;
  stepNoteMessage.value = "";
  error.value = "";
  try {
    brew.value = await saveBrewStepNote(
      brew.value._id,
      currentStep.value.stepId,
      stepNoteInput.value,
    );
    stepNoteMessage.value = t("brews.current.step_note_saved");
  } catch (err) {
    stepNoteMessage.value =
      err?.response?.data?.error || err?.message || t("brews.errors.step_failed");
  } finally {
    savingStepNote.value = false;
  }
}

async function loadBrew() {
  loading.value = true;
  error.value = "";
  try {
    brew.value = await getBrew(route.params.brewId);
  } catch (err) {
    error.value = err?.response?.data?.error || err?.message || t("brews.errors.fetch_failed");
  } finally {
    loading.value = false;
  }
}

async function refreshBrewLive() {
  try {
    brew.value = await getBrew(route.params.brewId);
  } catch (_err) {
    // ignore transient live refresh errors
  }
}

async function handleLiveBrewUpdate(payload) {
  const liveBrewId = String(payload?.brewId || "");
  const currentId = String(route.params.brewId || "");
  if (liveBrewId && currentId && liveBrewId !== currentId) return;
  await refreshBrewLive();
}

function handleLiveBrewDeleted(payload) {
  const liveBrewId = String(payload?.brewId || "");
  const currentId = String(route.params.brewId || "");
  if (liveBrewId && currentId && liveBrewId !== currentId) return;
  error.value = t("brews.errors.deleted");
  brew.value = null;
}

function setupLiveConnection(brewId) {
  const id = String(brewId || "").trim();
  if (!id) return;
  connectBrewLive(id);
  offBrewLive("brewUpdate", handleLiveBrewUpdate);
  offBrewLive("brewDeleted", handleLiveBrewDeleted);
  onBrewLive("brewUpdate", handleLiveBrewUpdate);
  onBrewLive("brewDeleted", handleLiveBrewDeleted);
}

async function showStep(index) {
  if (!brew.value?._id) return;
  brew.value = await setCurrentBrewStep(brew.value._id, index);
}

async function previousStep() {
  await showStep(currentStepIndex.value - 1);
}

async function nextStep() {
  await showStep(currentStepIndex.value + 1);
}

async function startBrewDayAction() {
  if (!brew.value?._id) return;
  try {
    brew.value = await startBrew(brew.value._id);
    measurementMessage.value = t("brews.current.brew_started");
  } catch (err) {
    error.value = err?.response?.data?.error || err?.message || t("brews.errors.start_failed");
  }
}

async function startCurrentStep() {
  if (!brew.value?._id || !currentStep.value?.stepId) return;
  if (brew.value.status === "planned") {
    brew.value = await startBrew(brew.value._id);
  }
  brew.value = await startBrewStep(brew.value._id, currentStep.value.stepId);
}

async function pauseCurrentStep() {
  if (!brew.value?._id || !currentStep.value?.stepId) return;
  brew.value = await pauseBrewStep(brew.value._id, currentStep.value.stepId);
}

async function toggleCurrentStepRunning() {
  if (!brew.value?._id || !currentStep.value?.stepId) return;

  try {
    if (isCurrentStepActive.value) {
      await pauseCurrentStep();
      measurementMessage.value = t("brews.current.step_paused");
    } else {
      await startCurrentStep();
      measurementMessage.value = t("brews.current.step_started");
    }
  } catch (err) {
    error.value = err?.response?.data?.error || err?.message || t("brews.errors.step_failed");
  }
}

async function completeCurrentStepAction() {
  if (!brew.value?._id || !currentStep.value?.stepId) return;
  try {
    brew.value = await completeBrewStep(brew.value._id, currentStep.value.stepId);
  } catch (err) {
    error.value = err?.response?.data?.error || err?.message || t("brews.errors.step_failed");
  }
}

async function resetCurrentStepAction() {
  if (!brew.value?._id || !currentStep.value?.stepId) return;
  try {
    brew.value = await resetBrewStep(brew.value._id, currentStep.value.stepId);
  } catch (err) {
    error.value = err?.response?.data?.error || err?.message || t("brews.errors.step_failed");
  }
}

function openNewMeasurement() {
  editingMeasurement.value = null;
  measurementModalOpen.value = true;
}

function openEditMeasurement(measurement) {
  editingMeasurement.value = measurement;
  measurementModalOpen.value = true;
}

function closeMeasurementModal() {
  measurementModalOpen.value = false;
  editingMeasurement.value = null;
}

async function removeMeasurement(measurement) {
  const measurementId = measurement?._id;
  if (!brew.value?._id || !measurementId) return;
  if (!window.confirm(t("brews.current.confirm_delete_measurement"))) return;

  addingMeasurement.value = true;
  measurementMessage.value = "";
  try {
    await deleteBrewMeasurement(brew.value._id, measurementId);
    measurementMessage.value = t("brews.current.measurement_deleted");
    await loadBrew();
  } catch (err) {
    measurementMessage.value =
      err?.response?.data?.error || err?.message || t("brews.errors.measurement_failed");
  } finally {
    addingMeasurement.value = false;
  }
}

async function submitMeasurement(payload) {
  if (!brew.value?._id) return;
  const measurementId = editingMeasurement.value?._id;
  addingMeasurement.value = true;
  measurementMessage.value = "";
  try {
    if (measurementId) {
      await updateBrewMeasurement(brew.value._id, measurementId, payload || {});
    } else {
      await addBrewMeasurement(brew.value._id, payload || {});
    }
    closeMeasurementModal();
    measurementMessage.value = measurementId
      ? t("brews.current.measurement_updated")
      : t("brews.current.measurement_added");
    await loadBrew();
  } catch (err) {
    measurementMessage.value =
      err?.response?.data?.error || err?.message || t("brews.errors.measurement_failed");
  } finally {
    addingMeasurement.value = false;
  }
}

watch(
  () => [timerRemainingSeconds.value, isCurrentStepActive.value, currentStep.value?.stepId],
  ([remaining, isActive, stepId], oldTuple) => {
    const prevRemaining = Array.isArray(oldTuple) ? oldTuple[0] : undefined;
    if (!isActive || !stepId || !timerTotalSeconds.value) return;
    if (typeof prevRemaining !== "number") return;
    if (prevRemaining > 0 && remaining <= 0) {
      const key = `${brew.value?._id || "brew"}:${stepId}:${currentStepProgress.value?.startedAt || ""}`;
      if (lastAlarmKey.value !== key) {
        lastAlarmKey.value = key;
        playAlarmTune();
      }
    }
  },
);

watch(
  () => brew.value,
  () => {
    hydrateActualMetricsInputs();
    hydrateCurrentStepNote();
  },
  { immediate: true },
);

watch(
  () => currentStep.value?.stepId,
  () => {
    hydrateCurrentStepNote();
    stepNoteMessage.value = "";
  },
);

watch(
  () => route.params.brewId,
  (brewId) => {
    if (!brewId) return;
    loadBrew();
    setupLiveConnection(brewId);
  },
);

onMounted(async () => {
  document.addEventListener("click", handleDocumentClick);
  await loadBrew();
  setupLiveConnection(route.params.brewId);
  clockInterval = setInterval(() => {
    nowTs.value = Date.now();
  }, 1000);
});

onBeforeUnmount(() => {
  document.removeEventListener("click", handleDocumentClick);
  offBrewLive("brewUpdate", handleLiveBrewUpdate);
  offBrewLive("brewDeleted", handleLiveBrewDeleted);
  disconnectBrewLive();
  if (clockInterval) clearInterval(clockInterval);
});
</script>
