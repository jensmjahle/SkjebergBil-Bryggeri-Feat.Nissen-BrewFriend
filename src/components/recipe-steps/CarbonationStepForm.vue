<template>
  <BaseCard class="space-y-3 border-l-4 border-l-blue-600">
    <h3>Karbonering (Steg {{ stepNumber }})</h3>
    <BaseInput :model-value="modelValue.title" label="Tittel" @update:model-value="setField('title', $event)" />
    <div class="grid gap-3 sm:grid-cols-2">
      <BaseInput :model-value="modelValue.co2Volumes" :model-modifiers="{ number: true }" type="number" step="0.1" label="CO2 volumer" @update:model-value="setField('co2Volumes', $event)" />
      <BaseInput :model-value="modelValue.temperatureC" :model-modifiers="{ number: true }" type="number" step="0.1" label="Temperatur °C" @update:model-value="setField('temperatureC', $event)" />
    </div>
    <BaseInput
      :model-value="modelValue.data?.method"
      label="Metode"
      placeholder="f.eks. Flaskekarbonering"
      @update:model-value="setDataField('method', $event)"
    />
    <BaseTextarea :model-value="modelValue.description" rows="4" label="Notater" @update:model-value="setField('description', $event)" />
  </BaseCard>
</template>

<script setup>
import BaseCard from "@/components/base/BaseCard.vue";
import BaseInput from "@/components/base/BaseInput.vue";
import BaseTextarea from "@/components/base/BaseTextarea.vue";
const props = defineProps({ modelValue: { type: Object, required: true }, stepNumber: { type: Number, required: true } });
const emit = defineEmits(["update:modelValue"]);
function setField(key, value) { emit("update:modelValue", { ...props.modelValue, [key]: value }); }
function setDataField(key, value) { emit("update:modelValue", { ...props.modelValue, data: { ...(props.modelValue.data || {}), [key]: value } }); }
</script>
