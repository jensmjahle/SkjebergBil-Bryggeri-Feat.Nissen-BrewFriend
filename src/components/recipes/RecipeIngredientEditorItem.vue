<template>
  <BaseCard v-if="open" class="space-y-3">
    <div class="flex items-center gap-2 text-sm">
      <img
        :src="ingredientCategoryIcon(ingredient.category)"
        :alt="categoryLabel"
        class="h-7 w-7 rounded-md border border-border3 bg-white p-1 object-contain"
      />
      <span class="opacity-80">{{ categoryLabel }}</span>
    </div>

    <div class="grid gap-3 md:grid-cols-2">
      <BaseInput v-model="ingredient.name" :label="t('recipes.fields.name')" :placeholder="t('recipes.create.ingredient_name_placeholder')" />
      <BaseDropdown
        v-model="ingredient.category"
        :label="t('recipes.fields.category')"
        :options="categoryOptions"
        :placeholder="t('recipes.create.select_category')"
      />
      <BaseInput v-model="ingredient.amount" :label="t('recipes.fields.amount')" :placeholder="t('recipes.create.amount_placeholder')" />
      <BaseInput v-model="ingredient.unit" :label="t('recipes.fields.unit')" :placeholder="t('recipes.create.unit_placeholder')" />
      <BaseInput
        v-model.number="ingredient.price"
        :model-modifiers="{ number: true }"
        type="number"
        step="0.01"
        :label="t('recipes.fields.price')"
      />
    </div>
    <BaseInput v-model="ingredient.notes" :label="t('recipes.fields.notes')" />

    <div>
      <p class="mb-2 text-sm font-medium">{{ t("recipes.fields.link_to_steps") }}</p>
      <div v-if="!steps.length" class="text-sm opacity-70">{{ t("recipes.create.add_steps_first") }}</div>
      <div v-else class="grid gap-2 sm:grid-cols-2">
        <label v-for="step in steps" :key="`${ingredient.ingredientId}-${step.stepId}`" class="flex items-center gap-2 text-sm">
          <input type="checkbox" :checked="isLinkedToStep(step.stepId)" @change="toggleStep(step.stepId)" />
          <span>{{ step.title || stepTypeLabel(step.stepType) }}</span>
        </label>
      </div>
    </div>

    <div class="flex flex-wrap justify-end gap-2">
      <BaseButton type="button" variant="button4" :icon="Trash2" @click="emit('remove')">
        {{ t("recipes.actions.remove_ingredient") }}
      </BaseButton>
      <BaseButton type="button" variant="button2" :icon="Check" @click="emit('close')">
        {{ isNew ? t("recipes.actions.add") : t("recipes.actions.done") }}
      </BaseButton>
    </div>
  </BaseCard>

  <div v-else class="flex flex-col gap-2 sm:flex-row sm:items-stretch">
    <RecipeIngredientItem
      class="min-w-0 flex-1"
      :ingredient="ingredient"
      :steps="steps"
      clickable
      @select="emit('open')"
    />

    <div class="flex flex-wrap items-center justify-end gap-1 sm:border-t sm:border-border3 sm:py-2">
      <BaseButton type="button" variant="button2" :icon="PencilLine" @click="emit('open')">
        {{ t("recipes.actions.open") }}
      </BaseButton>
      <BaseButton
        type="button"
        variant="button4"
        :icon="Trash2"
        :aria-label="t('recipes.actions.remove_ingredient')"
        @click="emit('remove')"
      />
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { Check, PencilLine, Trash2 } from "lucide-vue-next";
import BaseButton from "@/components/base/BaseButton.vue";
import BaseCard from "@/components/base/BaseCard.vue";
import BaseDropdown from "@/components/base/BaseDropdown.vue";
import BaseInput from "@/components/base/BaseInput.vue";
import RecipeIngredientItem from "@/components/recipes/RecipeIngredientItem.vue";
import {
  ingredientCategoryIcon,
  ingredientCategoryLabel,
  ingredientCategoryOptions as buildIngredientCategoryOptions,
} from "@/utils/recipeAssets.js";

const props = defineProps({
  ingredient: { type: Object, required: true },
  steps: { type: Array, default: () => [] },
  open: { type: Boolean, default: false },
  isNew: { type: Boolean, default: false },
});

const emit = defineEmits(["open", "close", "remove"]);

const { t } = useI18n();

const categoryOptions = computed(() => buildIngredientCategoryOptions(t));
const categoryLabel = computed(() => ingredientCategoryLabel(t, props.ingredient?.category));

function stepTypeLabel(value) {
  return t(`recipes.step_types.${value || "custom"}`);
}

function isLinkedToStep(stepId) {
  return (props.ingredient.stepIds || []).includes(stepId);
}

function toggleStep(stepId) {
  const set = new Set(props.ingredient.stepIds || []);
  if (set.has(stepId)) set.delete(stepId);
  else set.add(stepId);
  props.ingredient.stepIds = Array.from(set);
}
</script>
