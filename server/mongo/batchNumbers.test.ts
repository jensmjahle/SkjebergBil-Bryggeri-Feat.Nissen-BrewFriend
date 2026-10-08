import { test } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { Brew } from './models/Brew.js';
import { backfillBatchNumbers, nextBatchNumber } from './batchNumbers.js';

test('backfill adds numbers chronologically, preserves history and is restartable', async () => {
  const Counter: any = mongoose.models.BrewCounter;
  const old = new Date('2020-01-01');
  const docs = [
    { _id:'b', brewerId:'one', createdAt:new Date('2020-02-01'), updatedAt:old, measurements:[{ gravity:1.05 }], progress:{ stepProgress:[{status:'active'}] } },
    { _id:'a', brewerId:'one', createdAt:old, updatedAt:old, recipeSnapshot:{ name:'Old recipe',steps:[{ stepType:'mash' }] } },
    { _id:'c', brewerId:'two', createdAt:old, updatedAt:old, batchNumber:8 },
    { _id:'d', brewerId:'two', createdAt:old, updatedAt:old },
  ];
  const before = structuredClone(docs);
  const counters = new Map();
  const originals = [Counter.init, Counter.updateOne, Counter.findOneAndUpdate, Brew.distinct, Brew.findOne, Brew.find, Brew.collection.updateOne, Brew.init];
  Counter.init = async () => {};
  Counter.updateOne = async (filter: any, update: any) => { counters.set(filter._id, Math.max(counters.get(filter._id) || 0, update.$max.value)); };
  Counter.findOneAndUpdate = async (filter: any) => { const value = (counters.get(filter._id) || 0) + 1; counters.set(filter._id, value); return { value }; };
  Brew.distinct = async () => ['one','two'];
  Brew.findOne = (filter: any) => ({ sort: () => ({ lean: async () => docs.filter(d => d.brewerId === filter.brewerId && d.batchNumber).sort((a,b) => (b.batchNumber || 0)-(a.batchNumber || 0))[0] }) });
  Brew.find = (filter: any) => ({ sort: () => ({ select: () => ({ lean: async () => docs.filter(d => d.brewerId === filter.brewerId && !d.batchNumber).sort((a,b) => a.createdAt.getTime()-b.createdAt.getTime()) }) }) });
  Brew.collection.updateOne = async (filter: any, update: any) => { const doc = docs.find(d => d._id === filter._id && !d.batchNumber); if (doc) doc.batchNumber = update.$set.batchNumber; };
  Brew.init = async () => {};
  try {
    await backfillBatchNumbers();
    assert.deepEqual(docs.map(d => d.batchNumber), [2,1,8,9]);
    docs.forEach((doc,index) => { const { batchNumber, ...rest } = doc; const { batchNumber: ignored, ...expected } = before[index]; assert.deepEqual(rest, expected); });
    await backfillBatchNumbers();
    assert.deepEqual(docs.map(d => d.batchNumber), [2,1,8,9]);
    assert.equal(await nextBatchNumber('one'), 3);
    assert.equal(await nextBatchNumber('two'), 10);
    docs.splice(0,1); // Deleting a brew must not recycle its number.
    assert.equal(await nextBatchNumber('one'), 4);
  } finally {
    [Counter.init, Counter.updateOne, Counter.findOneAndUpdate, Brew.distinct, Brew.findOne, Brew.find, Brew.collection.updateOne, Brew.init] = originals;
  }
});

test('first-counter insertion race retries an atomic increment', async () => {
  const Counter: any = mongoose.models.BrewCounter;
  const original = Counter.findOneAndUpdate;
  let calls = 0;
  Counter.findOneAndUpdate = async (_filter: any, update: any, options: any) => {
    calls++;
    assert.deepEqual(update, { $inc:{ value:1 } });
    if (calls === 1) throw Object.assign(new Error('duplicate'), { code:11000 });
    assert.equal(options.upsert, undefined);
    return { value:2 };
  };
  try { assert.equal(await nextBatchNumber('race'), 2); assert.equal(calls, 2); }
  finally { Counter.findOneAndUpdate = original; }
});

test('legacy schema accepts missing batch and phase; explicit phase persists', async () => {
  const brew = new Brew({ brewerId:new mongoose.Types.ObjectId(), name:'Legacy', recipeSnapshot:{ steps:[{stepId:'x', order:1, stepType:'custom', phase:'mash', title:'Innmesk'}] } });
  await brew.validate();
  assert.equal(brew.recipeSnapshot.steps[0].phase, 'mash');
  assert.equal(brew.batchNumber, undefined);
  assert.ok(Brew.schema.path('batchNumber').options.immutable);
});
