import { test } from 'node:test';
import assert from 'node:assert/strict';
import { seekTimer } from './brewTimer.js';
test('seeking a running timer preserves actual elapsed time and start date',()=>{
  const entry={status:'active',startedAt:new Date(1),activeSinceAt:new Date(1000),accumulatedActiveSeconds:123,timerDurationSeconds:3600,timerEndsAt:new Date(1800000)};
  seekTimer(entry,{durationMinutes:60},600,0);
  assert.equal(entry.timerEndsAt.getTime(),600000);assert.equal(entry.timerAdjustmentSeconds,-1200);
  assert.equal(entry.accumulatedActiveSeconds,123);assert.equal(entry.startedAt.getTime(),1);assert.equal(entry.activeSinceAt.getTime(),1000);assert.equal(entry.status,'active');
});
test('paused and unstarted timers stay paused, allow zero and can be extended',()=>{
  const entry={status:'pending',pausedRemainingSeconds:600,timerDurationSeconds:3600};
  seekTimer(entry,{durationMinutes:60},0);assert.equal(entry.pausedRemainingSeconds,0);assert.equal(entry.status,'pending');
  seekTimer(entry,{durationMinutes:60},4200);assert.equal(entry.timerDurationSeconds,4200);assert.equal(entry.timerAdjustmentSeconds,3600);assert.equal(entry.startedAt,undefined);
});
test('invalid values and completed steps cannot rewrite timers',()=>{
  for(const value of [NaN,Infinity,-1,366*86400])assert.throws(()=>seekTimer({status:'pending'},{},value),RangeError);
  assert.throws(()=>seekTimer({status:'completed'},{durationMinutes:20},20),RangeError);
});
