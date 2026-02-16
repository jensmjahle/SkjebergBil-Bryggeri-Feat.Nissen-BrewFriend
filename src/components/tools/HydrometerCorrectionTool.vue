<template>
  <BaseCard class="space-y-4">
    <div>
      <h3>Hydrometer Temperaturkorrigering</h3>
      <p class="text-sm opacity-80">Korriger gravity basert på prøvetemperatur.</p>
    </div>

    <div class="grid gap-3 sm:grid-cols-3">
      <BaseInput
        :model-value="observedGravity"
        label="Målt gravity"
        placeholder="1.050"
        @update:model-value="(v) => store.setHydrometer({ observedGravity: v })"
      />
      <BaseInput
        :model-value="sampleTempC"
        type="number"
        step="0.1"
        label="Prøvetemp (°C)"
        @update:model-value="(v) => store.setHydrometer({ sampleTempC: toNum(v, sampleTempC) })"
      />
      <BaseInput
        :model-value="calibrationTempC"
        type="number"
        step="0.1"
        label="Kalibrering (°C)"
        @update:model-value="(v) => store.setHydrometer({ calibrationTempC: toNum(v, calibrationTempC) })"
      />
    </div>

    <div class="rounded-lg border border-border3 p-3">
      <p class="text-sm">Korrigert gravity: <strong>{{ correctedText }}</strong></p>
    </div>
  </BaseCard>
</template>

<script setup>
import { computed } from "vue";
import BaseCard from "@/components/base/BaseCard.vue";
import BaseInput from "@/components/base/BaseInput.vue";
import { useToolsStore } from "@/store/useToolsStore";

const store = useToolsStore();

const observedGravity = computed(() => store.hydrometer.observedGravity);
const sampleTempC = computed(() => store.hydrometer.sampleTempC);
const calibrationTempC = computed(() => store.hydrometer.calibrationTempC);

function toNum(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback.value;
}

function cToF(c) {
  return (c * 9) / 5 + 32;
}

function factor(tempF) {
  return (
    1.00130346 -
    0.000134722124 * tempF +
    0.00000204052596 * tempF * tempF -
    0.00000000232820948 * tempF * tempF * tempF
  );
}

const corrected = computed(() => {
  const sg = Number(observedGravity.value);
  if (!Number.isFinite(sg)) return null;

  const sampleF = cToF(sampleTempC.value);
  const calF = cToF(calibrationTempC.value);
  const correctedValue = sg * (factor(sampleF) / factor(calF));
  return correctedValue;
});

const correctedText = computed(() => {
  if (corrected.value === null) return "-";
  return corrected.value.toFixed(3);
});
</script>
