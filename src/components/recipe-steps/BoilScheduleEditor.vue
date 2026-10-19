<template>
  <fieldset class="min-w-0 space-y-3" :disabled="disabled">
    <legend class="text-sm font-semibold">
      {{ t("brews.boil.additions") }}
    </legend>
    <p class="text-xs text-text2-faded">{{ t("brews.boil.schedule_help") }}</p>
    <p
      v-if="legacyText"
      class="rounded-lg border border-border3 p-3 text-sm whitespace-pre-line"
    >
      <strong>{{ t("brews.boil.legacy") }}:</strong> {{ legacyText }}
      <span class="mt-2 block text-xs">{{ t('brews.boil.legacy_help') }}</span>
    </p>
    <div
      v-for="(item, index) in rows"
      :key="item.additionId"
      class="schedule-edit-row"
    >
      <div class="grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_7rem]">
        <label class="min-w-0 text-xs"
          >{{ t("brews.boil.ingredient") }}
          <select
            class="schedule-field mt-1"
            :value="item.ingredientId || ''"
            @change="selectIngredient(index, $event.target.value)"
          >
            <option value="">{{ t("brews.boil.custom_addition") }}</option>
            <option
              v-for="ingredient in ingredients"
              :key="ingredient.ingredientId"
              :value="ingredient.ingredientId"
            >
              {{ ingredient.name }}
            </option>
          </select>
        </label>
        <BaseInput
          :model-value="item.remainingMinutes"
          :model-modifiers="{ number: true }"
          type="number"
          min="0"
          :max="durationMinutes || undefined"
          step="0.5"
          :label="t('brews.boil.minutes_left')"
          @update:model-value="update(index, 'remainingMinutes', $event)"
        />
      </div>
      <BaseInput
        v-if="!item.ingredientId"
        :model-value="item.name"
        :label="t('recipes.fields.name')"
        @update:model-value="update(index, 'name', $event)"
      />
      <div class="grid grid-cols-2 gap-3">
        <BaseInput
          :model-value="item.amount"
          :placeholder="linked(item)?.amount || ''"
          :label="t('recipes.fields.amount')"
          @update:model-value="update(index, 'amount', $event)"
        />
        <BaseInput
          :model-value="item.unit"
          :placeholder="linked(item)?.unit || ''"
          :label="t('recipes.fields.unit')"
          @update:model-value="update(index, 'unit', $event)"
        />
      </div>
      <div class="flex items-start justify-between gap-2">
        <p
          v-if="invalid(item)"
          role="alert"
          class="text-xs text-[var(--color-error-text,var(--color-danger))]"
        >
          {{ t("brews.boil.invalid_addition") }}
        </p>
        <button
          type="button"
          class="ml-auto p-2 text-text2-faded hover:text-text2"
          :aria-label="
            t('recipes.actions.remove') +
            ': ' +
            (linked(item)?.name || item.name || index + 1)
          "
          @click="
            emit(
              'update:modelValue',
              rows.filter((_, i) => i !== index),
            )
          "
        >
          <Trash2 :size="16" />
        </button>
      </div>
    </div>
    <BaseButton type="button" variant="button3" :icon="Plus" @click="add">{{
      t("brews.boil.add")
    }}</BaseButton>
  </fieldset>
</template>
<script setup>
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { Plus, Trash2 } from "lucide-vue-next";
import BaseInput from "@/components/base/BaseInput.vue";
import BaseButton from "@/components/base/BaseButton.vue";
import { legacyBoilAdditions } from "@/utils/boilSchedule.js";
const props = defineProps({
  modelValue: Array,
  ingredients: { type: Array, default: () => [] },
  durationMinutes: Number,
  legacyText: String,
  disabled: Boolean,
});
const emit = defineEmits(["update:modelValue"]);
const { t } = useI18n();
const rows = computed(
  () =>
    props.modelValue ||
    legacyBoilAdditions({ data: { hopSchedule: props.legacyText } }),
);
const linked = (item) =>
  props.ingredients.find(
    (ingredient) => ingredient.ingredientId === item.ingredientId,
  );
function update(index, key, value) {
  emit(
    "update:modelValue",
    rows.value.map((item, i) =>
      i === index ? { ...item, [key]: value } : item,
    ),
  );
}
function selectIngredient(index, id) {
  emit(
    "update:modelValue",
    rows.value.map((item, i) =>
      i === index
        ? {
            ...item,
            ingredientId: id,
            ...(!id && linked(item)
              ? { amount: item.amount || linked(item).amount || "", unit: item.unit || linked(item).unit || "" }
              : {}),
            name:
              props.ingredients.find(
                (ingredient) => ingredient.ingredientId === id,
              )?.name || item.name,
          }
        : item,
    ),
  );
}
function add() {
  emit("update:modelValue", [
    ...rows.value,
    {
      additionId: crypto.randomUUID(),
      remainingMinutes: Math.min(15, props.durationMinutes || 15),
      name: "",
      amount: "",
      unit: "",
    },
  ]);
}
function invalid(item) {
  return (
    !(linked(item)?.name || item.name?.trim()) ||
    item.remainingMinutes == null ||
    item.remainingMinutes === "" ||
    !Number.isFinite(Number(item.remainingMinutes)) ||
    Number(item.remainingMinutes) < 0 ||
    !(props.durationMinutes > 0) ||
    Number(item.remainingMinutes) > props.durationMinutes
  );
}
</script>
<style scoped>
.schedule-edit-row {
  padding: 14px;
  border: 1px solid var(--color-border3);
  border-radius: 12px;
  display: grid;
  gap: 12px;
}
.schedule-field {
  width: 100%;
  min-width: 0;
  border: 1px solid var(--color-border4);
  border-radius: 8px;
  padding: 9px;
  background: var(--color-bg4);
  color: var(--color-text4);
  font-size: 14px;
}
.schedule-field:focus-visible {
  outline: 2px solid var(--color-button1-border);
  outline-offset: -2px;
}
</style>
