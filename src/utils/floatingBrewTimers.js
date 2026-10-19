import { stepPhase, stepHasCountdown } from "./brewPhase.js";
import { boilScheduleState } from './boilSchedule.js';

const dayPhases = [
  "primary_fermentation",
  "secondary_fermentation",
  "cold_crash",
  "conditioning",
];

export function floatingBrewTimers(brew, now = Date.now()) {
  if (!brew?._id || ["planned", "completed", "archived"].includes(brew.status))
    return [];
  const progress = new Map(
    (brew.progress?.stepProgress || []).map((entry) => [entry.stepId, entry]),
  );
  return (brew.recipeSnapshot?.steps || []).flatMap((step) => {
    if (!stepHasCountdown(step)) return [];
    const entry = progress.get(step.stepId);
    if (!entry || !["active", "pending", "paused"].includes(entry.status))
      return [];
    // Seeking an unstarted timer also sets a duration and paused remaining time.
    // Only a real start makes it eligible for the floating clock.
    const startedAt = entry.startedAt || entry.activeSinceAt;
    if (!startedAt && !(entry.status === "active" && entry.timerEndsAt))
      return [];
    const total =
      entry.timerDurationSeconds > 0
        ? Number(entry.timerDurationSeconds)
        : Number(step.durationMinutes) * 60;
    if (!Number.isFinite(total) || total <= 0) return [];
    const end = Date.parse(entry.timerEndsAt);
    const paused = entry.status !== "active" || !Number.isFinite(end);
    const remaining = paused
      ? Number(entry.pausedRemainingSeconds)
      : Math.floor((end - now) / 1000);
    if (
      !Number.isFinite(remaining) ||
      (paused && entry.pausedRemainingSeconds == null)
    )
      return [];
    const boil = stepPhase(step) === 'boil' ? boilScheduleState(step, entry, remaining, brew.recipeSnapshot?.ingredients) : null;
    return [
      {
        key: JSON.stringify([
          String(brew._id),
          step.stepId,
          startedAt || entry.timerEndsAt,
        ]),
        brewId: String(brew._id),
        stepId: step.stepId,
        title: boil?.nextGroup.length ? `${step.title} · ${boil.nextGroup.map(item => item.name).join(' · ')}` : step.title,
        brewName: brew.name || brew.recipeSnapshot?.name || "",
        total: boil ? boil.total : total,
        remaining: boil ? boil.remaining : remaining,
        paused,
        showDays: dayPhases.includes(stepPhase(step)),
      },
    ];
  });
}

export function clampTimerPosition(x, y, size, width, height) {
  const margin = 12;
  return {
    x: Math.max(margin, Math.min(x, width - size - margin)),
    y: Math.max(margin, Math.min(y, height - size - margin)),
  };
}
