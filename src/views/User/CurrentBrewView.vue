<template>
  <section class="mx-auto w-full max-w-6xl px-4 py-8 space-y-6">
    <BaseCard v-if="loading">
      <p>{{ t("common.loading") }}</p>
    </BaseCard>

    <BaseCard v-else-if="error">
      <p class="text-red-600">{{ error }}</p>
    </BaseCard>

    <template v-else-if="brew">
      <div class="space-y-3">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0 flex-1">
            <h1 class="truncate">{{ brew.name }}</h1>
            <p class="mt-1 text-sm opacity-80">{{ statusLabel(brew.status) }}</p>
            <p v-if="brew.progress?.brewStartedAt" class="mt-1 text-xs opacity-70">
              {{ t("brews.fields.brew_started_at") }}: {{ formatDateTime(brew.progress.brewStartedAt) }}
            </p>
            <p v-if="brew.progress?.brewStartedAt" class="mt-1 text-xs opacity-70">
              {{ t("brews.fields.brew_day_elapsed") }}: {{ formatStopwatch(brewDayElapsedSeconds) }}
            </p>
            <p class="mt-1 text-xs opacity-70">
              {{ t("brews.fields.total_step_time") }}: {{ formatStopwatch(totalStepElapsedSeconds) }}
            </p>
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
                  {{ t("brews.actions.finish") }}
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
        <BaseCard v-if="currentStep" class="space-y-5">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p class="text-xs uppercase tracking-wide opacity-70">
                {{ t("brews.current.step_label", { current: currentStepIndex + 1, total: steps.length }) }}
              </p>
              <h3>{{ currentStep.title }}</h3>
              <p class="text-sm opacity-80">{{ stepTypeLabel(currentStep.stepType) }}</p>
            </div>
            <span class="rounded-full bg-bg4 px-2 py-1 text-xs">
              {{ stepStatusLabel(currentStepProgress?.status || "pending", currentStepProgress) }}
            </span>
          </div>

          <div class="grid gap-2 text-sm opacity-90 md:grid-cols-3">
            <p>{{ t("recipes.detail.time") }}: {{ stepDurationLabel(currentStep) }}</p>
            <p>{{ t("recipes.detail.temp") }}: {{ currentStep.temperatureC ?? "-" }} °C</p>
          </div>

          <CircularCountdown
            v-if="showRoundTimer"
            :remaining-seconds="timerRemainingSeconds"
            :total-seconds="timerTotalSeconds"
            :label="t('brews.current.timer_remaining')"
            :show-days="isCurrentStepDayBased"
          />

          <div class="space-y-3 rounded-lg border border-border3 p-4">
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

          <div class="space-y-2 rounded-lg border border-border3 p-4">
            <label class="block text-sm font-medium">
              {{ t("brews.current.step_note_label") }}
            </label>
            <textarea
              v-model="stepNoteInput"
              class="w-full rounded-lg border border-border4 bg-bg4 px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-button1"
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
        </BaseCard>

        <BaseCard v-if="steps.length" class="space-y-3">
          <h3>{{ t("brews.current.all_steps") }}</h3>
          <div class="space-y-2">
            <div
              v-for="(step, index) in steps"
              :key="step.stepId || index"
              class="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border3 px-3 py-2"
              :class="{ 'border-button1-border bg-bg4': index === currentStepIndex }"
            >
              <div>
                <p class="font-medium">{{ index + 1 }}. {{ step.title }}</p>
                <p class="text-xs opacity-70">{{ stepTypeLabel(step.stepType) }}</p>
                <p v-if="stepProgress(step.stepId)?.startedAt" class="text-xs opacity-70">
                  {{ t("brews.fields.step_started_at") }}: {{ formatDateTime(stepProgress(step.stepId)?.startedAt) }}
                </p>
                <p v-if="stepProgress(step.stepId)?.completedAt" class="text-xs opacity-70">
                  {{ t("brews.fields.step_completed_at") }}: {{ formatDateTime(stepProgress(step.stepId)?.completedAt) }}
                </p>
                <p
                  v-if="stepProgress(step.stepId)?.loggedDurationSeconds !== undefined"
                  class="text-xs opacity-70"
                >
                  {{ t("brews.fields.step_used_time") }}: {{ formatDuration(stepProgress(step.stepId)?.loggedDurationSeconds) }}
                </p>
                <p v-if="stepProgress(step.stepId)?.note" class="text-xs opacity-75">
                  {{ t("brews.current.step_note_label") }}: {{ stepProgress(step.stepId)?.note }}
                </p>
              </div>
              <div class="flex items-center gap-2">
                <span class="rounded-full bg-bg4 px-2 py-1 text-xs">
                  {{ stepStatusLabel(stepProgress(step.stepId)?.status || "pending", stepProgress(step.stepId)) }}
                </span>
                <BaseButton type="button" variant="button3" @click="showStep(index)">
                  {{ t("brews.actions.show_step") }}
                </BaseButton>
              </div>
            </div>
          </div>
        </BaseCard>

      </template>

      <template v-else-if="activePanel === 'recipe'">
        <BaseCard>
          <h3>{{ t("recipes.detail.defaults") }}</h3>
          <div class="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 text-sm">
            <div>{{ t("recipes.metrics.og") }}: {{ brew.recipeSnapshot?.defaults?.ogFrom || "-" }} - {{ brew.recipeSnapshot?.defaults?.ogTo || "-" }}</div>
            <div>{{ t("recipes.metrics.fg") }}: {{ brew.recipeSnapshot?.defaults?.fgFrom || "-" }} - {{ brew.recipeSnapshot?.defaults?.fgTo || "-" }}</div>
            <div>{{ t("recipes.metrics.co2") }}: {{ formatValue(brew.recipeSnapshot?.defaults?.co2Volumes) }}</div>
            <div>{{ t("recipes.metrics.ibu") }}: {{ formatValue(brew.recipeSnapshot?.defaults?.ibu) }}</div>
            <div>{{ t("recipes.fields.batch_size_liters") }}: {{ formatValue(brew.recipeSnapshot?.defaults?.batchSizeLiters) }}</div>
          </div>
        </BaseCard>

        <BaseCard>
          <h3>{{ t("recipes.detail.cost_summary") }}</h3>
          <div class="mt-3 grid gap-2 sm:grid-cols-2 text-sm">
            <p>
              {{ t("recipes.detail.total_ingredients_cost") }}:
              <strong>{{ formatCurrency(recipeTotalIngredientCost) }}</strong>
            </p>
            <p>
              {{ t("recipes.detail.liter_price") }}:
              <strong>{{ recipeLiterPrice !== null ? formatCurrency(recipeLiterPrice) : "-" }}</strong>
            </p>
          </div>
        </BaseCard>

        <BaseCard>
          <h3>{{ t("recipes.detail.ingredients") }}</h3>
          <div class="mt-3 space-y-2">
            <div v-if="!ingredients.length" class="text-sm opacity-70">{{ t("recipes.detail.no_ingredients") }}</div>
            <div
              v-for="ingredient in ingredients"
              :key="ingredient.ingredientId"
              class="rounded-lg border border-border3 p-3"
            >
              <div class="flex flex-wrap items-center justify-between gap-2">
                <div class="flex items-center gap-2">
                  <img :src="ingredientCategoryIcon(ingredient.category)" :alt="ingredientCategoryText(ingredient.category)" class="h-7 w-7 rounded-md border border-border3 bg-white p-1 object-contain" />
                  <h4>{{ ingredient.name }}</h4>
                </div>
                <span class="rounded-full bg-bg4 px-2 py-1 text-xs">{{ ingredientCategoryText(ingredient.category) }}</span>
              </div>
              <p class="mt-1 text-sm opacity-90">{{ [ingredient.amount, ingredient.unit].filter(Boolean).join(" ") || "-" }}</p>
              <p class="mt-1 text-sm opacity-85">
                {{ t("recipes.fields.price") }}:
                {{ ingredient.price !== null && ingredient.price !== undefined ? formatCurrency(ingredient.price) : "-" }}
              </p>
              <p v-if="ingredient.notes" class="mt-1 text-sm opacity-80">{{ ingredient.notes }}</p>
              <div v-if="ingredientStepTags(ingredient).length" class="mt-2 space-y-1">
                <p class="text-xs font-semibold uppercase opacity-70">{{ t("recipes.detail.used_in_steps") }}</p>
                <div class="flex flex-wrap gap-2">
                  <span
                    v-for="stepTag in ingredientStepTags(ingredient)"
                    :key="`${ingredient.ingredientId}-${stepTag}`"
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
            <div
              v-for="step in steps"
              :key="`${step.stepId}-${step.order}`"
              class="rounded-lg border border-border3 p-3"
            >
              <div class="flex flex-wrap items-center justify-between gap-2">
                <h4>{{ step.order }}. {{ step.title }}</h4>
                <span class="rounded-full bg-bg4 px-2 py-1 text-xs">{{ stepTypeLabel(step.stepType) }}</span>
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
                    v-for="ingredient in ingredientsForStep(step.stepId)"
                    :key="`${step.stepId}-${ingredient.ingredientId}`"
                    class="rounded-full border border-border3 px-2 py-1 text-xs"
                  >
                    {{ ingredient.name }}
                  </span>
                </div>
              </div>
            </div>
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
            <BaseButton type="button" :disabled="addingMeasurement" @click="measurementModalOpen = true">
              {{ t("brews.actions.add_measurement") }}
            </BaseButton>
          </div>

          <div class="grid gap-2 text-sm opacity-90 sm:grid-cols-2 lg:grid-cols-3">
            <p>{{ t("brews.fields.target_og") }}: {{ targetOgRangeText }}</p>
            <p>{{ t("brews.fields.target_fg") }}: {{ targetFgRangeText }}</p>
            <p>{{ t("brews.fields.target_gravity") }}: {{ formatValue(targetGravityValue) }}</p>
            <p>{{ t("brews.fields.target_sg") }}: {{ formatValue(targetSgValue) }}</p>
            <p>{{ t("brews.fields.target_ph") }}: {{ formatValue(targetPhValue) }}</p>
            <p>{{ t("brews.fields.target_co2") }}: {{ formatValue(targetCo2Value) }}</p>
            <p>{{ t("brews.fields.target_ibu") }}: {{ formatValue(targetIbuValue) }}</p>
            <p>{{ t("brews.fields.actual_abv") }}: {{ actualAbvText }}</p>
          </div>

          <div class="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <BaseInput
              v-model="actualOgInput"
              :label="t('brews.fields.actual_og')"
              placeholder="1.056"
            />
            <BaseInput
              v-model="actualFgInput"
              :label="t('brews.fields.actual_fg')"
              placeholder="1.012"
            />
            <BaseButton
              type="button"
              :disabled="savingActualMetrics"
              @click="saveActualMetrics"
            >
              {{ savingActualMetrics ? t("common.saving") : t("brews.actions.save_actual_metrics") }}
            </BaseButton>
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
            :labels="measurementChartLabels"
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
              <p class="font-medium">{{ formatDateTime(measurement.takenAt) }}</p>
              <p class="opacity-80">
                {{ t("brews.measurements.gravity") }}: {{ formatValue(measurement.gravity) }} |
                {{ t("brews.measurements.temperature") }}: {{ formatValue(measurement.temperatureC) }} °C |
                {{ t("brews.measurements.ph") }}: {{ formatValue(measurement.ph) }}
              </p>
              <p class="opacity-80">
                {{ t("brews.measurements.og") }}: {{ formatValue(measurement.og) }} |
                {{ t("brews.measurements.fg") }}: {{ formatValue(measurement.fg) }} |
                {{ t("brews.measurements.sg") }}: {{ formatValue(measurement.sg) }}
              </p>
              <p class="opacity-80">
                {{ t("brews.measurements.co2_volumes") }}: {{ formatValue(measurement.co2Volumes) }} |
                {{ t("brews.measurements.ibu") }}: {{ formatValue(measurement.ibu) }}
              </p>
              <p v-if="measurement.note" class="opacity-80">{{ measurement.note }}</p>
            </div>
          </div>
        </BaseCard>
      </template>

      <BrewMeasurementModal
        :open="measurementModalOpen"
        :loading="addingMeasurement"
        @close="measurementModalOpen = false"
        @submit="submitMeasurement"
      />
    </template>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { EllipsisVertical } from "lucide-vue-next";
import BaseCard from "@/components/base/BaseCard.vue";
import BaseButton from "@/components/base/BaseButton.vue";
import BaseInput from "@/components/base/BaseInput.vue";
import BaseToggle from "@/components/base/BaseToggle.vue";
import CircularCountdown from "@/components/brews/CircularCountdown.vue";
import GravityProgressChart from "@/components/brews/GravityProgressChart.vue";
import BrewMeasurementModal from "@/components/modals/BrewMeasurementModal.vue";
import {
  addBrewMeasurement,
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
const measurementMessage = ref("");
const lastAlarmKey = ref("");
const actualOgInput = ref("");
const actualFgInput = ref("");
const savingActualMetrics = ref(false);
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

const targetGravityValue = computed(() => {
  const value = Number(brew.value?.targetMetrics?.gravity);
  return Number.isFinite(value) ? Number(value.toFixed(3)) : "-";
});

const targetSgValue = computed(() => {
  const value = Number(brew.value?.targetMetrics?.sg);
  return Number.isFinite(value) ? Number(value.toFixed(3)) : "-";
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

const actualAbvText = computed(() => {
  const og = parseGravityValue(actualOgInput.value);
  const fg = parseGravityValue(actualFgInput.value);
  if (og === null || fg === null) return "-";
  const abv = Math.max(0, (og - fg) * 131.25);
  return `${abv.toFixed(2)}%`;
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

const measurementChartTimes = computed(() => {
  const points = new Set();

  for (const measurement of measurementSeries.value) {
    const ts = new Date(measurement?.takenAt).getTime();
    if (Number.isFinite(ts)) points.add(ts);
  }

  if (Number.isFinite(fermentationStartMs.value)) {
    points.add(fermentationStartMs.value);
  }
  if (Number.isFinite(fermentationEndMs.value)) {
    points.add(fermentationEndMs.value);
  }

  if (
    Number.isFinite(fermentationStartMs.value) &&
    Number.isFinite(fermentationEndMs.value) &&
    fermentationEndMs.value > fermentationStartMs.value
  ) {
    const extraPoints = 12;
    const stepSize = (fermentationEndMs.value - fermentationStartMs.value) / (extraPoints - 1);
    for (let idx = 0; idx < extraPoints; idx += 1) {
      points.add(Math.round(fermentationStartMs.value + stepSize * idx));
    }
  }

  return [...points].sort((a, b) => a - b);
});

const measurementChartLabels = computed(() =>
  measurementChartTimes.value.map((ts) =>
    new Date(ts).toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
  ),
);

const gravityByTime = computed(() => {
  const map = new Map();
  for (const measurement of measurementSeries.value) {
    const ts = new Date(measurement?.takenAt).getTime();
    if (!Number.isFinite(ts)) continue;
    map.set(ts, measurementGravityValue(measurement));
  }
  return map;
});

const temperatureByTime = computed(() => {
  const map = new Map();
  for (const measurement of measurementSeries.value) {
    const ts = new Date(measurement?.takenAt).getTime();
    const value = Number(measurement?.temperatureC);
    if (!Number.isFinite(ts)) continue;
    map.set(ts, Number.isFinite(value) ? value : null);
  }
  return map;
});

const phByTime = computed(() => {
  const map = new Map();
  for (const measurement of measurementSeries.value) {
    const ts = new Date(measurement?.takenAt).getTime();
    const value = Number(measurement?.ph);
    if (!Number.isFinite(ts)) continue;
    map.set(ts, Number.isFinite(value) ? value : null);
  }
  return map;
});

const actualGravitySeries = computed(() =>
  measurementChartTimes.value.map((ts) => {
    const value = gravityByTime.value.get(ts);
    return Number.isFinite(value) ? value : null;
  }),
);

const actualTemperatureSeries = computed(() =>
  measurementChartTimes.value.map((ts) => {
    const value = temperatureByTime.value.get(ts);
    return Number.isFinite(value) ? value : null;
  }),
);

const actualPhSeries = computed(() =>
  measurementChartTimes.value.map((ts) => {
    const value = phByTime.value.get(ts);
    return Number.isFinite(value) ? value : null;
  }),
);

const expectedGravitySeries = computed(() =>
  measurementChartTimes.value.map((ts) => expectedGravityAt(ts)),
);

const expectedTemperatureSeries = computed(() =>
  measurementChartTimes.value.map((ts) => expectedTemperatureAt(ts)),
);

const measurementChartDatasets = computed(() => {
  const datasets = [];

  if (seriesVisibility.value.gravity) {
    datasets.push({
      label: t("brews.current.series_gravity"),
      data: actualGravitySeries.value,
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
      data: expectedGravitySeries.value,
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
      data: actualTemperatureSeries.value,
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
      data: expectedTemperatureSeries.value,
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
      data: actualPhSeries.value,
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
    if (Number.isFinite(numeric)) return numeric;
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

function expectedTemperatureAt(timestampMs) {
  const ts = Number(timestampMs);
  if (!Number.isFinite(ts)) return null;

  const segments = expectedTemperatureSegments.value;
  if (!segments.length) return null;

  const firstWithTemperature = segments.find((segment) =>
    Number.isFinite(Number(segment?.temperature)),
  );
  if (!firstWithTemperature) return null;

  if (ts <= segments[0].from) return Number(firstWithTemperature.temperature);

  for (const segment of segments) {
    if (ts >= segment.from && ts <= segment.to) {
      const temperature = Number(segment.temperature);
      return Number.isFinite(temperature) ? Number(temperature.toFixed(2)) : null;
    }
  }

  const lastWithTemperature = [...segments]
    .reverse()
    .find((segment) => Number.isFinite(Number(segment?.temperature)));
  if (!lastWithTemperature) return null;
  return Number(Number(lastWithTemperature.temperature).toFixed(2));
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

function ingredientStepTags(ingredient) {
  const ids = Array.isArray(ingredient?.stepIds) ? ingredient.stepIds : [];
  const allSteps = steps.value || [];
  return ids
    .map((id) => {
      const step = allSteps.find((item) => item.stepId === id);
      if (!step) return null;
      const orderPrefix = Number.isFinite(Number(step.order)) ? `${step.order}. ` : "";
      return `${orderPrefix}${step.title || stepTypeLabel(step.stepType)}`;
    })
    .filter(Boolean);
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

async function finishBrewAction() {
  closeHeaderMenu();
  if (!brew.value?._id) return;

  try {
    const now = new Date().toISOString();
    brew.value = await updateBrew(brew.value._id, {
      status: "completed",
      progress: { brewCompletedAt: now },
      timeline: { completedAt: now },
    });
    measurementMessage.value = t("brews.current.brew_finished");
  } catch (err) {
    error.value = err?.response?.data?.error || err?.message || t("brews.errors.save_failed");
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

async function saveActualMetrics() {
  if (!brew.value?._id) return;

  const og = parseGravityValue(actualOgInput.value);
  const fg = parseGravityValue(actualFgInput.value);

  if (og === null || fg === null) {
    error.value = t("brews.current.actual_format_error");
    return;
  }

  savingActualMetrics.value = true;
  error.value = "";
  try {
    brew.value = await updateBrew(brew.value._id, {
      actualMetrics: { og, fg },
    });
    hydrateActualMetricsInputs();
    measurementMessage.value = t("brews.current.actual_saved");
  } catch (err) {
    error.value = err?.response?.data?.error || err?.message || t("brews.errors.save_failed");
  } finally {
    savingActualMetrics.value = false;
  }
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

async function submitMeasurement(payload) {
  if (!brew.value?._id) return;
  addingMeasurement.value = true;
  measurementMessage.value = "";
  try {
    await addBrewMeasurement(brew.value._id, payload || {});
    measurementModalOpen.value = false;
    measurementMessage.value = t("brews.current.measurement_added");
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
