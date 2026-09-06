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
        <h3 class="min-w-0 truncate">{{ isEditing ? t("brews.actions.edit_measurement") : t("brews.actions.add_measurement") }}</h3>
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
          {{ submitLabel }}
        </BaseButton>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, reactive, watch } from "vue";
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
  // When set, the modal edits this measurement instead of creating a new one.
  measurement: {
    type: Object,
    default: null,
  },
});

const emit = defineEmits(["close", "submit"]);

const { t } = useI18n();

const form = reactive({
  gravity: null,
  temperatureC: null,
  ph: null,
  co2Volumes: null,
  ibu: null,
  note: "",
});

// Gravity covers what OG, FG and SG used to be split across, so the form only
// asks for gravity. The older fields are left out of the payload entirely, so
// measurements that still carry them are not wiped when edited.
const numericFields = ["gravity", "temperatureC", "ph", "co2Volumes", "ibu"];

const isEditing = computed(() => Boolean(props.measurement));

const submitLabel = computed(() => {
  if (props.loading) return t("common.saving");
  return isEditing.value
    ? t("brews.actions.save_measurement")
    : t("brews.actions.add_measurement");
});

function toFormValue(value) {
  // Number(null) is 0, so blank values have to be caught before converting.
  if (value === null || value === undefined || value === "") return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function resetForm() {
  const source = props.measurement || {};
  for (const field of numericFields) {
    form[field] = toFormValue(source[field]);
  }
  form.note = source.note || "";
}

// A measurement only needs the fields you actually took. Blank fields are sent
// as null so they are never stored as 0 - and so editing can clear a field
// that was filled in before.
function submit() {
  const payload = { note: form.note || null };

  for (const field of numericFields) {
    const value = form[field];
    if (value === null || value === undefined || value === "") {
      payload[field] = null;
      continue;
    }
    const numeric = Number(value);
    payload[field] = Number.isFinite(numeric) ? numeric : null;
  }

  emit("submit", payload);
}

watch(
  () => [props.open, props.measurement],
  ([isOpen]) => {
    if (isOpen) resetForm();
  },
  { immediate: true },
);
</script>
