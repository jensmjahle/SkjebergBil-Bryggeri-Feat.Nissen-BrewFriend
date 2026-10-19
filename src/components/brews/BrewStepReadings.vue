<template>
  <form
    class="step-readings"
    :data-phase="phase"
    @submit.prevent="save"
    novalidate
  >
    <div class="readings-heading">
      <div>
        <h4>
          {{
            t("brews.readings.title", {
              step: phaseLabel(phase, t).toLocaleLowerCase(),
            })
          }}
        </h4>
        <p>{{ t("brews.readings.help") }}</p>
      </div>
      <span v-if="measurement" class="text-xs text-text2-faded">{{
        t("brews.readings.recorded")
      }}</span>
    </div>
    <fieldset :disabled="saving || readonly" class="min-w-0">
      <div class="readings-fields">
        <BaseInput
          v-for="field in fields"
          :key="field.key"
          v-model.number="draft[field.key]"
          :model-modifiers="{ number: true }"
          type="number"
          :min="field.min"
          :max="field.max"
          :step="field.step"
          :label="
            t(
              `brews.readings.${phase === 'sparge' && field.key === 'volumeLiters' ? 'collected_wort' : field.label}`,
            )
          "
          :aria-invalid="readingInvalid(draft[field.key], field) || undefined"
          :error="
            readingInvalid(draft[field.key], field)
              ? t('brews.readings.invalid')
              : ''
          "
        />
      </div>
      <p v-if="boilLoss != null" class="mt-3 text-sm text-text2-faded">
        {{ t("brews.readings.boil_loss", { liters: number(boilLoss) }) }}
      </p>
      <p
        v-if="phase === 'sparge' && plannedWater != null"
        class="mt-3 text-sm text-text2-faded"
      >
        {{
          t("brews.readings.planned_water", { liters: number(plannedWater) })
        }}
      </p>
      <div v-if="!readonly" class="mt-4 flex flex-wrap items-center gap-3">
        <BaseButton
          type="submit"
          variant="button2"
          :disabled="!dirty || invalid || (!measurement && !hasReading)"
          >{{
            t(saving ? "common.saving" : "brews.actions.save_measurement")
          }}</BaseButton
        >
        <span v-if="dirty" class="text-xs text-text2-faded">{{
          t("brews.readings.unsaved")
        }}</span>
      </div>
    </fieldset>
    <p
      v-if="error"
      role="alert"
      class="mt-3 text-sm text-[var(--color-error-text,var(--color-danger))]"
    >
      {{ error }}
    </p>
    <p v-if="message && !dirty" role="status" class="mt-3 text-sm">
      {{ message }}
    </p>
  </form>
</template>
<script setup>
import { computed, reactive, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import BaseInput from "@/components/base/BaseInput.vue";
import BaseButton from "@/components/base/BaseButton.vue";
import { fieldsForStep, readingInvalid } from "@/utils/stepReadings.js";
import { phaseLabel, stepPhase } from "@/utils/brewPhase.js";
import {
  addBrewMeasurement,
  updateBrewMeasurement,
} from "@/services/brews.service.js";
const props = defineProps({ brew: Object, step: Object, readonly: Boolean });
const emit = defineEmits(["saved"]);
const { t, locale } = useI18n();
const phase = computed(() => stepPhase(props.step));
const fields = computed(() => fieldsForStep(props.step));
const measurement = computed(() =>
  [...(props.brew.measurements || [])]
    .reverse()
    .find((m) => m.stepId === props.step.stepId),
);
const draft = reactive({}),
  baseline = ref(""),
  saving = ref(false),
  error = ref(""),
  message = ref("");
const values = () =>
  Object.fromEntries(
    fields.value.map(({ key }) => [
      key,
      draft[key] === "" || draft[key] == null ? null : Number(draft[key]),
    ]),
  );
const dirty = computed(() => JSON.stringify(values()) !== baseline.value);
const invalid = computed(() =>
  fields.value.some((f) => readingInvalid(draft[f.key], f)),
);
const hasReading = computed(() =>
  Object.values(values()).some((v) => v != null),
);
const boilLoss = computed(() =>
  phase.value === "boil" &&
  draft.preBoilVolumeLiters !== "" &&
  draft.preBoilVolumeLiters != null &&
  draft.postBoilVolumeLiters !== "" &&
  draft.postBoilVolumeLiters != null
    ? Number(draft.preBoilVolumeLiters) - Number(draft.postBoilVolumeLiters)
    : null,
);
const plannedWater = computed(() => props.step.data?.waterAmountL);
const number = (v) =>
  new Intl.NumberFormat(locale.value === "no" ? "nb-NO" : locale.value, {
    maximumFractionDigits: 2,
  }).format(v);
function hydrate() {
  for (const { key } of fields.value)
    draft[key] = measurement.value?.[key] ?? null;
  baseline.value = JSON.stringify(values());
}
watch(measurement, () => {
  if (!dirty.value && !saving.value) hydrate();
});
hydrate();
async function save() {
  if (
    saving.value ||
    props.readonly ||
    invalid.value ||
    !dirty.value ||
    (!measurement.value && !hasReading.value)
  )
    return;
  saving.value = true;
  error.value = "";
  message.value = "";
  const payload = { stepId: props.step.stepId, ...values() };
  try {
    const saved = measurement.value?._id
      ? await updateBrewMeasurement(
          props.brew._id,
          measurement.value._id,
          payload,
        )
      : await addBrewMeasurement(props.brew._id, payload);
    baseline.value = JSON.stringify(values());
    message.value = t("brews.readings.saved");
    emit("saved", saved);
  } catch (err) {
    error.value =
      err?.response?.data?.error ||
      err?.message ||
      t("brews.errors.measurement_failed");
  } finally {
    saving.value = false;
  }
}
</script>
<style scoped>
.step-readings {
  padding: 22px 0;
  border-top: 1px solid var(--color-border3);
  border-bottom: 1px solid var(--color-border3);
}
.readings-heading {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 16px;
}
.readings-heading h4 {
  font-size: 16px;
  font-weight: 700;
}
.readings-heading p {
  margin-top: 4px;
  font-size: 12px;
  color: var(--color-text2-faded);
}
.readings-fields {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px 20px;
}
.step-readings[data-phase="sparge"] {
  border-left: 3px solid var(--color-button2-border);
  padding-left: 16px;
}
@media (max-width: 420px) {
  .readings-fields {
    gap: 14px 10px;
  }
  .readings-heading {
    align-items: flex-start;
  }
}
</style>
