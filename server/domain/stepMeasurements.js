export const STEP_MEASUREMENT_FIELDS = [
  "preBoilVolumeLiters",
  "postBoilVolumeLiters",
  "waterVolumeLiters",
  "volumeLiters",
  "preBoilGravity",
];

// Optional actual readings. Empty values clear a reading rather than record zero.
export function stepMeasurementError(payload, steps, existingStepId) {
  if (Object.hasOwn(payload, "stepId")) {
    if (
      typeof payload.stepId !== "string" ||
      !steps.some((step) => step.stepId === payload.stepId)
    )
      return "Unknown measurement step";
    if (existingStepId && payload.stepId !== existingStepId)
      return "A measurement cannot be moved to another step";
  }
  for (const key of STEP_MEASUREMENT_FIELDS) {
    const value = payload[key];
    if (value == null || value === "") continue;
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0)
      return `Invalid ${key}`;
    if (key === "preBoilGravity" && (value < 0.9 || value > 2))
      return `Invalid ${key}`;
  }
  return null;
}
