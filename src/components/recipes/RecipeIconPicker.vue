<template>
  <div class="space-y-3">
    <div class="flex items-center gap-3">
      <img
        :src="selectedIconPath"
        :alt="t('recipes.fields.icon')"
        class="h-12 w-12 rounded-lg border border-border3 bg-white p-1 object-contain"
      />
      <p class="text-sm opacity-80">{{ t("recipes.fields.icon") }}</p>
    </div>

    <div class="max-h-64 overflow-y-auto rounded-lg border border-border3 p-2">
      <div class="grid grid-cols-6 gap-2 sm:grid-cols-8 md:grid-cols-10">
        <button
          v-for="icon in iconOptions"
          :key="icon.value"
          type="button"
          class="flex h-10 w-10 items-center justify-center rounded-md border transition"
          :class="isSelected(icon.value) ? 'border-button1-border bg-bg4' : 'border-border3 bg-white'"
          @click="selectIcon(icon.value)"
        >
          <img :src="icon.value" :alt="t('recipes.fields.icon')" class="h-7 w-7 object-contain" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import {
  RECIPE_ICON_OPTIONS,
  resolveRecipeIconPath,
} from "@/utils/recipeAssets.js";

const props = defineProps({
  modelValue: {
    type: String,
    default: "",
  },
});

const emit = defineEmits(["update:modelValue"]);
const { t } = useI18n();

const iconOptions = RECIPE_ICON_OPTIONS;
const selectedIconPath = computed(() => resolveRecipeIconPath(props.modelValue));

function selectIcon(iconPath) {
  emit("update:modelValue", iconPath);
}

function isSelected(iconPath) {
  return selectedIconPath.value === iconPath;
}
</script>
