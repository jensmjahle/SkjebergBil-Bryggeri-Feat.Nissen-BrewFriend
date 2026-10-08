import { test } from 'node:test';
import assert from 'node:assert/strict';
import { brewPhase, phaseProgress, brewPriority, stepPhase } from './brewPhase.js';
const steps = [
  { stepId:'in', stepType:'mash', title:'Innmesk', durationMinutes:20 },
  { stepId:'main', stepType:'mash', title:'Hovedmesk', durationMinutes:60 },
  { stepId:'out', stepType:'mash', title:'Utmesk', durationMinutes:10 },
  { stepId:'boil', stepType:'boil', title:'Kok', durationMinutes:60 },
];
function brew(entries = [], overrides = {}) { return { status:'active', recipeSnapshot:{ steps }, progress:{ currentStepIndex:3, stepProgress:entries }, ...overrides }; }
test('legacy step types work without a phase field; explicit overrides win', () => {
  assert.equal(stepPhase(steps[0]), 'mash');
  assert.equal(stepPhase({ stepType:'custom', phase:'primary_fermentation' }), 'primary_fermentation');
  assert.equal(stepPhase({ stepType:'unknown' }), 'custom');
});
test('planned, completed and archived override the active step', () => {
  for (const status of ['planned','completed','archived']) assert.equal(brewPhase(brew([{ stepId:'main', status:'active' }], { status })), status);
});
test('browsing another step does not change the brewing phase', () => {
  assert.equal(brewPhase(brew([{ stepId:'main', status:'active' }])), 'mash');
});
test('three contiguous mash steps aggregate 90 minutes', () => {
  const result = phaseProgress(brew([{ stepId:'in', status:'completed' }, { stepId:'main', status:'active', timerEndsAt:new Date(3600000), timerDurationSeconds:3600 }]), 1800000);
  assert.equal(result.total, 5400); assert.equal(result.elapsed, 3000); assert.equal(result.percent, 55);
});
test('paused time stays frozen, including a timer paused at zero', () => {
  const b = brew([{ stepId:'main', status:'pending', startedAt:new Date(1), pausedRemainingSeconds:1800 }]);
  assert.equal(phaseProgress(b, 100).elapsed, phaseProgress(b, 999999999).elapsed);
  b.progress.stepProgress[0].pausedRemainingSeconds = 0;
  assert.equal(phaseProgress(b).elapsed, 3600);
});
test('overdue timers clamp and pending steps do not accrue time', () => {
  const result = phaseProgress(brew([{ stepId:'main', status:'active', timerEndsAt:new Date(1) }]), 999999999);
  assert.equal(result.elapsed, 3600); assert.ok(result.percent < 100);
});
test('disjoint occurrences of the same phase remain separate', () => {
  const b = brew([], { recipeSnapshot:{ steps:[steps[0], steps[3], steps[1]] } });
  assert.equal(phaseProgress(b, 0, 'main').total, 3600);
});
test('four-day fermentation reports half after two days and survives reload', () => {
  const b = brew([{ stepId:'ferment', status:'active', timerEndsAt:new Date(4*86400000) }], { recipeSnapshot:{ steps:[{ stepId:'ferment', stepType:'primary_fermentation', durationMinutes:5760 }] } });
  assert.equal(phaseProgress(JSON.parse(JSON.stringify(b)), 2*86400000).percent, 50);
});
test('boil is prioritised over fermentation, conditioning and planned brews', () => {
  const make = phase => brew([], { recipeSnapshot:{ steps:[{ stepId:'x', stepType:phase }] } });
  assert.ok(brewPriority(make('boil')) < brewPriority(make('primary_fermentation')));
  assert.ok(brewPriority(make('primary_fermentation')) < brewPriority(make('conditioning')));
  assert.ok(brewPriority(make('conditioning')) < brewPriority(brew([], {status:'planned'})));
});
test('missing steps and durations never produce NaN', () => {
  assert.equal(phaseProgress({}).percent, 0);
  assert.equal(phaseProgress(brew([], { recipeSnapshot:{ steps:[{stepId:'x',stepType:'custom'}] } })).total, 0);
});
test('resuming an older step and pausing it keeps the tracked phase', () => {
  const b = brew([{ stepId:'main', status:'pending', startedAt:new Date(1) }, { stepId:'boil', status:'pending', startedAt:new Date(500) }]);
  b.progress.phaseStepId = 'main';
  assert.equal(brewPhase(b), 'mash');
  assert.equal(phaseProgress(b).total, 5400);
});
test('planned and completed list entries never display a running timer', () => {
  for (const status of ['planned','completed']) assert.equal(phaseProgress(brew([{stepId:'main',status:'active'}], {status})).total, 0);
});
