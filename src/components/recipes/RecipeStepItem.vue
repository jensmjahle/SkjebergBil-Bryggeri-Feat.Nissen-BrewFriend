<template>
  <div
    class="border-t border-border3 py-2"
    :class="{
      'cursor-pointer rounded-md px-2 transition-colors hover:bg-bg4': clickable,
      'bg-bg4 text-text4': active && !completed,
      'step-item--completed border-status-completed-border bg-status-completed text-status-completed-text': completed,
    }"
    :role="clickable ? 'button' : undefined"
    :tabindex="clickable ? 0 : undefined"
    @click="selectStep"
    @keydown.enter="selectStep"
    @keydown.space.prevent="selectStep"
  >
    <div class="flex flex-wrap items-center justify-between gap-2">
      <div class="flex min-w-0 items-center gap-2">
        <Check v-if="completed" class="h-4 w-4 shrink-0" aria-hidden="true" />
        <h4>{{ stepLabel }}</h4>
      </div>
      <span class="rounded-full bg-bg4 text-text4 px-2 py-1 text-xs">{{ stepTypeLabel(step?.stepType) }}</span>
    </div>

    <p v-if="step?.description" class="mt-2 whitespace-pre-line text-sm opacity-90">{{ step.description }}</p>

    <div class="mt-2 flex flex-wrap gap-4 text-xs opacity-80">
      <span v-if="step?.temperatureC !== null && step?.temperatureC !== undefined">
        {{ t("recipes.detail.temp") }}: {{ step.temperatureC }} °C
      </span>
      <span v-if="step?.durationMinutes !== null && step?.durationMinutes !== undefined">
        {{ t("recipes.detail.time") }}: {{ stepDurationLabel(step) }}
      </span>
      <span v-if="step?.co2Volumes !== null && step?.co2Volumes !== undefined">
        {{ t("recipes.metrics.co2") }}: {{ step.co2Volumes }}
      </span>
    </div>

    <div v-if="stepIngredients.length" class="mt-3">
      <p class="text-xs font-semibold uppercase opacity-70">{{ t("recipes.detail.ingredients_in_step") }}</p>
      <div class="mt-1 flex flex-wrap gap-2">
        <span
          v-for="ingredient in stepIngredients"
          :key="`${step?.stepId}-${ingredient.ingredientId}`"
          class="rounded-full border border-border3 px-2 py-1 text-xs"
        >
          {{ ingredient.name }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { Check } from "lucide-vue-next";

const props = defineProps({
  step: {
    type: Object,
    required: true,
  },
  ingredients: {
    type: Array,
    default: () => [],
  },
  clickable: {
    type: Boolean,
    default: false,
  },
  active: {
    type: Boolean,
    default: false,
  },
  completed: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["select"]);

const { t } = useI18n();
const fermentationStepTypes = ["primary_fermentation", "secondary_fermentation", "cold_crash"];

const stepLabel = computed(() => {
  const orderPrefix = Number.isFinite(Number(props.step?.order)) ? `${props.step.order}. ` : "";
  return `${orderPrefix}${props.step?.title || "-"}`;
});

const stepIngredients = computed(() =>
  (props.ingredients || []).filter((ingredient) => (ingredient.stepIds || []).includes(props.step?.stepId)),
);

function stepTypeLabel(value) {
  return t(`recipes.step_types.${value || "custom"}`);
}

function stepDurationLabel(step) {
  const minutes = Number(step?.durationMinutes);
  if (!Number.isFinite(minutes) || minutes <= 0) return "-";
  const isDayBased = fermentationStepTypes.includes(step?.stepType || "");
  if (isDayBased) {
    const days = minutes / 1440;
    return Number.isInteger(days) ? `${days} d` : `${days.toFixed(1)} d`;
  }
  return `${Math.round(minutes)} ${t("recipes.detail.minutes")}`;
}

function selectStep() {
  if (props.clickable) emit("select");
}
</script>

<style scoped>
.step-item--completed h4,
.step-item--completed p {
  color: var(--color-status-completed-text);
}
</style>
