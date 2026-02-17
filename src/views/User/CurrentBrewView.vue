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

      <BaseCard class="space-y-3">
        <h3>{{ t("brews.current.actual_metrics_title") }}</h3>
        <div class="grid gap-2 text-sm opacity-90 sm:grid-cols-3">
          <p>{{ t("brews.fields.target_og") }}: {{ targetOgRangeText }}</p>
          <p>{{ t("brews.fields.target_fg") }}: {{ targetFgRangeText }}</p>
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
      </BaseCard>

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
            <p v-if="currentStep.description" class="text-sm opacity-90">{{ currentStep.description }}</p>

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
                  class="rounded-full border border-border3 px-2 py-1 text-xs"
                >
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

        <BaseCard v-if="showFermentationPanel" class="space-y-4">
          <h3>{{ t("brews.current.fermentation_title") }}</h3>
          <p class="text-sm opacity-80">
            {{ t("brews.current.fermentation_remaining") }}:
            <strong>{{ formatDuration(fermentationRemainingSeconds) }}</strong>
          </p>

          <div class="flex flex-wrap items-center gap-3">
            <BaseButton type="button" :disabled="addingMeasurement" @click="measurementModalOpen = true">
              {{ t("brews.actions.add_measurement") }}
            </BaseButton>
            <p v-if="measurementMessage" class="text-sm opacity-80">{{ measurementMessage }}</p>
          </div>

          <GravityProgressChart
            :measurements="measurementSeries"
            :target-fg="targetFg"
            :empty-text="t('brews.current.no_measurements')"
          />

          <div class="space-y-2">
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
                <p v-if="measurement.note" class="opacity-80">{{ measurement.note }}</p>
              </div>
            </div>
          </div>
        </BaseCard>
      </template>

      <template v-else>
        <BaseCard>
          <h3>{{ t("recipes.detail.defaults") }}</h3>
          <div class="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 text-sm">
            <div>{{ t("recipes.metrics.og") }}: {{ brew.recipeSnapshot?.defaults?.ogFrom || "-" }} - {{ brew.recipeSnapshot?.defaults?.ogTo || "-" }}</div>
            <div>{{ t("recipes.metrics.fg") }}: {{ brew.recipeSnapshot?.defaults?.fgFrom || "-" }} - {{ brew.recipeSnapshot?.defaults?.fgTo || "-" }}</div>
            <div>{{ t("recipes.metrics.co2") }}: {{ formatValue(brew.recipeSnapshot?.defaults?.co2Volumes) }}</div>
            <div>{{ t("recipes.metrics.ibu") }}: {{ formatValue(brew.recipeSnapshot?.defaults?.ibu) }}</div>
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
                <h4>{{ ingredient.name }}</h4>
                <span class="rounded-full bg-bg4 px-2 py-1 text-xs">{{ ingredientCategoryLabel(ingredient.category) }}</span>
              </div>
              <p class="mt-1 text-sm opacity-90">{{ [ingredient.amount, ingredient.unit].filter(Boolean).join(" ") || "-" }}</p>
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
              <p v-if="step.description" class="mt-2 text-sm opacity-90">{{ step.description }}</p>
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

const route = useRoute();
const router = useRouter();
const { t } = useI18n();

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
const headerMenuOpen = ref(false);
const headerMenuRoot = ref(null);

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
const actualAbvText = computed(() => {
  const og = parseGravityValue(actualOgInput.value);
  const fg = parseGravityValue(actualFgInput.value);
  if (og === null || fg === null) return "-";
  const abv = Math.max(0, (og - fg) * 131.25);
  return `${abv.toFixed(2)}%`;
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

function ingredientCategoryLabel(category) {
  if (category === "fermentable") return t("recipes.ingredient_category.fermentable");
  if (category === "hops") return t("recipes.ingredient_category.hops");
  return t("recipes.ingredient_category.other");
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

function setActivePanel(value) {
  activePanel.value = value === "recipe" ? "recipe" : "progress";
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
  },
  { immediate: true },
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
