import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import mongoose from 'mongoose';
import { brewsRouter } from './brews.js';
import { Brew } from '../mongo/models/Brew.js';
import { Brewer } from '../mongo/models/Brewer.js';
import { Recipe } from '../mongo/models/Recipe.js';

test('rating CRUD, final notes and timer routes preserve historical fields', async () => {
  const brewerId = new mongoose.Types.ObjectId();
  const originalBrew = Brew.findOne, originalBrewer = Brewer.findOne;
  const brew = new Brew({ brewerId, name:'Historical', batchNumber:5, status:'completed',
    timeline:{brewDayAt:'2020-01-01',completedAt:'2020-01-22'},
    progress:{brewStartedAt:'2020-01-01',brewCompletedAt:'2020-01-22',stepProgress:[{stepId:'mash',status:'completed',startedAt:'2020-01-01',actualDurationSeconds:1200}]},
    recipeSnapshot:{steps:[{stepId:'mash',order:1,stepType:'mash',title:'Mash',durationMinutes:20}]},
    evaluation:{rating:4,note:'Old note',evaluatedAt:'2020-01-22'},measurements:[{gravity:1.012,takenAt:'2020-01-21'}],
  });
  brew.save = async () => { await brew.validate();return brew; };
  Brew.findOne = async (filter:any) => String(filter._id)===String(brew._id) && String(filter.brewerId)===String(brewerId) ? brew : null;
  Brewer.findOne = async () => ({_id:brewerId});
  const app=express();app.use(express.json());app.use('/api/brews',brewsRouter);
  const server=app.listen(0,'127.0.0.1');
  await new Promise<void>(resolve=>server.on('listening',resolve));
  const address:any=server.address();const base=`http://127.0.0.1:${address.port}/api/brews/${brew._id}`;
  const request=async(path:string,method:string,payload?:any)=>{
    const response=await fetch(base+path,{method,headers:{'Content-Type':'application/json'},body:payload===undefined?undefined:JSON.stringify(payload)});
    return {status:response.status,body:await response.json()};
  };
  try {
    const completedAt=brew.progress.brewCompletedAt.toISOString();
    const names=await request('','PATCH',{brewers:[' Tobben ','Nissen','Tobben']});
    assert.equal(names.status,200);assert.deepEqual(names.body.brewers,['Tobben','Nissen']);assert.equal(names.body.progress.brewCompletedAt,completedAt);
    assert.equal((await request('','PATCH',{brewers:['x'.repeat(121)]})).status,400);
    let response=await request('/ratings','POST',{rating:5,note:'Second tasting'});
    assert.equal(response.status,201);assert.equal(response.body.ratings.length,2);assert.equal(response.body.evaluation.rating,4.5);
    assert.equal(response.body.finalNotes,'Old note');assert.equal(response.body.progress.brewCompletedAt,completedAt);
    const newId=response.body.ratings[1].ratingId;
    response=await request(`/ratings/${newId}`,'PATCH',{rating:3.25,note:'Edited'});
    assert.equal(response.status,200);assert.equal(response.body.evaluation.rating,3.625);
    response=await request('','PATCH',{finalNotes:'Separate final notes'});assert.equal(response.status,200);
    response=await request('/ratings/legacy','DELETE');assert.equal(response.body.ratings.length,1);
    response=await request(`/ratings/${newId}`,'DELETE');assert.deepEqual(response.body.ratings,[]);assert.equal(response.body.evaluation,undefined);assert.equal(response.body.finalNotes,'Separate final notes');
    response=await request('','GET');assert.deepEqual(response.body.ratings,[]);assert.equal(response.body.batchNumber,5);assert.equal(response.body.measurements.length,1);assert.equal(response.body.progress.brewCompletedAt,completedAt);
    response=await request('','PATCH',{evaluation:{rating:3.5,note:'Compatibility'}});assert.equal(response.status,200);assert.equal(response.body.ratings.length,1);assert.equal(response.body.evaluation.rating,3.5);
    response=await request('','PATCH',{evaluation:{rating:null}});assert.equal(response.status,200);assert.deepEqual(response.body.ratings,[]);
    await request('','PATCH',{finalNotes:'Separate final notes'});
    response=await request('/finish','POST',{rating:4.5});assert.equal(response.status,200);assert.equal(response.body.progress.brewCompletedAt,completedAt);assert.equal(response.body.finalNotes,'Separate final notes');
    assert.equal((await request('/ratings','POST',{rating:6})).status,400);
    assert.equal((await request('/ratings/missing','DELETE')).status,404);
    assert.equal((await request('/steps/mash/timer','PATCH',{remainingSeconds:300})).status,400);
    brew.status='active';brew.progress.stepProgress[0].status='active';brew.progress.stepProgress[0].activeSinceAt=new Date();brew.progress.stepProgress[0].timerEndsAt=new Date(Date.now()+900000);brew.progress.stepProgress[0].timerDurationSeconds=1200;brew.progress.stepProgress[0].accumulatedActiveSeconds=123;
    response=await request('/steps/mash/timer','PATCH',{remainingSeconds:300});assert.equal(response.status,200);assert.equal(brew.progress.stepProgress[0].accumulatedActiveSeconds,123);assert.equal(response.body.progress.stepProgress[0].status,'active');
    assert.ok(Math.abs(new Date(response.body.progress.stepProgress[0].timerEndsAt).getTime()-Date.now()-300000)<2000);
    response=await request('/steps/mash/pause','POST');assert.equal(response.status,200);
    response=await request('/steps/mash/timer','PATCH',{remainingSeconds:0});assert.equal(response.status,200);assert.equal(response.body.progress.stepProgress[0].pausedRemainingSeconds,0);assert.equal(response.body.progress.stepProgress[0].status,'pending');
    response=await request('/steps/mash/start','POST');assert.equal(response.status,200);assert.ok(new Date(response.body.progress.stepProgress[0].timerEndsAt).getTime()<=Date.now());
    assert.equal((await request('/steps/mash/timer','PATCH',{remainingSeconds:-1})).status,400);
  } finally {
    Brew.findOne=originalBrew;Brewer.findOne=originalBrewer;
    await new Promise<void>(resolve=>server.close(()=>resolve()));
  }
});


test('plans receive batch numbers on brew or step start, never on creation or editing', async () => {
  const Counter: any = mongoose.models.BrewCounter;
  const original = [Brew.findOne, Brew.create, Brewer.findOne, Recipe.findOne, Counter.findOneAndUpdate, Brew.collection.findOneAndUpdate, Brew.collection.findOne];
  const brewerId = new mongoose.Types.ObjectId();
  const recipeId = new mongoose.Types.ObjectId();
  const docs = new Map<string, any>();
  const numbers = new Map<string, number>();
  let counter = 0;
  const snapshot = {name:'Pils',steps:[{stepId:'mash',order:1,stepType:'mash',title:'Mash',durationMinutes:60}]};
  Brewer.findOne = async () => ({_id:brewerId});
  Recipe.findOne = async () => ({_id:recipeId, ...snapshot});
  Brew.findOne = async (filter:any) => docs.get(String(filter._id)) || null;
  Brew.create = async (payload:any) => {
    const doc = new Brew(payload);
    doc.save = async () => { await doc.validate(); doc.$isNew = false; return doc; };
    await doc.save(); docs.set(String(doc._id), doc); return doc;
  };
  Counter.findOneAndUpdate = async () => ({value:++counter});
  Brew.collection.findOneAndUpdate = async (filter:any, update:any) => {
    const id = String(filter._id);
    if (numbers.has(id)) return null;
    numbers.set(id, update.$set.batchNumber);
    return {batchNumber:numbers.get(id)};
  };
  Brew.collection.findOne = async (filter:any) => ({batchNumber:numbers.get(String(filter._id))});
  const app = express(); app.use(express.json()); app.use('/api/brews',brewsRouter);
  const server = app.listen(0,'127.0.0.1');
  await new Promise<void>(resolve => server.on('listening', resolve));
  const address:any = server.address();
  const request = async (path:string, method='POST', body:any={}) => {
    const response = await fetch(`http://127.0.0.1:${address.port}/api/brews${path}`, {method, headers:{'Content-Type':'application/json'}, body:JSON.stringify(body)});
    const data = await response.json();
    assert.ok(response.ok, JSON.stringify(data)); return data;
  };
  try {
    const plan = await request('', 'POST', {name:'Plan A',recipeSnapshot:snapshot});
    const recipePlan = await request(`/from-recipe/${recipeId}`);
    assert.equal(plan.batchNumber, undefined);
    assert.equal(recipePlan.batchNumber, undefined);
    assert.equal(counter, 0);
    await request(`/${plan._id}`, 'PATCH', {name:'Renamed plan'});
    assert.equal(counter, 0);
    const started = await request(`/${plan._id}/start`);
    assert.equal(started.batchNumber, 1);
    assert.equal((await request(`/${plan._id}/start`)).batchNumber, 1);
    assert.equal(counter, 1);
    assert.equal((await request(`/${recipePlan._id}/steps/mash/start`)).batchNumber, 2);
    assert.equal((await request(`/${recipePlan._id}/steps/mash/start`)).batchNumber, 2);
    assert.equal(counter, 2);
    const patchedPlan = await request('', 'POST', {name:'Plan C',recipeSnapshot:snapshot});
    assert.equal((await request(`/${patchedPlan._id}`, 'PATCH', {status:'active'})).batchNumber, 3);
    assert.equal((await request('', 'POST', {name:'Already started',status:'active',recipeSnapshot:snapshot})).batchNumber, 4);
  } finally {
    [Brew.findOne, Brew.create, Brewer.findOne, Recipe.findOne, Counter.findOneAndUpdate, Brew.collection.findOneAndUpdate, Brew.collection.findOne] = original;
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
});
