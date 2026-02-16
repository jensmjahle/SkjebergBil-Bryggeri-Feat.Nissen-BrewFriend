<template>
  <section class="mx-auto w-full max-w-6xl px-4 py-8 space-y-6">
    <BaseCard v-if="loading">
      <p>{{ t("common.loading") }}</p>
    </BaseCard>

    <BaseCard v-else-if="error">
      <p class="text-red-600">{{ error }}</p>
    </BaseCard>

    <template v-else-if="brew">
      <BaseCard class="space-y-4">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1>{{ brew.name }}</h1>
            <p class="mt-1 text-sm opacity-80">{{ statusLabel(brew.status) }}</p>
            <p v-if="brew.progress?.brewStartedAt" class="mt-1 text-xs opacity-70">
              {{ t("brews.fields.brew_started_at") }}: {{ formatDateTime(brew.progress.brewStartedAt) }}
            </p>
          </div>
          <div class="flex flex-wrap gap-2">
            <router-link to="/brygg/tidligere">
              <BaseButton variant="button3">{{ t("brews.actions.back_to_list") }}</BaseButton>
            </router-link>
            <router-link :to="`/brygg/${brew._id}/planlegging`">
              <BaseButton variant="button3">{{ t("brews.actions.open_plan") }}</BaseButton>
            </router-link>
            <BaseButton
              v-if="brew.status === 'planned'"
              variant="button2"
              @click="startBrewDayAction"
            >
              {{ t("brews.actions.start_brew_day") }}
            </BaseButton>
          </div>
        </div>

        <div class="flex flex-wrap gap-2">
          <BaseButton
            :variant="activePanel === 'progress' ? 'button1' : 'button3'"
            @click="activePanel = 'progress'"
          >
            {{ t("brews.current.progress_tab") }}
          </BaseButton>
          <BaseButton
            :variant="activePanel === 'recipe' ? 'button1' : 'button3'"
            @click="activePanel = 'recipe'"
          >
            {{ t("brews.current.recipe_tab") }}
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
            <p>{{ t("recipes.metrics.co2") }}: {{ currentStep.co2Volumes ?? "-" }}</p>
          </div>

          <CircularCountdown
            v-if="showRoundTimer"
            :remaining-seconds="timerRemainingSeconds"
            :total-seconds="timerTotalSeconds"
            :label="t('brews.current.timer_remaining')"
            :show-days="isCurrentStepDayBased"
          />

          <div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            <BaseButton type="button" variant="button3" :disabled="currentStepIndex <= 0" @click="previousStep">
              {{ t("brews.actions.previous_step") }}
            </BaseButton>
            <BaseButton type="button" variant="button3" :disabled="currentStepIndex >= steps.length - 1" @click="nextStep">
              {{ t("brews.actions.next_step") }}
            </BaseButton>
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
            <BaseButton type="button" variant="button4" @click="resetCurrentStepAction">
              {{ t("brews.actions.reset_step") }}
            </BaseButton>
          </div>

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
import { useRoute } from "vue-router";
import { useI18n } from "vue-i18n";
import BaseCard from "@/components/base/BaseCard.vue";
import BaseButton from "@/components/base/BaseButton.vue";
import CircularCountdown from "@/components/brews/CircularCountdown.vue";
import GravityProgressChart from "@/components/brews/GravityProgressChart.vue";
import BrewMeasurementModal from "@/components/modals/BrewMeasurementModal.vue";
import {
  addBrewMeasurement,
  completeBrewStep,
  getBrew,
  pauseBrewStep,
  resetBrewStep,
  setCurrentBrewStep,
  startBrew,
  startBrewStep,
} from "@/services/brews.service.js";

const route = useRoute();
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

let clockInterval = null;

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
  () => route.params.brewId,
  () => {
    if (route.params.brewId) loadBrew();
  },
);

onMounted(async () => {
  await loadBrew();
  clockInterval = setInterval(() => {
    nowTs.value = Date.now();
  }, 1000);
});

onBeforeUnmount(() => {
  if (clockInterval) clearInterval(clockInterval);
});
</script>


