<template>
  <div
    v-bind="$attrs"
    :class="[
      'flex overflow-hidden rounded-lg border border-border4 bg-bg4',
      fullWidth ? 'w-full' : '',
    ]"
  >
    <button
      v-for="(option, index) in normalizedOptions"
      :key="`${String(option.value)}-${index}`"
      type="button"
      :class="[
        'inline-flex items-center justify-center px-3 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        fullWidth ? 'flex-1' : '',
        isActive(option.value)
          ? 'bg-button1 text-button1-meta'
          : 'text-text4 hover:bg-bg2',
      ]"
      :disabled="disabled || option.disabled"
      @click="selectValue(option.value)"
    >
      {{ option.label }}
    </button>
  </div>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
  modelValue: {
    type: [String, Number, Boolean],
    default: null,
  },
  options: {
    type: Array,
    default: () => [],
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  fullWidth: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["update:modelValue", "change"]);

const normalizedOptions = computed(() =>
  (props.options || []).map((option) => ({
    label: String(option?.label ?? ""),
    value: option?.value,
    disabled: Boolean(option?.disabled),
  })),
);

function isActive(value) {
  return props.modelValue === value;
}

function selectValue(value) {
  if (props.disabled || props.modelValue === value) return;
  emit("update:modelValue", value);
  emit("change", value);
}
</script>
