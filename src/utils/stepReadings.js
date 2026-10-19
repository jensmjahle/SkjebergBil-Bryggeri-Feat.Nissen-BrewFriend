import { stepPhase } from "./brewPhase.js";

export const readingFields = {
  preBoilVolumeLiters: { step: "0.1", min: 0, label: "pre_boil_volume" },
  postBoilVolumeLiters: { step: "0.1", min: 0, label: "post_boil_volume" },
  waterVolumeLiters: { step: "0.1", min: 0, label: "water_used" },
  volumeLiters: { step: "0.1", min: 0, label: "wort_collected" },
  preBoilGravity: {
    step: "0.001",
    min: 0.9,
    max: 2,
    label: "pre_boil_gravity",
  },
  og: { step: "0.001", min: 0.9, max: 2, label: "post_boil_gravity" },
  sg: { step: "0.001", min: 0.9, max: 2, label: "sg" },
  gravity: { step: "0.001", min: 0.9, max: 2, label: "gravity" },
  temperatureC: { step: "0.1", min: -30, max: 150, label: "temperature" },
  ph: { step: "0.01", min: 0, max: 14, label: "ph" },
  co2Volumes: { step: "0.1", min: 0, label: "co2" },
};
export function fieldsForStep(step) {
  return {
    boil: [
      "preBoilVolumeLiters",
      "postBoilVolumeLiters",
      "preBoilGravity",
      "og",
    ],
    sparge: ["waterVolumeLiters", "volumeLiters", "temperatureC", "sg"],
    mash: ["waterVolumeLiters", "temperatureC", "ph"],
    primary_fermentation: ["gravity", "temperatureC", "ph"],
    secondary_fermentation: ["gravity", "temperatureC", "ph"],
    cold_crash: ["temperatureC", "volumeLiters"],
    carbonation: ["volumeLiters", "co2Volumes", "temperatureC"],
    conditioning: ["temperatureC", "volumeLiters"],
    preparation: ["waterVolumeLiters", "temperatureC"],
    custom: ["volumeLiters", "gravity", "temperatureC"],
  }[stepPhase(step)].map((key) => ({ key, ...readingFields[key] }));
}
export function readingInvalid(value, field) {
  if (value == null || value === "") return false;
  return (
    !Number.isFinite(Number(value)) ||
    Number(value) < field.min ||
    (field.max != null && Number(value) > field.max)
  );
}
