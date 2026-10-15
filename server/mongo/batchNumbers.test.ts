import { test } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { Brew } from './models/Brew.js';
import { backfillBatchNumbers, nextBatchNumber, ensureBatchNumber } from './batchNumbers.js';

test('backfill adds numbers chronologically, preserves history and is restartable', async () => {
  const Counter: any = mongoose.models.BrewCounter;
  const old = new Date('2020-01-01');
  const docs: any[] = [
    { _id:'b', brewerId:'one', createdAt:new Date('2020-02-01'), updatedAt:old, measurements:[{ gravity:1.05 }], progress:{ stepProgress:[{status:'active'}] } },
    { _id:'a', brewerId:'one', createdAt:old, updatedAt:old, recipeSnapshot:{ name:'Old recipe',steps:[{ stepType:'mash' }] } },
    { _id:'c', brewerId:'two', createdAt:old, updatedAt:old, batchNumber:8 },
    { _id:'d', brewerId:'two', createdAt:old, updatedAt:old },
    { _id:'plan', brewerId:'one', status:'planned', createdAt:old, updatedAt:old },
    { _id:'reserved', brewerId:'three', status:'planned', batchNumber:70, createdAt:old, updatedAt:old },
  ];
  const before = structuredClone(docs);
  const counters = new Map([['three',70]]);
  const originals = [Counter.init, Counter.updateOne, Counter.findOneAndUpdate, Brew.distinct, Brew.findOne, Brew.find, Brew.collection.updateOne, Brew.init, Brew.collection.updateMany];
  Counter.init = async () => {};
  Counter.updateOne = async (filter: any, update: any) => { counters.set(filter._id, Math.max(counters.get(filter._id) || 0, update.$max.value)); };
  Counter.findOneAndUpdate = async (filter: any) => { const value = (counters.get(filter._id) || 0) + 1; counters.set(filter._id, value); return { value }; };
  Brew.distinct = async () => ['one','two','three'];
  Brew.collection.updateMany = async (filter:any, update:any) => {
    assert.equal(filter.status, 'planned'); assert.ok(update.$unset.batchNumber !== undefined);
    docs.filter(d => d.status === 'planned' && !d.progress?.brewStartedAt && !d.timeline?.brewDayAt).forEach(d => delete d.batchNumber);
  };
  Brew.findOne = (filter: any) => ({ sort: () => ({ lean: async () => docs.filter(d => d.brewerId === filter.brewerId && d.batchNumber).sort((a,b) => (b.batchNumber || 0)-(a.batchNumber || 0))[0] }) });
  Brew.find = (filter: any) => ({ sort: () => ({ select: () => ({ lean: async () => docs.filter(d => d.brewerId === filter.brewerId && !d.batchNumber && d.status !== filter.status?.$ne).sort((a,b) => a.createdAt.getTime()-b.createdAt.getTime()) }) }) });
  Brew.collection.updateOne = async (filter: any, update: any) => { const doc = docs.find(d => d._id === filter._id && !d.batchNumber); if (doc) doc.batchNumber = update.$set.batchNumber; };
  Brew.init = async () => {};
  try {
    await backfillBatchNumbers();
    assert.deepEqual(docs.map(d => d.batchNumber), [2,1,8,9,undefined,undefined]);
    docs.forEach((doc,index) => { const { batchNumber, ...rest } = doc; const { batchNumber: ignored, ...expected } = before[index]; assert.deepEqual(rest, expected); });
    await backfillBatchNumbers();
    assert.deepEqual(docs.map(d => d.batchNumber), [2,1,8,9,undefined,undefined]);
    assert.equal(await nextBatchNumber('one'), 3);
    assert.equal(await nextBatchNumber('two'), 10);
    assert.equal(await nextBatchNumber('three'), 71);
    docs.splice(0,1); // Deleting a brew must not recycle its number.
    assert.equal(await nextBatchNumber('one'), 4);
  } finally {
    [Counter.init, Counter.updateOne, Counter.findOneAndUpdate, Brew.distinct, Brew.findOne, Brew.find, Brew.collection.updateOne, Brew.init, Brew.collection.updateMany] = originals;
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

test('starting claims one immutable number, even for concurrent start requests', async () => {
  const Counter: any = mongoose.models.BrewCounter;
  const originals = [Counter.findOneAndUpdate, Brew.collection.findOneAndUpdate, Brew.collection.findOne];
  let counter = 20;
  let assigned: number | undefined;
  Counter.findOneAndUpdate = async () => ({ value: ++counter });
  Brew.collection.findOneAndUpdate = async (_filter:any, update:any) => {
    if (assigned) return null;
    assigned = update.$set.batchNumber;
    return { batchNumber: assigned };
  };
  Brew.collection.findOne = async () => ({ batchNumber: assigned });
  const brewerId = new mongoose.Types.ObjectId();
  const id = new mongoose.Types.ObjectId();
  const first = Brew.hydrate({ _id:id, brewerId, status:'planned' });
  const second = Brew.hydrate({ _id:id, brewerId, status:'active' });
  try {
    await ensureBatchNumber(first);
    assert.equal(counter, 20, 'planning must not consume a number');
    first.status = 'active';
    await Promise.all([ensureBatchNumber(first), ensureBatchNumber(second)]);
    assert.equal(first.batchNumber, 21);
    assert.equal(second.batchNumber, 21);
    first.batchNumber = 99;
    assert.equal(first.batchNumber, 21, 'assigned number remains immutable');
    const afterStart = counter;
    await ensureBatchNumber(first);
    assert.equal(counter, afterStart, 'repeated starts must not allocate another number');
  } finally {
    [Counter.findOneAndUpdate, Brew.collection.findOneAndUpdate, Brew.collection.findOne] = originals;
  }
});
