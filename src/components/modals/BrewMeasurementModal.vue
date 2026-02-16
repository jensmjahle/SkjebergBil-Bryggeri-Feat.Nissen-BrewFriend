<template>
  <div
    v-if="open"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
    @click.self="$emit('close')"
  >
    <div class="w-full max-w-lg rounded-xl border border-border3 bg-bg2 p-4 shadow-2xl">
      <h3 class="mb-3">{{ t("brews.actions.add_measurement") }}</h3>

      <div class="grid gap-3 md:grid-cols-2">
        <BaseInput
          v-model.number="form.gravity"
          :model-modifiers="{ number: true }"
          type="number"
          step="0.001"
          :label="t('brews.measurements.gravity')"
          placeholder="1.018"
        />
        <BaseInput
          v-model.number="form.temperatureC"
          :model-modifiers="{ number: true }"
          type="number"
          step="0.1"
          :label="t('brews.measurements.temperature')"
        />
        <BaseInput
          v-model.number="form.ph"
          :model-modifiers="{ number: true }"
          type="number"
          step="0.01"
          :label="t('brews.measurements.ph')"
        />
        <BaseInput v-model="form.note" :label="t('recipes.fields.notes')" />
      </div>

      <div class="mt-4 flex justify-end gap-2">
        <BaseButton type="button" variant="button3" @click="$emit('close')">
          {{ t("common.cancel") }}
        </BaseButton>
        <BaseButton type="button" :disabled="loading" @click="submit">
          {{ loading ? t("common.saving") : t("brews.actions.add_measurement") }}
        </BaseButton>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, watch } from "vue";
import { useI18n } from "vue-i18n";
import BaseInput from "@/components/base/BaseInput.vue";
import BaseButton from "@/components/base/BaseButton.vue";

const props = defineProps({
  open: {
    type: Boolean,
    default: false,
  },
  loading: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["close", "submit"]);

const { t } = useI18n();

const form = reactive({
  gravity: null,
  temperatureC: null,
  ph: null,
  note: "",
});

function resetForm() {
  form.gravity = null;
  form.temperatureC = null;
  form.ph = null;
  form.note = "";
}

function submit() {
  emit("submit", {
    gravity: form.gravity,
    temperatureC: form.temperatureC,
    ph: form.ph,
    note: form.note || undefined,
  });
}

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) resetForm();
  },
);
</script>
