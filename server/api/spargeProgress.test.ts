import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import mongoose from 'mongoose';
import { brewsRouter } from './brews.js';
import { Brew } from '../mongo/models/Brew.js';
import { Brewer } from '../mongo/models/Brewer.js';

test('legacy sparge starts, pauses, resumes and completes without creating a countdown', async () => {
  const oldBrew = Brew.findOne, oldBrewer = Brewer.findOne;
  const brewerId = new mongoose.Types.ObjectId();
  const brew = new Brew({ brewerId, name:'Sparge', batchNumber:7, status:'active',
    recipeSnapshot:{steps:[{stepId:'sparge',order:1,stepType:'sparge',title:'Skylling',durationMinutes:20},{stepId:'boil',order:2,stepType:'boil',title:'Koking',durationMinutes:60}]},
    progress:{stepProgress:[{stepId:'sparge',status:'pending',timerDurationSeconds:1200,pausedRemainingSeconds:500}]},
  });
  brew.save = async () => { await brew.validate(); return brew; };
  Brew.findOne = async (filter:any) => String(filter._id)===String(brew._id) && String(filter.brewerId)===String(brewerId) ? brew : null;
  Brewer.findOne = async () => ({_id:brewerId});
  const app=express();app.use(express.json());app.use('/api/brews',brewsRouter);
  const server=app.listen(0,'127.0.0.1');await new Promise<void>(r=>server.on('listening',r));const address:any=server.address();
  const send=async(action:string,body:any={})=>{
    const res=await fetch(`http://127.0.0.1:${address.port}/api/brews/${brew._id}/steps/sparge/${action}`,{method:action==='timer'?'PATCH':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    return {status:res.status,body:await res.json()};
  };
  try {
    let result=await send('start',{durationSeconds:600});assert.equal(result.status,200);
    let entry=result.body.progress.stepProgress[0];assert.equal(entry.status,'active');assert.equal(entry.timerEndsAt,undefined);assert.equal(entry.timerDurationSeconds,undefined);
    const startedAt=entry.startedAt;
    brew.progress.stepProgress[0].activeSinceAt=new Date(Date.now()-10000);
    result=await send('pause');assert.equal(result.status,200);assert.equal(result.body.progress.stepProgress[0].status,'pending');
    assert(brew.progress.stepProgress[0].accumulatedActiveSeconds>=10);
    result=await send('start');assert.equal(result.status,200);entry=result.body.progress.stepProgress[0];assert.equal(entry.startedAt,startedAt);assert.equal(entry.timerEndsAt,undefined);assert.equal(entry.timerDurationSeconds,undefined);
    assert.equal((await send('timer',{remainingSeconds:600})).status,400);
    brew.progress.stepProgress[0].activeSinceAt=new Date(Date.now()-5000);
    result=await send('complete');assert.equal(result.status,200);entry=result.body.progress.stepProgress[0];assert.equal(entry.status,'completed');assert(entry.actualDurationSeconds>=15);assert.equal(entry.timerEndsAt,undefined);assert.equal(result.body.progress.currentStepIndex,1);assert.equal(result.body.status,'active');
    assert.equal(brew.recipeSnapshot.steps[0].durationMinutes,20); // no migration rewrites historical recipes
  } finally { Brew.findOne=oldBrew;Brewer.findOne=oldBrewer;await new Promise<void>(r=>server.close(()=>r())); }
});
