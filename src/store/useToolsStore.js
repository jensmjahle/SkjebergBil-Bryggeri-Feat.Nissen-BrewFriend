import { defineStore } from "pinia";

const STORAGE_KEY = "brew_tools_state";

const defaultState = () => ({
  alcohol: {
    og: "1.056",
    fg: "1.012",
  },
  co2: {
    temperatureC: 4,
    pressurePsi: 12,
    pressureBar: 0.83,
    co2Volumes: 2.4,
    lastChanged: "co2",
  },
  hydrometer: {
    observedGravity: "1.050",
    sampleTempC: 24,
    calibrationTempC: 20,
  },
});

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    return { ...defaultState(), ...JSON.parse(raw) };
  } catch {
    return defaultState();
  }
}

export const useToolsStore = defineStore("tools", {
  state: () => loadState(),
  actions: {
    setAlcohol(payload) {
      this.alcohol = { ...this.alcohol, ...payload };
      this.persist();
    },
    setCo2(payload) {
      this.co2 = { ...this.co2, ...payload };
      this.persist();
    },
    setHydrometer(payload) {
      this.hydrometer = { ...this.hydrometer, ...payload };
      this.persist();
    },
    persist() {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        alcohol: this.alcohol,
        co2: this.co2,
        hydrometer: this.hydrometer,
      }));
    },
  },
});
