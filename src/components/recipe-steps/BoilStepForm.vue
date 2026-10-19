<template>
  <BaseCard class="space-y-3 border-l-4 border-l-button2">
    <h3>Koking (Steg {{ stepNumber }})</h3>
    <BaseInput :model-value="modelValue.title" label="Tittel" @update:model-value="setField('title', $event)" />
    <div class="grid gap-3 sm:grid-cols-2">
      <BaseInput :model-value="modelValue.temperatureC" :model-modifiers="{ number: true }" type="number" step="0.1" label="Temperatur °C" @update:model-value="setField('temperatureC', $event)" />
      <BaseInput :model-value="modelValue.durationMinutes" :model-modifiers="{ number: true }" type="number" step="1" label="Varighet (min)" @update:model-value="setField('durationMinutes', $event)" />
    </div>
    <BoilScheduleEditor :model-value="modelValue.data?.additions" :ingredients="ingredients" :duration-minutes="modelValue.durationMinutes" :legacy-text="modelValue.data?.hopSchedule" @update:model-value="setDataField('additions', $event)" />
    <BaseTextarea :model-value="modelValue.description" :rows="4" label="Notater" @update:model-value="setField('description', $event)" />
  </BaseCard>
</template>

<script setup>
import BaseCard from "@/components/base/BaseCard.vue";
import BaseInput from "@/components/base/BaseInput.vue";
import BaseTextarea from "@/components/base/BaseTextarea.vue";
import BoilScheduleEditor from './BoilScheduleEditor.vue';

const props = defineProps({ modelValue: { type: Object, required: true }, stepNumber: { type: Number, required: true }, ingredients: { type: Array, default: () => [] } });
const emit = defineEmits(["update:modelValue"]);

function setField(key, value) { emit("update:modelValue", { ...props.modelValue, [key]: value }); }
function setDataField(key, value) { emit("update:modelValue", { ...props.modelValue, data: { ...(props.modelValue.data || {}), [key]: value } }); }
</script>
