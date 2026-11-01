<template>
  <div class="brew-tabs" role="tablist">
    <button
      v-for="option in options"
      :key="option.value"
      type="button"
      role="tab"
      class="brew-tab"
      :class="{ 'brew-tab--active': option.value === modelValue }"
      :aria-selected="option.value === modelValue"
      @click="$emit('update:modelValue', option.value)"
    >
      <component :is="option.icon" v-if="option.icon" class="h-4 w-4 shrink-0" aria-hidden="true" />
      <span class="truncate">{{ option.label }}</span>
    </button>
  </div>
</template>

<script setup>
defineProps({
  modelValue: { type: String, default: null },
  options: { type: Array, default: () => [] },
});
defineEmits(["update:modelValue"]);
</script>

<style scoped>
.brew-tabs { display: flex; align-items: flex-end; gap: 2px; padding: 0 4px; border-bottom: 1px solid var(--color-border3); overflow-x: auto; }
.brew-tab {
  position: relative; display: inline-flex; align-items: center; gap: 8px; min-width: 0; max-width: 220px;
  padding: 9px 18px; margin-bottom: -1px; font-size: 14px; font-weight: 600; white-space: nowrap;
  border: 1px solid transparent; border-bottom: 0; border-radius: 10px 10px 0 0;
  color: var(--color-text2-faded); background: transparent; transition: background-color .15s, color .15s;
}
.brew-tab:hover { background: var(--color-bg2); color: var(--color-text2); }
.brew-tab--active { background: var(--color-bg1); color: var(--color-text2); border-color: var(--color-border3); box-shadow: inset 0 3px 0 var(--color-button1); }
.brew-tab--active:hover { background: var(--color-bg1); }
@media (max-width: 640px) { .brew-tab { flex: 1; justify-content: center; padding: 9px 8px; } }
</style>
