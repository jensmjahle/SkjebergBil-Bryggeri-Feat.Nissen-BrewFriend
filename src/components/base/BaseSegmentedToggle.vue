<template>
  <fieldset :disabled="disabled" class="min-w-0" :class="fullWidth ? 'w-full' : 'inline-block'">
    <legend class="sr-only">{{ label }}</legend>
    <div class="grid gap-1 rounded-xl border border-border3 bg-bg4 p-1" :style="{ gridTemplateColumns: `repeat(${Math.max(options.length, 1)}, minmax(0, 1fr))` }">
      <label v-for="(option, index) in options" :key="option.value" class="relative min-w-0">
        <input
          type="radio"
          class="peer sr-only"
          :name="groupName"
          :value="option.value"
          :checked="modelValue === option.value"
          :disabled="disabled || option.disabled"
          @change="select(option)"
        />
        <span
          class="flex h-full min-h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border px-2 py-2 text-center text-sm leading-tight transition-[background-color,box-shadow,color] duration-150 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-button1-border peer-disabled:cursor-not-allowed peer-disabled:opacity-40 motion-reduce:transition-none"
          :class="modelValue === option.value ? 'border-button1-border bg-bg1 font-semibold text-text1 shadow-sm' : 'border-transparent text-text4 peer-enabled:hover:bg-bg2 peer-enabled:hover:text-text2'"
        >
          <component :is="option.icon" v-if="option.icon" class="h-4 w-4 shrink-0" aria-hidden="true" />
          <span class="min-w-0 break-words">{{ option.label }}</span>
          <slot name="suffix" :option="option" :selected="modelValue === option.value" :index="index" />
        </span>
      </label>
    </div>
  </fieldset>
</template>

<script setup>
import { useId } from 'vue';
const props = defineProps({
  modelValue: { type: [String, Number], default: null },
  options: { type: Array, required: true },
  label: { type: String, required: true },
  disabled: Boolean,
  fullWidth: { type: Boolean, default: true },
});
const emit = defineEmits(['update:modelValue', 'change']);
const groupName = `segmented-toggle-${useId()}`;
function select(option) {
  if (props.disabled || option.disabled || props.modelValue === option.value) return;
  emit('update:modelValue', option.value);
  emit('change', option.value);
}
</script>
