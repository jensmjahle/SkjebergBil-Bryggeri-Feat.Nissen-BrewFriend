<script setup lang="ts">
import { computed, useAttrs } from "vue";

const props = defineProps<{
  modelValue: string | null | undefined;
  label?: string;
  help?: string;
  error?: string;
  id?: string;
  required?: boolean;
  rows?: number;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", v: string): void;
}>();

const computedId = computed(
  () => props.id || `fta-${Math.random().toString(36).slice(2, 9)}`,
);

const attrs = useAttrs();
const mergedAttrs = computed(() => {
  const { id: _ignore, ...rest } = (attrs as Record<string, any>) || {};
  return rest;
});

function onInput(e: Event) {
  const el = e.target as HTMLTextAreaElement;
  emit("update:modelValue", el.value);
}
</script>

<template>
  <div class="w-full">
    <label
      v-if="label"
      :for="computedId"
      class="mb-1 block text-sm font-medium text-[var(--color-text1)]"
    >
      {{ label }}
      <span v-if="required" class="text-[var(--color-danger)]">*</span>
    </label>

    <p v-if="help" class="mb-2 text-xs text-[var(--color-text2-faded)]">
      {{ help }}
    </p>

    <textarea
      v-bind="mergedAttrs"
      :id="computedId"
      :rows="rows || 4"
      :value="modelValue || ''"
      @input="onInput"
      class="w-full resize-y rounded-lg border border-border4 bg-bg4 px-3 py-2 text-text4 focus:outline-none focus:ring-2 focus:ring-button1"
      :class="error ? 'border-danger-border' : ''"
    />

    <p v-if="error" class="mt-1 text-xs text-danger">
      {{ error }}
    </p>
  </div>
</template>
