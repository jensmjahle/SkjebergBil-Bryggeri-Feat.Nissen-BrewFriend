import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseRecipeFile, validateRecipeDocument, MAX_RECIPE_FILE_BYTES } from './recipeImport.js';
const template=readFileSync(new URL('../../public/templates/guttabrew-oppskrift-mal.md',import.meta.url),'utf8');
const example=JSON.parse(template.match(/```json\n([\s\S]*?)\n```/)[1]);
test('the actual downloadable Markdown template imports without dropping links or units',()=>{
  const result=parseRecipeFile(template);assert.deepEqual(result.errors,[]);assert.equal(result.recipe.steps.length,6);assert.equal(result.recipe.steps[4].durationMinutes,20160);assert.deepEqual(result.recipe.ingredients[3].stepIds,['gjaering']);assert.equal(result.recipe.sourceUrl,'https://example.com/oppskrift');
});
test('UTF-8 BOM, Windows line endings and pure JSON use the same format',()=>{
  assert.equal(parseRecipeFile('\uFEFF'+template.replace(/\n/g,'\r\n')).errors.length,0);
  assert.equal(parseRecipeFile(JSON.stringify(example)).recipe.name,example.recipe.name);
});
test('missing mandatory fields, unknown fields and unsupported versions fail clearly',()=>{
  const doc=structuredClone(example);delete doc.recipe.name;doc.version=2;doc.recipe.steps[0].durationDays=2;
  const paths=validateRecipeDocument(doc).errors.map(e=>e.path);assert.ok(paths.includes('recipe.name'));assert.ok(paths.includes('version'));assert.ok(paths.includes('recipe.steps[0].durationDays'));
});
test('duplicate IDs and broken ingredient step references are rejected',()=>{
  const doc=structuredClone(example);doc.recipe.steps[1].stepId=doc.recipe.steps[0].stepId;doc.recipe.ingredients[1].ingredientId=doc.recipe.ingredients[0].ingredientId;doc.recipe.ingredients[0].stepIds=['missing'];
  const codes=validateRecipeDocument(doc).errors.map(e=>e.code);assert.ok(codes.includes('duplicate'));assert.ok(codes.includes('reference'));
});
test('duplicate JSON keys fail rather than silently overwriting a value',()=>{
  const text=JSON.stringify(example).replace('"version":1','"version":1,"version":1');
  assert.equal(parseRecipeFile(text).errors[0].code,'duplicate_key');
});
test('gravity formats, decimal strings in numeric fields and reversed ranges are rejected',()=>{
  const doc=structuredClone(example);doc.recipe.defaults.ogFrom='1.060';doc.recipe.defaults.ogTo='1.050';doc.recipe.defaults.fgFrom='1,012';doc.recipe.steps[1].durationMinutes='60';
  const codes=validateRecipeDocument(doc).errors.map(e=>e.code);assert.ok(codes.includes('range'));assert.ok(codes.includes('gravity'));assert.ok(codes.includes('number'));
});
test('unknown optional values may be null or omitted; zero is kept',()=>{
  const doc=structuredClone(example);doc.recipe.defaults=null;doc.recipe.steps[0].durationMinutes=0;doc.recipe.ingredients[0].price=null;doc.recipe.ingredients[0].stepIds=null;
  const result=validateRecipeDocument(doc);assert.equal(result.errors.length,0);assert.deepEqual(result.recipe.defaults,{});assert.equal(result.recipe.steps[0].durationMinutes,0);assert.equal(result.recipe.ingredients[0].price,undefined);assert.deepEqual(result.recipe.ingredients[0].stepIds,[]);
});
test('multiple JSON blocks, JSON comments, oversized files and unsafe source links are rejected',()=>{
  assert.equal(parseRecipeFile(template+'\n```json\n{}\n```').errors[0].code,'json_block');
  assert.equal(parseRecipeFile('```json\n{ // comment\n}\n```').errors[0].code,'json');
  assert.equal(parseRecipeFile('x'.repeat(MAX_RECIPE_FILE_BYTES+1)).errors[0].code,'size');
  const doc=structuredClone(example);doc.recipe.sourceUrl='javascript:alert(1)';assert.ok(validateRecipeDocument(doc).errors.some(e=>e.code==='url'));
});
