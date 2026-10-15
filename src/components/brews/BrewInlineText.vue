<template>
  <textarea v-if="editing && multiline" ref="textarea" :value="modelValue" :aria-label="label" :placeholder="label" :disabled="disabled" rows="1" class="brew-inline-field brew-inline-field--multiline" @input="updateMultiline" />
  <span v-else-if="editing" class="brew-inline-size" :class="{ 'brew-inline-size--number': type === 'number' }">
    <span aria-hidden="true" class="brew-inline-measure">{{ modelValue || label || ' ' }}</span>
    <input :value="modelValue" :aria-label="label" :placeholder="label" :disabled="disabled" :type="type" :step="type === 'number' ? 'any' : undefined" class="brew-inline-field" @input="$emit('update:modelValue', type === 'number' ? ($event.target.value === '' ? null : Number($event.target.value)) : $event.target.value)" />
  </span>
  <span v-else>{{ modelValue ?? '' }}</span>
</template>
<script setup>
import { ref, watch, nextTick, onMounted } from 'vue';
const props = defineProps({ modelValue: [String, Number, Boolean], editing: Boolean, multiline: Boolean, disabled: Boolean, label: String, type: { type: String, default: 'text' } });
const emit = defineEmits(['update:modelValue']);
const textarea = ref(null);
function resize() {
  if (!textarea.value) return;
  textarea.value.style.height = 'auto';
  textarea.value.style.height = `${textarea.value.scrollHeight}px`;
}
function updateMultiline(event) { emit('update:modelValue', event.target.value); resize(); }
onMounted(resize);
watch(() => [props.editing, props.modelValue], async () => { await nextTick(); resize(); });
</script>
<style scoped>
.brew-inline-size { position: relative; display: inline-grid; vertical-align: baseline; min-width: 5ch; max-width: 100%; }
.brew-inline-size--number { min-width: 5ch; }
.brew-inline-measure { grid-area: 1 / 1; visibility: hidden; white-space: pre; padding: 2px 7px; min-width: 0; overflow: hidden; }
.brew-inline-field { box-sizing: border-box; width: 100%; min-width: 0; grid-area: 1 / 1; border: 0; border-bottom: 1px solid var(--color-border3); border-radius: 3px 3px 0 0; background: color-mix(in srgb, var(--color-button1) 5%, transparent); color: inherit; font: inherit; line-height: inherit; padding: 2px 7px; outline: none; transition: background .15s, border-color .15s; }
.brew-inline-field:hover { background: color-mix(in srgb, var(--color-button1) 9%, transparent); }
.brew-inline-field:focus { border-bottom-color: var(--color-button1); background: color-mix(in srgb, var(--color-button1) 12%, transparent); }
.brew-inline-field:disabled { opacity: .6; }
.brew-inline-field::placeholder { opacity: .45; color: inherit; }
.brew-inline-field--multiline { display: block; overflow: hidden; resize: none; min-height: 1.8em; }
.brew-inline-size > input { position: absolute; inset: 0; height: 100%; }
input[type=number] { appearance: textfield; -moz-appearance: textfield; }
input::-webkit-inner-spin-button, input::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
</style>
