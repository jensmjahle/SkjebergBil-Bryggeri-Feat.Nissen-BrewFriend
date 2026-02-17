<template>
  <BaseCard class="space-y-4">
    <div>
      <h3>CO2 Volumer</h3>
      <p class="text-sm opacity-80">Fyll inn to felter, så regnes resten automatisk (temperatur + trykk eller CO2).</p>
    </div>

    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <BaseInput
        :model-value="temperatureC"
        type="number"
        step="0.1"
        label="Temperatur (°C)"
        @update:model-value="onTemperatureChange"
      />

      <div class="flex items-end gap-2">
        <div class="flex-1">
          <BaseInput
            :model-value="displayPressure"
            type="number"
            :step="pressureStep"
            :label="pressureLabel"
            @update:model-value="onPressureInputChange"
          />
        </div>
        <BaseToggle
          class="mb-[2px]"
          :model-value="pressureUnit"
          :options="pressureUnitOptions"
          @update:model-value="setPressureUnit"
        />
      </div>

      <BaseInput
        :model-value="co2Volumes"
        type="number"
        step="0.01"
        label="CO2 volumer"
        @update:model-value="onCo2Change"
      />
    </div>
  </BaseCard>
</template>

<script setup>
import { computed } from "vue";
import BaseCard from "@/components/base/BaseCard.vue";
import BaseInput from "@/components/base/BaseInput.vue";
import BaseToggle from "@/components/base/BaseToggle.vue";
import { useToolsStore } from "@/store/useToolsStore";

const store = useToolsStore();

const temperatureC = computed(() => store.co2.temperatureC);
const pressurePsi = computed(() => store.co2.pressurePsi);
const pressureBar = computed(() => store.co2.pressureBar);
const co2Volumes = computed(() => store.co2.co2Volumes);
const pressureUnit = computed(() =>
  store.co2.pressureUnit === "psi" ? "psi" : "bar",
);
const displayPressure = computed(() =>
  pressureUnit.value === "bar" ? pressureBar.value : pressurePsi.value,
);
const pressureStep = computed(() => (pressureUnit.value === "bar" ? 0.01 : 0.1));
const pressureLabel = computed(() =>
  pressureUnit.value === "bar" ? "Trykk (bar)" : "Trykk (PSI)",
);
const pressureUnitOptions = [
  { label: "bar", value: "bar" },
  { label: "psi", value: "psi" },
];

function n(value) {
  const x = Number(value);
  return Number.isFinite(x) ? x : null;
}

function cToF(c) {
  return (c * 9) / 5 + 32;
}

function psiToBar(psi) {
  return psi * 0.0689476;
}

function barToPsi(bar) {
  return bar / 0.0689476;
}

function pressureFromTempAndVolumes(tempC, volumes) {
  const t = cToF(tempC);
  const v = volumes;
  return (
    -16.6999 -
    0.0101059 * t +
    0.00116512 * t * t +
    0.173354 * t * v +
    4.24267 * v -
    0.0684226 * v * v
  );
}

function volumesFromTempAndPressure(tempC, psi) {
  const t = cToF(tempC);
  const a = -0.0684226;
  const b = 0.173354 * t + 4.24267;
  const c = -16.6999 - 0.0101059 * t + 0.00116512 * t * t - psi;
  const disc = b * b - 4 * a * c;
  if (disc < 0) return null;
  const root1 = (-b + Math.sqrt(disc)) / (2 * a);
  const root2 = (-b - Math.sqrt(disc)) / (2 * a);
  const valid = [root1, root2].filter((x) => Number.isFinite(x) && x > 0);
  if (!valid.length) return null;
  return Math.min(...valid);
}

function onTemperatureChange(value) {
  const t = n(value);
  if (t === null) return;

  if (store.co2.lastChanged === "co2") {
    const psi = pressureFromTempAndVolumes(t, store.co2.co2Volumes);
    store.setCo2({
      temperatureC: t,
      pressurePsi: Number(psi.toFixed(2)),
      pressureBar: Number(psiToBar(psi).toFixed(2)),
    });
  } else {
    const psi = store.co2.pressurePsi;
    const volumes = volumesFromTempAndPressure(t, psi);
    store.setCo2({
      temperatureC: t,
      co2Volumes: volumes === null ? store.co2.co2Volumes : Number(volumes.toFixed(2)),
    });
  }
}

function onPressureChange(value, unit) {
  const pressure = n(value);
  if (pressure === null) return;

  const psi = unit === "bar" ? barToPsi(pressure) : pressure;
  const bar = unit === "bar" ? pressure : psiToBar(psi);
  const volumes = volumesFromTempAndPressure(store.co2.temperatureC, psi);

  store.setCo2({
    pressurePsi: Number(psi.toFixed(2)),
    pressureBar: Number(bar.toFixed(2)),
    co2Volumes: volumes === null ? store.co2.co2Volumes : Number(volumes.toFixed(2)),
    lastChanged: "pressure",
  });
}

function onPressureInputChange(value) {
  onPressureChange(value, pressureUnit.value);
}

function setPressureUnit(unit) {
  const next = unit === "psi" ? "psi" : "bar";
  if (pressureUnit.value === next) return;
  store.setCo2({ pressureUnit: next });
}

function onCo2Change(value) {
  const volumes = n(value);
  if (volumes === null) return;
  const psi = pressureFromTempAndVolumes(store.co2.temperatureC, volumes);

  store.setCo2({
    co2Volumes: Number(volumes.toFixed(2)),
    pressurePsi: Number(psi.toFixed(2)),
    pressureBar: Number(psiToBar(psi).toFixed(2)),
    lastChanged: "co2",
  });
}
</script>
