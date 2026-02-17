<template>
  <BaseCard class="space-y-3 border-l-4 border-l-sky-500">
    <h3>Skylling (Steg {{ stepNumber }})</h3>
    <BaseInput
      :model-value="modelValue.title"
      label="Tittel"
      @update:model-value="setField('title', $event)"
    />
    <div class="grid gap-3 sm:grid-cols-2">
      <BaseInput
        :model-value="modelValue.temperatureC"
        :model-modifiers="{ number: true }"
        type="number"
        step="0.1"
        label="Temperatur °C"
        @update:model-value="setField('temperatureC', $event)"
      />
      <BaseInput
        :model-value="modelValue.durationMinutes"
        :model-modifiers="{ number: true }"
        type="number"
        step="1"
        label="Varighet (min)"
        @update:model-value="setField('durationMinutes', $event)"
      />
    </div>
    <BaseInput
      :model-value="modelValue.data?.waterAmountL"
      :model-modifiers="{ number: true }"
      type="number"
      step="0.1"
      label="Vannmengde (L)"
      placeholder="f.eks. 16.0"
      @update:model-value="setDataField('waterAmountL', $event)"
    />
    <BaseInput
      :model-value="modelValue.description"
      label="Notater"
      @update:model-value="setField('description', $event)"
    />
  </BaseCard>
</template>

<script setup>
import BaseCard from "@/components/base/BaseCard.vue";
import BaseInput from "@/components/base/BaseInput.vue";

const props = defineProps({
  modelValue: { type: Object, required: true },
  stepNumber: { type: Number, required: true },
});
const emit = defineEmits(["update:modelValue"]);

function setField(key, value) {
  emit("update:modelValue", { ...props.modelValue, [key]: value });
}

function setDataField(key, value) {
  emit("update:modelValue", {
    ...props.modelValue,
    data: { ...(props.modelValue.data || {}), [key]: value },
  });
}
</script>
