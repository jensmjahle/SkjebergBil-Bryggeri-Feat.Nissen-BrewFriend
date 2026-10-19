<template>
  <section class="plan-panel" :aria-label="t('brews.plan.inventory_title')">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div class="flex items-center gap-2.5">
        <PackageCheck class="h-5 w-5 opacity-70" aria-hidden="true" />
        <h2 class="plan-section-title">
          {{ t("brews.plan.inventory_title") }}
        </h2>
      </div>
      <span
        class="inventory-status"
        :class="
          !summary.ingredientCount
            ? 'inventory-status--empty'
            : summary.inventoryComplete
              ? 'inventory-status--complete'
              : 'inventory-status--missing'
        "
      >
        <CheckCircle2
          v-if="summary.inventoryComplete"
          class="h-4 w-4"
          aria-hidden="true"
        /><CircleAlert
          v-else-if="summary.ingredientCount"
          class="h-4 w-4"
          aria-hidden="true"
        />
        {{
          t(
            !summary.ingredientCount
              ? "brews.plan.inventory_empty_status"
              : summary.inventoryComplete
                ? "brews.plan.inventory_complete"
                : "brews.plan.inventory_missing",
            { count: summary.missingCount },
          )
        }}
      </span>
    </div>
    <p class="mt-2 text-sm text-text2-faded">
      {{ t("brews.plan.inventory_help") }}
    </p>
    <template v-if="summary.ingredientCount">
      <div class="mb-2 mt-5 flex items-center justify-between gap-2 text-sm">
        <span>{{
          t("brews.plan.inventory_count", {
            available: summary.availableCount,
            total: summary.ingredientCount,
          })
        }}</span
        ><span class="text-xs tabular-nums opacity-65"
          >{{ summary.inventoryPercent }} %</span
        >
      </div>
      <div
        class="inventory-track"
        role="progressbar"
        :aria-label="t('brews.plan.inventory_title')"
        :aria-valuenow="summary.availableCount"
        aria-valuemin="0"
        :aria-valuemax="summary.ingredientCount"
      >
        <span :style="{ width: `${summary.inventoryPercent}%` }" />
      </div>
      <div class="mt-5 space-y-2">
        <label
          v-for="ingredient in namedIngredients"
          :key="ingredient.ingredientId"
          class="inventory-row"
          :class="{
            'inventory-row--available': availableIds.includes(
              ingredient.ingredientId,
            ),
          }"
        >
          <input
            type="checkbox"
            :checked="availableIds.includes(ingredient.ingredientId)"
            :disabled="disabled || savingIds.includes(ingredient.ingredientId)"
            :aria-label="
              t('brews.plan.inventory_checkbox', { name: ingredient.name })
            "
            @change="
              $emit('toggle', ingredient.ingredientId, $event.target.checked)
            "
          />
          <img
            :src="ingredientCategoryIcon(ingredient.category)"
            alt=""
            class="h-6 w-6 shrink-0 rounded bg-bg4 p-0.5 object-contain"
          />
          <span class="min-w-0 flex-1"
            ><span class="block break-words text-sm font-semibold">{{
              ingredient.name
            }}</span
            ><span class="text-xs text-text2-faded">{{
              [ingredient.amount, ingredient.unit].filter(Boolean).join(" ") ||
              "—"
            }}</span></span
          >
          <span
            class="inventory-row__state"
            :class="
              availableIds.includes(ingredient.ingredientId)
                ? 'inventory-text--available'
                : 'inventory-text--missing'
            "
          >
            <LoaderCircle
              v-if="savingIds.includes(ingredient.ingredientId)"
              class="h-4 w-4 animate-spin"
              aria-hidden="true"
            />
            <span
              v-else
              class="h-1.5 w-1.5 shrink-0 rounded-full bg-current"
              aria-hidden="true"
            />
            {{
              t(
                availableIds.includes(ingredient.ingredientId)
                  ? "brews.plan.inventory_available"
                  : "brews.plan.inventory_needed",
              )
            }}
          </span>
        </label>
      </div>
    </template>
    <div
      v-else
      class="mt-5 rounded-lg border border-dashed border-border3 px-4 py-6 text-sm text-text2-faded"
    >
      <p>{{ t("brews.plan.inventory_empty") }}</p>
      <button
        type="button"
        class="mt-3 font-semibold underline underline-offset-4"
        @click="$emit('edit')"
      >
        {{ t("recipes.actions.add_ingredient") }}
      </button>
    </div>
    <p
      v-if="error"
      role="alert"
      class="mt-3 text-sm text-[var(--color-error-text,var(--color-danger))]"
    >
      {{ error }}
    </p>
    <p v-if="summary.ingredientCount && !error" role="status" class="mt-4 flex items-center gap-1.5 text-xs text-text2-faded">
      <LoaderCircle v-if="savingIds.length" class="h-3.5 w-3.5 animate-spin" aria-hidden="true" /><Clock3 v-else-if="pending" class="h-3.5 w-3.5" aria-hidden="true" /><Check v-else class="h-3.5 w-3.5" aria-hidden="true" />{{
        t(
          savingIds.length ? "brews.plan.inventory_saving" : pending
            ? "brews.plan.inventory_pending"
            : "brews.plan.inventory_autosave",
        )
      }}
    </p>
  </section>
</template>
<script setup>
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import {
  PackageCheck,
  CheckCircle2,
  CircleAlert,
  LoaderCircle,
  Check,
  Clock3,
} from "lucide-vue-next";
import { ingredientCategoryIcon } from "@/utils/recipeAssets.js";
import { brewPlanningSummary } from "@/utils/brewPlanningSummary.js";
const props = defineProps({
  ingredients: { type: Array, default: () => [] },
  availableIds: { type: Array, default: () => [] },
  savingIds: { type: Array, default: () => [] },
  disabled: Boolean,
  error: String,
  pending: Boolean,
});
defineEmits(["toggle", "edit"]);
const { t } = useI18n();
const namedIngredients = computed(() =>
  props.ingredients.filter((ingredient) => ingredient.name?.trim()),
);
const summary = computed(() =>
  brewPlanningSummary({ ingredients: props.ingredients }, props.availableIds),
);
</script>
<style scoped>
.inventory-status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid;
  border-radius: 0.5rem;
  padding: 5px 9px;
  font-size: 12px;
  font-weight: 600;
}
.inventory-status--complete {
  background: var(--color-status-completed);
  color: var(--color-status-completed-text);
  border-color: var(--color-status-completed-border);
}
.inventory-status--missing {
  background: var(--color-status-pending);
  color: var(--color-status-pending-text);
  border-color: var(--color-status-pending-border);
}
.inventory-status--empty {
  background: var(--color-bg4);
  color: var(--color-text4);
  border-color: var(--color-border3);
}
.inventory-track {
  height: 8px;
  overflow: hidden;
  border-radius: 999px;
  background: var(--color-border3);
}
.inventory-track > span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--color-success);
  transition: width 0.2s;
}
.inventory-row {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 68px;
  padding: 12px;
  border: 1px solid var(--color-border3);
  border-radius: 0.625rem;
  cursor: pointer;
  background: var(--color-bg4);
  color: var(--color-text4);
  transition: border-color 0.15s;
}
.inventory-row:focus-within {
  outline: 2px solid var(--color-button1-border);
  outline-offset: -2px;
}
.inventory-row--available {
  border-color: var(--color-status-completed-border);
}
.inventory-row input {
  width: 19px;
  height: 19px;
  flex-shrink: 0;
  accent-color: var(--color-success-border);
}
.inventory-row input:disabled {
  cursor: wait;
}
.inventory-row__state {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  white-space: nowrap;
}
.inventory-text--available {
  color: var(--color-status-completed-text);
}
.inventory-text--missing {
  color: var(--color-status-pending-text);
}
.inventory-row .text-text2-faded {
  color: var(--color-text4-faded);
}
@media (max-width: 380px) {
  .inventory-row {
    gap: 8px;
    padding: 10px;
  }
  .inventory-row img {
    display: none;
  }
}
@media (prefers-reduced-motion: reduce) {
  .inventory-track > span,
  .inventory-row {
    transition: none;
  }
}
</style>
