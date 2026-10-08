// Presentation phases are deliberately separate from the persisted brew lifecycle.
export const PHASES = ['preparation', 'mash', 'sparge', 'boil', 'primary_fermentation', 'secondary_fermentation', 'cold_crash', 'carbonation', 'conditioning', 'custom'];
export function stepPhase(step) {
  return PHASES.includes(step?.phase) ? step.phase : PHASES.includes(step?.stepType) ? step.stepType : 'custom';
}
export function phaseLabel(phase, t) {
  return PHASES.includes(phase) ? t(`recipes.step_types.${phase}`) : t(`brews.status.${phase}`);
}
export function brewTitle(brew) { return `${brew?.batchNumber ? `#${brew.batchNumber} - ` : ''}${brew?.name || ''}`; }
function phaseStep(brew) {
  const steps = brew?.recipeSnapshot?.steps || [];
  const entries = brew?.progress?.stepProgress || [];
  const active = entries.find(e => e.status === 'active');
  const tracked = steps.find(s => s.stepId === brew?.progress?.phaseStepId && entries.find(e => e.stepId === s.stepId)?.status !== 'completed');
  const paused = entries.filter(e => e.status !== 'completed' && e.startedAt).sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())[0];
  return steps.find(s => s.stepId === active?.stepId) || tracked
    || steps.find(s => s.stepId === paused?.stepId)
    || steps.find(s => entries.find(e => e.stepId === s.stepId)?.status !== 'completed');
}
export function brewPhase(brew) {
  if (['planned', 'completed', 'archived'].includes(brew?.status)) return brew.status;
  const step = phaseStep(brew);
  return step ? stepPhase(step) : brew?.status === 'conditioning' ? 'conditioning' : 'preparation';
}
export function brewPriority(brew) {
  return ({ boil: 0, mash: 1, sparge: 2, preparation: 3, custom: 4, primary_fermentation: 5,
    secondary_fermentation: 6, cold_crash: 7, carbonation: 8, conditioning: 9, planned: 10 })[brewPhase(brew)] ?? 99;
}
export function phaseProgress(brew, now = Date.now(), selectedStepId) {
  const steps = brew?.recipeSnapshot?.steps || [];
  const entries = new Map((brew?.progress?.stepProgress || []).map(e => [e.stepId, e]));
  const phase = brewPhase(brew);
  if (!selectedStepId && ['planned', 'completed', 'archived'].includes(phase)) {
    return { phase, total: 0, elapsed: 0, percent: 0, segments: [] };
  }
  let index = steps.findIndex(s => s.stepId === (selectedStepId || phaseStep(brew)?.stepId));
  if (index < 0) index = steps.findIndex(s => stepPhase(s) === phase && entries.get(s.stepId)?.status !== 'completed');
  if (index < 0) return { phase, total: 0, elapsed: 0, percent: 0, segments: [] };
  const groupPhase = stepPhase(steps[index]);
  let first = index, last = index;
  while (first > 0 && stepPhase(steps[first - 1]) === groupPhase) first--;
  while (last + 1 < steps.length && stepPhase(steps[last + 1]) === groupPhase) last++;
  const segments = steps.slice(first, last + 1).map(step => {
    const e = entries.get(step.stepId) || {};
    const total = Math.max(0, Number(e.timerDurationSeconds ?? Number(step.durationMinutes || 0) * 60) || 0);
    let elapsed = Number(e.accumulatedActiveSeconds || 0);
    if (e.status === 'completed') elapsed = total;
    else if (e.pausedRemainingSeconds != null) elapsed = total - Number(e.pausedRemainingSeconds);
    else if (e.status === 'active' && e.timerEndsAt) elapsed = total - Math.max(0, (new Date(e.timerEndsAt).getTime() - now) / 1000);
    else if (e.status === 'active' && e.activeSinceAt) elapsed += Math.max(0, (now - new Date(e.activeSinceAt).getTime()) / 1000);
    return { stepId:step.stepId, title: step.title, total, elapsed: Math.min(total, Math.max(0, elapsed)), status: e.status || 'pending' };
  });
  const total = segments.reduce((sum, s) => sum + s.total, 0);
  const elapsed = segments.reduce((sum, s) => sum + s.elapsed, 0);
  return { phase: groupPhase, total, elapsed, percent: total ? Math.min(100, Math.floor(elapsed / total * 100)) : 0, segments };
}
