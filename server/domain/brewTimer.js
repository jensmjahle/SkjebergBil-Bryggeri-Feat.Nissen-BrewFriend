export const MAX_TIMER_SECONDS = 365 * 86400;
export function seekTimer(entry, step, remainingSeconds, now = Date.now()) {
  if (!Number.isFinite(remainingSeconds) || remainingSeconds < 0 || remainingSeconds > MAX_TIMER_SECONDS) throw new RangeError('Invalid timer value');
  if (entry.status === 'completed') throw new RangeError('Completed timers cannot be changed');
  const remaining = Math.round(remainingSeconds);
  const total = Math.max(0, Number(entry.timerDurationSeconds ?? Number(step.durationMinutes || 0)*60) || 0);
  const previous = entry.status === 'active' && entry.timerEndsAt
    ? Math.max(0, Math.ceil((new Date(entry.timerEndsAt).getTime()-now)/1000))
    : Number(entry.pausedRemainingSeconds ?? total);
  entry.timerAdjustmentSeconds = Number(entry.timerAdjustmentSeconds || 0) + remaining - previous;
  entry.timerDurationSeconds = Math.max(total, remaining);
  if (entry.status === 'active') {
    entry.timerEndsAt = new Date(now + remaining*1000);
    entry.pausedRemainingSeconds = undefined;
  } else {
    entry.pausedRemainingSeconds = remaining;
    entry.timerEndsAt = undefined;
  }
}
