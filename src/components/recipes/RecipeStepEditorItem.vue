<template>
  <div v-if="open" class="space-y-2">
    <component
      :is="stepComponent"
      :model-value="step"
      :step-number="index + 1"
      @update:model-value="emit('update:step', $event)"
    />

    <div class="flex flex-wrap justify-end gap-2">
      <BaseButton type="button" variant="button3" :icon="ChevronUp" :disabled="index === 0" @click="emit('move', -1)">
        {{ t("recipes.actions.up") }}
      </BaseButton>
      <BaseButton type="button" variant="button3" :icon="ChevronDown" :disabled="index === total - 1" @click="emit('move', 1)">
        {{ t("recipes.actions.down") }}
      </BaseButton>
      <BaseButton type="button" variant="button4" :icon="Trash2" @click="emit('remove')">
        {{ t("recipes.actions.remove") }}
      </BaseButton>
      <BaseButton type="button" variant="button2" :icon="Check" @click="emit('close')">
        {{ isNew ? t("recipes.actions.add") : t("recipes.actions.done") }}
      </BaseButton>
    </div>
  </div>

  <div v-else class="flex flex-col gap-2 sm:flex-row sm:items-stretch">
    <RecipeStepItem
      class="min-w-0 flex-1"
      :step="stepWithOrder"
      :ingredients="ingredients"
      clickable
      @select="emit('open')"
    />

    <div class="flex flex-wrap items-center justify-end gap-1 sm:border-t sm:border-border3 sm:py-2">
      <BaseButton
        type="button"
        variant="button3"
        :icon="ChevronUp"
        :aria-label="t('recipes.actions.up')"
        :disabled="index === 0"
        @click="emit('move', -1)"
      />
      <BaseButton
        type="button"
        variant="button3"
        :icon="ChevronDown"
        :aria-label="t('recipes.actions.down')"
        :disabled="index === total - 1"
        @click="emit('move', 1)"
      />
      <BaseButton type="button" variant="button2" :icon="PencilLine" @click="emit('open')">
        {{ t("recipes.actions.open") }}
      </BaseButton>
      <BaseButton
        type="button"
        variant="button4"
        :icon="Trash2"
        :aria-label="t('recipes.actions.remove')"
        @click="emit('remove')"
      />
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { Check, ChevronDown, ChevronUp, PencilLine, Trash2 } from "lucide-vue-next";
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

const stepComponent = computed(() => STEP_COMPONENTS[props.step?.stepType] || STEP_COMPONENTS.custom);
const stepWithOrder = computed(() => ({ ...props.step, order: props.index + 1 }));
</script>
