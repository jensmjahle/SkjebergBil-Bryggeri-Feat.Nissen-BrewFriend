<template>
  <BaseCard class="space-y-3 border-l-4 border-l-teal-600">
    <h3>Sekundær Gjæring (Steg {{ stepNumber }})</h3>
    <BaseInput :model-value="modelValue.title" label="Tittel" @update:model-value="setField('title', $event)" />
    <div class="grid gap-3 sm:grid-cols-2">
      <BaseInput :model-value="modelValue.temperatureC" :model-modifiers="{ number: true }" type="number" step="0.1" label="Temperatur °C" @update:model-value="setField('temperatureC', $event)" />
      <BaseInput :model-value="durationDays" :model-modifiers="{ number: true }" type="number" step="0.1" label="Varighet (dager)" @update:model-value="setDurationDays($event)" />
    </div>
    <BaseInput :model-value="modelValue.description" label="Notater" @update:model-value="setField('description', $event)" />
  </BaseCard>
</template>

<script setup>
import { computed } from "vue";
import BaseCard from "@/components/base/BaseCard.vue";
import BaseInput from "@/components/base/BaseInput.vue";
const props = defineProps({ modelValue: { type: Object, required: true }, stepNumber: { type: Number, required: true } });
const emit = defineEmits(["update:modelValue"]);
function setField(key, value) { emit("update:modelValue", { ...props.modelValue, [key]: value }); }

const durationDays = computed(() => {
  const minutes = Number(props.modelValue.durationMinutes);
  if (!Number.isFinite(minutes) || minutes <= 0) return null;
  return Number((minutes / 1440).toFixed(2));
});

function setDurationDays(value) {
  const days = Number(value);
  const minutes = Number.isFinite(days) ? Math.round(days * 1440) : null;
  setField("durationMinutes", minutes);
}
</script>
