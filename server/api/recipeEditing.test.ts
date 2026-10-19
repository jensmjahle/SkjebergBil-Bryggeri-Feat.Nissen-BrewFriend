import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import mongoose from 'mongoose';
import { recipesRouter } from './recipes.js';
import { Recipe } from '../mongo/models/Recipe.js';
import { Brewer } from '../mongo/models/Brewer.js';

test('recipe edits clear explicitly emptied metadata while omitted metadata stays unchanged', async () => {
  const oldFind = Brewer.findOne, oldUpdate = Recipe.findOneAndUpdate;
  const brewerId = new mongoose.Types.ObjectId(), id = new mongoose.Types.ObjectId();
  const stored: any = { _id: id, brewerId, name: 'Porter', beerType: 'Porter', flavorProfile: 'Chocolate', color: 'Black', imageUrl: '/uploads/beer.png', sourceUrl: 'https://example.com' };
  Brewer.findOne = async () => ({ _id: brewerId });
  Recipe.findOneAndUpdate = (async (filter: any, updates: any) => {
    assert.equal(String(filter.brewerId), String(brewerId));
    Object.assign(stored, updates);
    const doc = new Recipe(stored);
    await doc.validate();
    return doc;
  }) as any;
  const app = express(); app.use(express.json()); app.use('/api/recipes', recipesRouter);
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(r => server.on('listening', r));
  const address: any = server.address();
  const patch = async (payload: any) => {
    const response = await fetch(`http://127.0.0.1:${address.port}/api/recipes/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    assert.equal(response.status, 200);
    return response.json();
  };
  try {
    const first = await patch({ name: 'New name' });
    assert.equal(first.flavorProfile, 'Chocolate'); assert.equal(first.imageUrl, '/uploads/beer.png');
    const cleared = await patch({ beerType: '', flavorProfile: '', color: '', imageUrl: '', sourceUrl: '' });
    for (const field of ['beerType', 'flavorProfile', 'color', 'imageUrl', 'sourceUrl']) assert.equal(cleared[field], '', field);
  } finally {
    Brewer.findOne = oldFind; Recipe.findOneAndUpdate = oldUpdate;
    await new Promise<void>(r => server.close(() => r()));
  }
});

test('new versions preserve omitted targets but allow explicitly clearing inherited targets', async () => {
  const oldFind = Brewer.findOne, oldRecipeFind = Recipe.findOne, oldCreate = Recipe.create, oldUpdate = Recipe.updateMany;
  const brewerId = new mongoose.Types.ObjectId(), id = new mongoose.Types.ObjectId();
  const source = { _id: id, brewerId, name: 'Porter', recipeGroupId: String(id), version: 1, isLatest: true, defaults: { ogFrom: '1.050', ogTo: '1.060', fgFrom: '1.010', fgTo: '1.014', ibu: 30, batchSizeLiters: 25 } };
  Brewer.findOne = async () => ({ _id: brewerId });
  Recipe.findOne = ((filter: any) => filter._id ? Promise.resolve(source) : { sort: async () => source }) as any;
  Recipe.updateMany = (async () => ({})) as any;
  Recipe.create = (async (payload: any) => { const doc = new Recipe(payload); await doc.validate(); return doc; }) as any;
  const app = express(); app.use(express.json()); app.use('/api/recipes', recipesRouter);
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(r => server.on('listening', r));
  const address: any = server.address();
  try {
    const response = await fetch(`http://127.0.0.1:${address.port}/api/recipes/${id}/versions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ defaults: { fgFrom: '', fgTo: '', ibu: null } }) });
    assert.equal(response.status, 201);
    const created = await response.json();
    assert.equal(created.defaults.ogFrom, '1.050');
    assert.equal(created.defaults.batchSizeLiters, 25);
    assert.equal(created.defaults.fgFrom, undefined);
    assert.equal(created.defaults.fgTo, undefined);
    assert.equal(created.defaults.ibu, undefined);
  } finally {
    Brewer.findOne = oldFind; Recipe.findOne = oldRecipeFind; Recipe.create = oldCreate; Recipe.updateMany = oldUpdate;
    await new Promise<void>(r => server.close(() => r()));
  }
});
