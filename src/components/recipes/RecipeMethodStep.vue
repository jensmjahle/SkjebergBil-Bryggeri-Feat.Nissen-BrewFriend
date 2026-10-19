<template>
  <details class="method-step" :open="initiallyOpen">
    <summary>
      <span class="method-step__number" aria-hidden="true">{{
        index + 1
      }}</span>
      <span class="min-w-0 flex-1 break-words font-semibold">{{
        step.title
      }}</span>
      <span class="method-step__metrics">
        <span v-if="stepHasCountdown(step) && Number(step.durationMinutes) > 0"
          ><Clock3 :size="14" aria-hidden="true" />{{ duration }}</span
        >
        <span v-if="step.temperatureC != null"
          ><Thermometer :size="14" aria-hidden="true" />{{
            step.temperatureC
          }}
          °C</span
        >
      </span>
      <ChevronDown
        class="method-step__chevron shrink-0"
        :size="17"
        aria-hidden="true"
      />
    </summary>
    <div class="method-step__body">
      <p
        v-if="step.description"
        class="whitespace-pre-line text-sm leading-relaxed"
      >
        {{ step.description }}
      </p>
      <dl v-if="dataEntries.length" class="method-step__data">
        <div v-for="item in dataEntries" :key="item.key">
          <dt class="text-xs text-text2-faded">{{ item.label }}</dt>
          <dd class="mt-1 whitespace-pre-line text-sm font-semibold">
            {{ item.value }}
          </dd>
        </div>
      </dl>
      <div v-if="additions.length" class="recipe-additions">
        <p class="mb-3 text-xs text-text2-faded">
          {{ t("brews.boil.schedule_help") }}
        </p>
        <table class="w-full text-left text-sm">
          <thead>
            <tr>
              <th scope="col">{{ t("recipes.presentation.time_left") }}</th>
              <th scope="col">{{ t("recipes.fields.amount") }}</th>
              <th scope="col">{{ t("brews.boil.ingredient") }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in additions" :key="item.additionId">
              <td class="whitespace-nowrap tabular-nums">
                {{ item.remainingMinutes }} min
              </td>
              <td class="tabular-nums">
                {{ [item.amount, item.unit].filter(Boolean).join(" ") || "—" }}
              </td>
              <td class="break-words">{{ item.name }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <details v-if="step.data?.hopSchedule" class="text-xs text-text2-faded">
        <summary class="cursor-pointer py-1">
          {{ t("brews.boil.legacy") }}
        </summary>
        <p class="mt-2 whitespace-pre-line">{{ step.data.hopSchedule }}</p>
        <p class="mt-2">{{ t("brews.boil.legacy_help") }}</p>
      </details>
      <div v-if="stepIngredients.length" class="flex flex-wrap gap-2">
        <span
          v-for="ingredient in stepIngredients"
          :key="ingredient.ingredientId"
          class="rounded-md border border-border3 px-2 py-1 text-xs"
          >{{ ingredient.name }} ·
          {{
            [ingredient.amount, ingredient.unit].filter(Boolean).join(" ")
          }}</span
        >
      </div>
      <p
        v-if="
          !step.description &&
          !dataEntries.length &&
          !additions.length &&
          !step.data?.hopSchedule &&
          !stepIngredients.length
        "
        class="text-xs text-text2-faded"
      >
        {{ phaseLabel(stepPhase(step), t) }}
      </p>
    </div>
  </details>
</template>
<script setup>
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { ChevronDown, Clock3, Thermometer } from "lucide-vue-next";
import { boilAdditions } from "@/utils/boilSchedule.js";
import { phaseLabel, stepPhase, stepHasCountdown } from "@/utils/brewPhase.js";
const props = defineProps({
  step: Object,
  index: Number,
  initiallyOpen: Boolean,
  ingredients: { type: Array, default: () => [] },
});
const { t, locale } = useI18n();
const duration = computed(() => {
  const days = [
    "primary_fermentation",
    "secondary_fermentation",
    "cold_crash",
    "conditioning",
  ].includes(stepPhase(props.step));
  const number = Number(props.step.durationMinutes) / (days ? 1440 : 1);
  return `${new Intl.NumberFormat(locale.value, { maximumFractionDigits: 1 }).format(number)} ${t(days ? "brews.phase.days" : "recipes.detail.minutes")}`;
});
const additions = computed(() =>
  stepPhase(props.step) === "boil"
    ? boilAdditions(props.step, props.ingredients)
    : [],
);
const stepIngredients = computed(() =>
  props.ingredients.filter((item) => item.stepIds?.includes(props.step.stepId)),
);
const dataEntries = computed(() =>
  Object.entries(props.step.data || {}).flatMap(([key, value]) => {
    if (
      ["additions", "hopSchedule"].includes(key) ||
      value == null ||
      value === "" ||
      typeof value === "object"
    )
      return [];
    const labels = {
      waterAmountL: "water_amount",
      waterToGrainRatio: "water_ratio",
      targetGravity: "target_gravity",
      checklist: "checklist",
      method: "method",
    };
    return [
      {
        key,
        label: labels[key]
          ? t(`recipes.presentation.${labels[key]}`)
          : key.replace(/([A-Z])/g, " $1"),
        value: key === "waterAmountL" ? `${value} L` : value,
      },
    ];
  }),
);
</script>
<style scoped>
.method-step {
  border: 1px solid var(--color-border3);
  border-radius: 12px;
}
.method-step > summary {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 17px;
  list-style: none;
  cursor: pointer;
  font-size: 15px;
}
.method-step > summary::-webkit-details-marker {
  display: none;
}
.method-step > summary:focus-visible {
  outline: 2px solid var(--color-text1);
  outline-offset: -2px;
  border-radius: 12px;
}
.method-step__number {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--color-bg4);
  color: var(--color-text4);
  border: 1px solid var(--color-border4);
  font-size: 12px;
  flex-shrink: 0;
}
.method-step[open] .method-step__number {
  border-color: var(--color-button2-border);
}
.method-step[open] > summary .method-step__chevron {
  transform: rotate(180deg);
}
.method-step__metrics {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
  font-size: 12px;
  color: var(--color-text2-faded);
}
.method-step__metrics > span {
  display: flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
}
.method-step__body {
  display: grid;
  gap: 14px;
  padding: 0 17px 17px 57px;
}
.method-step__data {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  background: var(--color-bg2);
  padding: 12px;
  border-radius: 8px;
}
.recipe-additions {
  min-width: 0;
}
.recipe-additions th {
  font-weight: 500;
  font-size: 11px;
  color: var(--color-text2-faded);
}
.recipe-additions th,
.recipe-additions td {
  padding: 10px 8px;
  border-bottom: 1px solid var(--color-border3);
  vertical-align: top;
}
.recipe-additions td:first-child,
.recipe-additions th:first-child {
  padding-left: 0;
}
@media (max-width: 640px) {
  .method-step > summary {
    gap: 8px;
    padding: 14px 10px;
    flex-wrap: wrap;
  }
  .method-step__metrics {
    order: 1;
    width: 100%;
    justify-content: flex-start;
    padding-left: 36px;
  }
  .method-step__body {
    padding: 0 12px 16px;
  }
}
</style>
