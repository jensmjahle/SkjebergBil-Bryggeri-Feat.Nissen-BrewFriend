<template>
  <fieldset class="min-w-0">
    <legend class="mb-2 text-sm font-medium text-text1">{{ label }}</legend>
    <div class="range-input">
      <label class="min-w-0 flex-1 px-3 py-2">
        <span class="block text-xs opacity-65">{{ fromLabel }}</span>
        <input
          :value="from"
          :aria-invalid="error ? true : undefined"
          :aria-describedby="error ? errorId : undefined"
          :aria-label="`${label} — ${fromLabel}`"
          :placeholder="fromPlaceholder"
          inputmode="decimal"
          class="range-input__field"
          @input="$emit('update:from', $event.target.value)"
        />
      </label>
      <span aria-hidden="true" class="self-center opacity-40">—</span>
      <label class="min-w-0 flex-1 px-3 py-2">
        <span class="block text-xs opacity-65">{{ toLabel }}</span>
        <input
          :value="to"
          :aria-invalid="error ? true : undefined"
          :aria-describedby="error ? errorId : undefined"
          :aria-label="`${label} — ${toLabel}`"
          :placeholder="toPlaceholder"
          inputmode="decimal"
          class="range-input__field"
          @input="$emit('update:to', $event.target.value)"
        />
      </label>
    </div>
    <p v-if="error" :id="errorId" role="alert" class="mt-2 text-xs text-[var(--color-error-text,var(--color-danger))]">{{ error }}</p>
  </fieldset>
</template>
<script setup>
import { useId } from "vue";
const errorId = useId();
defineProps({
  error: String,
  label: String,
  from: [String, Number],
  to: [String, Number],
  fromLabel: String,
  toLabel: String,
  fromPlaceholder: String,
  toPlaceholder: String,
});
defineEmits(["update:from", "update:to"]);
</script>
<style scoped>
.range-input {
  display: flex;
  min-width: 0;
  border: 1px solid var(--color-border4);
  border-radius: 0.625rem;
  background: var(--color-bg4);
  color: var(--color-text4);
}
.range-input:focus-within {
  outline: 2px solid var(--color-button1-border);
  outline-offset: -2px;
}
.range-input__field {
  display: block;
  width: 100%;
  min-width: 0;
  padding: 2px 0 0;
  border: 0;
  outline: none;
  background: transparent;
  color: inherit;
  font: inherit;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
</style>
