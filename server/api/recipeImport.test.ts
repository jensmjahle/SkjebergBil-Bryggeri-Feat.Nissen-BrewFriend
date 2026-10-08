import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import express from 'express';
import mongoose from 'mongoose';
import { recipesRouter } from './recipes.js';
import { Recipe } from '../mongo/models/Recipe.js';
import { Brewer } from '../mongo/models/Brewer.js';
test('import endpoint validates on server and creates a new recipe without overwriting',async()=>{
  const oldCreate=Recipe.create,oldFind=Brewer.findOne;
  const brewerId=new mongoose.Types.ObjectId();let created=0;
  Brewer.findOne=async()=>({_id:brewerId});
  Recipe.create=async(payload:any)=>{created++;const doc=new Recipe(payload);await doc.validate();return doc;};
  const app=express();app.use(express.json({limit:'1mb'}));app.use('/api/recipes',recipesRouter);
  const server=app.listen(0,'127.0.0.1');await new Promise<void>(r=>server.on('listening',r));const address:any=server.address();
  const send=async(content:string)=>{const response=await fetch(`http://127.0.0.1:${address.port}/api/recipes/import`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({content})});return{status:response.status,body:await response.json()};};
  try{
    const invalid=await send('not an import');assert.equal(invalid.status,400);assert.equal(created,0);
    const content=readFileSync(new URL('../../public/templates/guttabrew-oppskrift-mal.md',import.meta.url),'utf8');
    const first=await send(content),second=await send(content);
    assert.equal(first.status,201);assert.equal(second.status,201);assert.notEqual(first.body._id,second.body._id);assert.notEqual(first.body.recipeGroupId,second.body.recipeGroupId);
    assert.equal(first.body.version,1);assert.equal(first.body.steps.length,6);assert.equal(first.body.ingredients[3].stepIds[0],'gjaering');assert.equal(first.body.sourceUrl,'https://example.com/oppskrift');assert.equal(created,2);
  }finally{Recipe.create=oldCreate;Brewer.findOne=oldFind;await new Promise<void>(r=>server.close(()=>r()));}
});
