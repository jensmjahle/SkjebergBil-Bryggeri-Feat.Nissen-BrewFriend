<template>
  <div
    v-if="open"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 sm:hidden"
    @click.self="$emit('close')"
  >
    <div class="w-full max-w-md rounded-xl border border-border3 bg-bg2 p-4 shadow-2xl">
      <h3 class="mb-3">{{ t("common.filter") }}</h3>
      <div class="grid gap-3">
        <BaseDropdown v-model="filters.beerType" :label="t('recipes.filters.beer_type')" :options="beerTypeOptions" :placeholder="t('common.all')" />
        <BaseDropdown v-model="filters.stepType" :label="t('recipes.filters.step_type')" :options="stepTypeOptions" :placeholder="t('common.all')" />
        <BaseDropdown
          v-model="filters.ingredientCategory"
          :label="t('recipes.filters.ingredient_category')"
          :options="ingredientCategoryOptions"
          :placeholder="t('common.all')"
        />
        <BaseDropdown v-model="filters.hasDefaults" :label="t('recipes.filters.defaults')" :options="defaultsOptions" :placeholder="t('common.all')" />
        <BaseDropdown v-model="filters.sort" :label="t('recipes.filters.sort')" :options="sortOptions" :placeholder="t('recipes.sort.newest')" />
      </div>
      <div class="mt-4 flex justify-end gap-2">
        <BaseButton type="button" variant="button3" @click="$emit('reset')">{{ t("common.reset") }}</BaseButton>
        <BaseButton type="button" variant="button4" @click="$emit('close')">{{ t("common.close") }}</BaseButton>
        <BaseButton type="button" @click="$emit('apply')">{{ t("common.apply") }}</BaseButton>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useI18n } from "vue-i18n";
import BaseDropdown from "@/components/base/BaseDropdown.vue";
import BaseButton from "@/components/base/BaseButton.vue";

defineProps({
  open: {
    type: Boolean,
    default: false,
  },
  filters: {
    type: Object,
    required: true,
  },
  beerTypeOptions: {
    type: Array,
    default: () => [],
  },
  stepTypeOptions: {
    type: Array,
    default: () => [],
  },
  ingredientCategoryOptions: {
    type: Array,
    default: () => [],
  },
  defaultsOptions: {
    type: Array,
    default: () => [],
  },
  sortOptions: {
    type: Array,
    default: () => [],
  },
});

defineEmits(["close", "reset", "apply"]);

const { t } = useI18n();
</script>
