export function numberOrNull(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}
function timestamp(value) { const n = value ? new Date(value).getTime() : NaN; return Number.isFinite(n) ? n : null; }
function plannedGravity(brew, key) {
  const target = numberOrNull(brew?.targetMetrics?.[key]);
  if (target !== null) return target;
  const defaults = brew?.recipeSnapshot?.defaults || {};
  const low = numberOrNull(defaults[`${key}From`]), high = numberOrNull(defaults[`${key}To`]);
  return low !== null && high !== null ? (low + high) / 2 : low ?? high;
}
export function completedSummary(brew) {
  const measurements = [...(brew?.measurements || [])].sort((a,b) => (timestamp(a.takenAt) || 0) - (timestamp(b.takenAt) || 0));
  const latestValue = key => [...measurements].reverse().map(m => numberOrNull(m[key])).find(n => n !== null) ?? null;
  const actualOg = numberOrNull(brew?.actualMetrics?.og) ?? latestValue('og');
  const actualFg = numberOrNull(brew?.actualMetrics?.fg) ?? latestValue('fg');
  const plannedOg = plannedGravity(brew, 'og'), plannedFg = plannedGravity(brew, 'fg');
  const abv = (og, fg) => og !== null && fg !== null ? Math.max(0, (og-fg)*131.25) : null;
  const actualAbv = abv(actualOg, actualFg), plannedAbv = abv(plannedOg, plannedFg);
  const startedAt = timestamp(brew?.progress?.brewStartedAt) ?? timestamp(brew?.timeline?.brewDayAt);
  const completedAt = timestamp(brew?.progress?.brewCompletedAt) ?? timestamp(brew?.timeline?.completedAt);
  const entries = new Map((brew?.progress?.stepProgress || []).map(e => [e.stepId,e]));
  const steps = (brew?.recipeSnapshot?.steps || []).map(step => {
    const entry = entries.get(step.stepId) || {};
    let actual = numberOrNull(entry.actualDurationSeconds);
    if (actual === null && (entry.startedAt || Number(entry.accumulatedActiveSeconds) > 0)) {
      actual = numberOrNull(entry.accumulatedActiveSeconds) ?? numberOrNull(entry.loggedDurationSeconds) ?? null;
      const activeSince = timestamp(entry.activeSinceAt);
      if (entry.status === 'active' && activeSince !== null && completedAt !== null) actual = (actual || 0) + Math.max(0,(completedAt-activeSince)/1000);
    }
    if (actual === 0 && !entry.startedAt) actual = null;
    const minutes = numberOrNull(step.durationMinutes);
    const planned = minutes === null ? null : minutes*60;
    const readings = measurements.filter(m => {
      const at = timestamp(m.takenAt), start = timestamp(entry.startedAt), end = timestamp(entry.completedAt) ?? (entry.status === 'active' ? completedAt : null);
      return at !== null && start !== null && end !== null && at >= start && at <= end && numberOrNull(m.temperatureC) !== null;
    });
    const temperature = readings.length ? readings.reduce((sum,m) => sum+Number(m.temperatureC),0)/readings.length : null;
    return { stepId:step.stepId, title:step.title, planned, actual, delta:actual !== null && planned !== null ? actual-planned : null,
      note:entry.note || '', temperature, plannedTemperature:numberOrNull(step.temperatureC), timerAdjustmentSeconds:numberOrNull(entry.timerAdjustmentSeconds) };
  });
  const metrics = [
    { key:'og', planned:plannedOg, actual:actualOg, precision:3 },
    { key:'fg', planned:plannedFg, actual:actualFg, precision:3 },
    ...['ph','co2Volumes','ibu'].map(key => ({ key, planned:numberOrNull(brew?.targetMetrics?.[key]) ?? numberOrNull(brew?.recipeSnapshot?.defaults?.[key]), actual:latestValue(key), precision:key === 'ibu' ? 1 : 2 })),
  ].map(m => ({ ...m, delta:m.actual !== null && m.planned !== null ? m.actual-m.planned : null }));
  return { actualAbv, plannedAbv, abvDelta:actualAbv !== null && plannedAbv !== null ? actualAbv-plannedAbv : null,
    startedAt, completedAt, totalSeconds:startedAt !== null && completedAt !== null ? Math.max(0,(completedAt-startedAt)/1000) : null,
    loggedSeconds:steps.some(s=>s.actual!==null) ? steps.reduce((sum,s)=>sum+(s.actual||0),0) : null,
    loggedSteps:steps.filter(s=>s.actual!==null).length, steps, metrics,
    startDelta:startedAt !== null && timestamp(brew?.timeline?.plannedStartAt) !== null ? (startedAt-timestamp(brew.timeline.plannedStartAt))/1000 : null };
}
