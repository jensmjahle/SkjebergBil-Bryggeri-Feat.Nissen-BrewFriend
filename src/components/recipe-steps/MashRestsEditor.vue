<template>
  <fieldset class="min-w-0 space-y-3">
    <legend class="text-sm font-semibold">{{ t("brews.mash.rests") }}</legend>
    <p class="text-xs text-text2-faded">{{ t("brews.mash.rests_help") }}</p>
    <div v-for="(rest, index) in rows" :key="rest.restId" class="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-end gap-3">
      <BaseInput :model-value="rest.temperatureC" :model-modifiers="{ number: true }" type="number" step="0.1" :label="t('brews.mash.temp_c')" @update:model-value="update(index, 'temperatureC', $event)" />
      <BaseInput :model-value="rest.minutes" :model-modifiers="{ number: true }" type="number" min="0" step="1" :label="t('brews.mash.minutes')" @update:model-value="update(index, 'minutes', $event)" />
      <button type="button" class="mb-1 p-2 opacity-70 hover:opacity-100" :aria-label="t('brews.mash.remove_rest')" @click="remove(index)"><Trash2 :size="16" aria-hidden="true" /></button>
    </div>
    <button type="button" class="inline-flex items-center gap-1 text-sm underline" @click="add"><Plus :size="16" aria-hidden="true" />{{ t("brews.mash.add_rest") }}</button>
  </fieldset>
</template>
<script setup>
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { Plus, Trash2 } from "lucide-vue-next";
import BaseInput from "@/components/base/BaseInput.vue";

const props = defineProps({ modelValue: { type: Array, default: () => [] } });
const emit = defineEmits(["update:modelValue"]);
const { t } = useI18n();
const rows = computed(() => (Array.isArray(props.modelValue) ? props.modelValue : []));
function update(index, key, value) { emit("update:modelValue", rows.value.map((r, i) => (i === index ? { ...r, [key]: value } : r))); }
function remove(index) { emit("update:modelValue", rows.value.filter((_, i) => i !== index)); }
function add() {
  const last = rows.value[rows.value.length - 1];
  emit("update:modelValue", [...rows.value, { restId: `rest-${crypto.randomUUID()}`, temperatureC: last ? Number(last.temperatureC) + 10 || "" : 65, minutes: 10 }]);
}
</script>
