import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scaleIngredientAmountText, scaleBoilScheduleText } from './batchScaling.js';
import { boilAdditions } from './boilSchedule.js';

test('legacy boil quantities scale with volume while ingredient names and timestamps stay intact', () => {
  const text = '138g East Kent Golding @ 60m, 83g East Kent Golding @ 15m, 83g East Kent Golding @ 1m';
  const scaled = scaleBoilScheduleText(text, 0.5);
  assert.equal(scaled, '69g East Kent Golding @ 60m, 41.5g East Kent Golding @ 15m, 41.5g East Kent Golding @ 1m');
  const events = boilAdditions({ durationMinutes: 60, data: { hopSchedule: scaled } });
  assert.deepEqual(events.map(e => [e.amount, e.remainingMinutes]), [['69',60],['41.5',15],['41.5',1]]);
  assert.equal(scaleBoilScheduleText(scaled, 2), text);
});

test('legacy scaling handles fractions without rewriting ingredient names or untimed instructions', () => {
  const text = '1/2 tablett Whirlfloc @ 15m; 20g Blend 7g Special @ 5m; Bruk 5 g til prøve';
  assert.equal(scaleBoilScheduleText(text, 2), '1 tablett Whirlfloc @ 15m; 40g Blend 7g Special @ 5m; Bruk 5 g til prøve');
  assert.equal(scaleBoilScheduleText('15 min: 1/2 tablett Whirlfloc', 2), '15 min: 1 tablett Whirlfloc');
});

test('unchanged volume preserves precision and invalid scaling cannot corrupt amounts', () => {
  assert.equal(scaleIngredientAmountText('1,234567', 1), '1,234567');
  assert.equal(scaleIngredientAmountText('1/0', 2), '1/0');
  for (const ratio of [NaN, Infinity, 0, -1]) assert.equal(scaleIngredientAmountText('10', ratio), '10');
});

test('scaling covers finings, decimal commas and leading timestamps without changing time-only prose', () => {
  assert.equal(scaleBoilScheduleText('15 min: 1,5 g Irish moss; 5 min: 0,5 tablett Whirlfloc\n0 min: 10 ml ekstrakt', 2), '15 min: 3 g Irish moss; 5 min: 1 tablett Whirlfloc\n0 min: 20 ml ekstrakt');
  assert.equal(scaleBoilScheduleText('60m bitter, 15m aroma, 5,5min finings', 2), '60m bitter, 15m aroma, 5,5min finings');
  assert.equal(scaleIngredientAmountText('2,5', 0.5), '1,25');
  assert.equal(scaleIngredientAmountText('etter smak', 2), 'etter smak');
});
