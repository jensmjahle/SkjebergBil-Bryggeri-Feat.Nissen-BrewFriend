import { test } from 'node:test';
import assert from 'node:assert/strict';
import { completedSummary } from './brewSummary.js';
test('old sparge durations never create planned time deviations while actual elapsed time remains',()=>{
  const result=completedSummary({recipeSnapshot:{steps:[{stepId:'sparge',stepType:'sparge',durationMinutes:20}]},progress:{stepProgress:[{stepId:'sparge',status:'completed',startedAt:new Date(1),actualDurationSeconds:900,timerAdjustmentSeconds:100}]}});
  assert.equal(result.steps[0].planned,null);assert.equal(result.steps[0].delta,null);assert.equal(result.steps[0].actual,900);assert.equal(result.steps[0].timerAdjustmentSeconds,null);
});
test('actual ABV, percentage point deviation and frozen duration use saved data',()=>{
  const result=completedSummary({actualMetrics:{og:1.060,fg:1.012},targetMetrics:{og:1.056,fg:1.012},progress:{brewStartedAt:'2020-01-01',brewCompletedAt:'2020-01-22'}});
  assert.ok(Math.abs(result.actualAbv-6.3)<.00001);assert.ok(Math.abs(result.abvDelta-.525)<.00001);assert.equal(result.totalSeconds,21*86400);
});
test('missing real gravity never falls back to planned ABV or zero',()=>{
  const result=completedSummary({actualMetrics:{og:null,fg:''},targetMetrics:{og:1.056,fg:1.012}});
  assert.equal(result.actualAbv,null);assert.equal(result.abvDelta,null);assert.ok(result.plannedAbv>0);
});
test('completed without running a step is missing time rather than a false negative deviation',()=>{
  const result=completedSummary({recipeSnapshot:{steps:[{stepId:'x',title:'Mash',durationMinutes:60}]},progress:{stepProgress:[{stepId:'x',status:'completed',actualDurationSeconds:0}]}});
  assert.equal(result.steps[0].actual,null);assert.equal(result.steps[0].delta,null);assert.equal(result.loggedSteps,0);
});
test('legacy active steps freeze at completion and measured temperatures stay within step bounds',()=>{
  const result=completedSummary({recipeSnapshot:{steps:[{stepId:'x',title:'Mash',durationMinutes:60,temperatureC:67}]},progress:{brewCompletedAt:new Date(3600000),stepProgress:[{stepId:'x',status:'active',startedAt:new Date(1),activeSinceAt:new Date(1000000),accumulatedActiveSeconds:100}]},measurements:[{takenAt:new Date(2000000),temperatureC:69},{takenAt:new Date(4000000),temperatureC:90}]});
  assert.equal(result.steps[0].actual,2700);assert.equal(result.steps[0].temperature,69);assert.equal(result.steps[0].delta,-900);
});
test('readings explicitly linked to a step stay with that step when recorded later',()=>{
  const result=completedSummary({recipeSnapshot:{steps:[{stepId:'mash',title:'Mash'},{stepId:'sparge',title:'Sparge'}]},measurements:[{stepId:'mash',takenAt:'2026-10-15',temperatureC:67},{stepId:'sparge',takenAt:'2026-10-15',temperatureC:76}]});
  assert.equal(result.steps[0].temperature,67);
  assert.equal(result.steps[1].temperature,76);
});
