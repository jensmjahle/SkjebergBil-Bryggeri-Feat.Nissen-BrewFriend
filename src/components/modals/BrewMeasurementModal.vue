<template>
  <div
    v-if="open"
    class="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
    @click.self="$emit('close')"
  >
    <div
      class="flex max-h-[85svh] w-full max-w-lg flex-col rounded-t-xl border border-border3 bg-bg2 shadow-2xl sm:max-h-[90vh] sm:rounded-xl"
    >
      <div class="flex items-center justify-between gap-2 border-b border-border3 px-4 py-3">
        <h3 class="min-w-0 truncate">{{ t("brews.actions.add_measurement") }}</h3>
        <button
          type="button"
          class="rounded-md p-1 opacity-70 transition-opacity hover:opacity-100"
          :aria-label="t('common.close')"
          @click="$emit('close')"
        >
          <X class="h-5 w-5" />
        </button>
      </div>

      <div class="grid flex-1 grid-cols-2 gap-x-3 gap-y-2 overflow-y-auto px-4 py-3">
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
          v-model.number="form.og"
          :model-modifiers="{ number: true }"
          type="number"
          step="0.001"
          :label="t('brews.measurements.og')"
          placeholder="1.056"
        />
        <BaseInput
          v-model.number="form.fg"
          :model-modifiers="{ number: true }"
          type="number"
          step="0.001"
          :label="t('brews.measurements.fg')"
          placeholder="1.012"
        />
        <BaseInput
          v-model.number="form.sg"
          :model-modifiers="{ number: true }"
          type="number"
          step="0.001"
          :label="t('brews.measurements.sg')"
          placeholder="1.020"
        />
        <BaseInput
          v-model.number="form.ph"
          :model-modifiers="{ number: true }"
          type="number"
          step="0.01"
          :label="t('brews.measurements.ph')"
        />
        <BaseInput
          v-model.number="form.co2Volumes"
          :model-modifiers="{ number: true }"
          type="number"
          step="0.1"
          :label="t('brews.measurements.co2_volumes')"
        />
        <BaseInput
          v-model.number="form.ibu"
          :model-modifiers="{ number: true }"
          type="number"
          step="0.1"
          :label="t('brews.measurements.ibu')"
        />
        <BaseInput v-model="form.note" class="col-span-2" :label="t('recipes.fields.notes')" />
      </div>

      <div class="flex justify-end gap-2 border-t border-border3 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pb-3">
        <BaseButton type="button" variant="button3" class="flex-1 sm:flex-none" @click="$emit('close')">
          {{ t("common.cancel") }}
        </BaseButton>
        <BaseButton type="button" :disabled="loading" class="flex-1 sm:flex-none" @click="submit">
          {{ loading ? t("common.saving") : t("brews.actions.add_measurement") }}
        </BaseButton>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, watch } from "vue";
import { useI18n } from "vue-i18n";
import { X } from "lucide-vue-next";
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
  og: null,
  fg: null,
  sg: null,
  ph: null,
  co2Volumes: null,
  ibu: null,
  note: "",
});

function resetForm() {
  form.gravity = null;
  form.temperatureC = null;
  form.og = null;
  form.fg = null;
  form.sg = null;
  form.ph = null;
  form.co2Volumes = null;
  form.ibu = null;
  form.note = "";
}

function submit() {
  emit("submit", {
    gravity: form.gravity,
    temperatureC: form.temperatureC,
    og: form.og,
    fg: form.fg,
    sg: form.sg,
    ph: form.ph,
    co2Volumes: form.co2Volumes,
    ibu: form.ibu,
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
