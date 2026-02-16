<template>
  <BaseCard class="space-y-3 border-l-4 border-l-amber-500">
    <h3>Forberedning (Steg {{ stepNumber }})</h3>
    <BaseInput
      :model-value="modelValue.title"
      label="Tittel"
      @update:model-value="setField('title', $event)"
    />
    <BaseInput
      :model-value="modelValue.description"
      label="Beskrivelse"
      @update:model-value="setField('description', $event)"
    />
    <BaseInput
      :model-value="modelValue.data?.checklist"
      label="Sjekkliste"
      placeholder="f.eks. Vask utstyr, klargjør malt"
      @update:model-value="setDataField('checklist', $event)"
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
