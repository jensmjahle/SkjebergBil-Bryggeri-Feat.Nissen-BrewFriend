import { test } from 'node:test';
import assert from 'node:assert/strict';
import { brewRatings, prepareRatings, syncEvaluation } from './brewRatings.js';
test('legacy evaluation is retained once and final notes survive deletion',()=>{
  const brew={evaluation:{rating:4,note:'Old final note',evaluatedAt:'2020-01-01'},timeline:{completedAt:'2020-01-02'}};
  prepareRatings(brew);prepareRatings(brew);assert.equal(brew.ratings.length,1);
  brew.ratings.push({ratingId:'new',rating:5,evaluatedAt:'2020-01-03'});syncEvaluation(brew);
  assert.equal(brew.evaluation.rating,4.5);assert.equal(brew.finalNotes,'Old final note');
  brew.ratings=[];syncEvaluation(brew);assert.equal(brew.evaluation,undefined);assert.deepEqual(brewRatings(brew),[]);assert.equal(brew.finalNotes,'Old final note');
  assert.equal(brew.timeline.completedAt,'2020-01-02');
});
test('legacy evaluations without dates use the historical completion date',()=>{
  assert.equal(brewRatings({evaluation:{rating:3},timeline:{completedAt:'2020-01-01'}})[0].evaluatedAt,'2020-01-01');
});
