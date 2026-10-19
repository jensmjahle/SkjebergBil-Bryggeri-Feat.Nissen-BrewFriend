<template>
  <div v-if="open" class="space-y-2">
    <component
      :is="stepComponent"
      :model-value="step"
      :step-number="index + 1"
      v-bind="step.stepType === 'boil' ? { ingredients } : {}"
      @update:model-value="emit('update:step', $event)"
    />

    <BaseDropdown
      :model-value="step.phase || 'automatic'"
      :label="t('brews.phase.label')"
      :options="phaseOptions"
      @update:model-value="
        emit('update:step', {
          ...step,
          phase: $event === 'automatic' ? undefined : $event,
        })
      "
    />

    <div class="flex flex-wrap justify-end gap-2">
      <BaseButton
        type="button"
        variant="button3"
        :icon="ChevronUp"
        :disabled="index === 0"
        @click="emit('move', -1)"
      >
        {{ t("recipes.actions.up") }}
      </BaseButton>
      <BaseButton
        type="button"
        variant="button3"
        :icon="ChevronDown"
        :disabled="index === total - 1"
        @click="emit('move', 1)"
      >
        {{ t("recipes.actions.down") }}
      </BaseButton>
      <BaseButton
        type="button"
        variant="button4"
        :icon="Trash2"
        @click="emit('remove')"
      >
        {{ t("recipes.actions.remove") }}
      </BaseButton>
      <BaseButton
        type="button"
        variant="button2"
        :icon="Check"
        @click="emit('close')"
      >
        {{ isNew ? t("recipes.actions.add") : t("recipes.actions.done") }}
      </BaseButton>
    </div>
  </div>

  <div v-else class="editor-step-row">
    <RecipeStepItem
      class="min-w-0 flex-1"
      :step="stepWithOrder"
      :ingredients="ingredients"
      compact
      clickable
      @select="emit('open')"
    />
    <div class="editor-row-actions">
      <button
        type="button"
        :aria-label="`${t('recipes.actions.up')}: ${step.title}`"
        :disabled="index === 0"
        @click="emit('move', -1)"
      >
        <ChevronUp :size="16" aria-hidden="true" />
      </button>
      <button
        type="button"
        :aria-label="`${t('recipes.actions.down')}: ${step.title}`"
        :disabled="index === total - 1"
        @click="emit('move', 1)"
      >
        <ChevronDown :size="16" aria-hidden="true" />
      </button>
      <button
        type="button"
        :aria-label="`${t('recipes.actions.open')}: ${step.title}`"
        @click="emit('open')"
      >
        <PencilLine :size="15" aria-hidden="true" />
      </button>
      <button
        type="button"
        :aria-label="`${t('recipes.actions.remove')}: ${step.title}`"
        @click="emit('remove')"
      >
        <Trash2 :size="15" aria-hidden="true" />
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import {
  Check,
  ChevronDown,
  ChevronUp,
  PencilLine,
  Trash2,
} from "lucide-vue-next";
import BaseDropdown from "@/components/base/BaseDropdown.vue";
import { PHASES, phaseLabel } from "@/utils/brewPhase.js";
import BaseButton from "@/components/base/BaseButton.vue";
import RecipeStepItem from "@/components/recipes/RecipeStepItem.vue";
import { STEP_COMPONENTS } from "@/components/recipe-steps/index.js";

const props = defineProps({
  step: { type: Object, required: true },
  index: { type: Number, required: true },
  total: { type: Number, required: true },
  ingredients: { type: Array, default: () => [] },
  open: { type: Boolean, default: false },
  isNew: { type: Boolean, default: false },
});

const emit = defineEmits(["update:step", "open", "close", "move", "remove"]);

const { t } = useI18n();

const phaseOptions = computed(() => [
  { label: t("brews.phase.automatic"), value: "automatic" },
  ...PHASES.map((value) => ({ value, label: phaseLabel(value, t) })),
]);
const stepComponent = computed(
  () => STEP_COMPONENTS[props.step?.stepType] || STEP_COMPONENTS.custom,
);
const stepWithOrder = computed(() => ({
  ...props.step,
  order: props.index + 1,
}));
</script>

<style scoped>
.editor-step-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px;
  border: 1px solid var(--color-border3);
  border-radius: 12px;
}
.editor-step-row :deep(.border-t) {
  border-top-width: 0;
}
.editor-step-row :deep(h4) {
  font-size: 14px;
  overflow-wrap: anywhere;
}
.editor-row-actions {
  display: grid;
  grid-template-columns: repeat(2, 28px);
  gap: 3px;
  flex-shrink: 0;
}
.editor-row-actions button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 6px;
}
.editor-row-actions button:hover {
  background: var(--color-bg4);
  color: var(--color-text4);
}
.editor-row-actions button:disabled {
  opacity: 0.25;
  cursor: not-allowed;
}
.editor-row-actions button:focus-visible {
  outline: 2px solid var(--color-text1);
  outline-offset: 2px;
}
</style>
