import { PHASES } from './brewPhase.js';
export const MAX_RECIPE_FILE_BYTES = 512 * 1024;
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const present = value => value !== null && value !== undefined && value !== '';
const DATA_FIELDS = {
  preparation:['checklist'], mash:['waterAmountL','waterToGrainRatio'], sparge:['waterAmountL'], boil:['hopSchedule'],
  primary_fermentation:['targetGravity'], secondary_fermentation:[], cold_crash:[], carbonation:['method'], conditioning:[], custom:[],
};
function duplicateJsonKey(json) {
  const stack=[];
  for(let i=0;i<json.length;i++) {
    const char=json[i];
    if(char==='"') {
      const start=i++;
      while(i<json.length){if(json[i]==='\\'){i+=2;continue;}if(json[i]==='"')break;i++;}
      const current=stack[stack.length-1];
      if(current?.object&&current.expectKey){const key=JSON.parse(json.slice(start,i+1));if(current.keys.has(key))return key;current.keys.add(key);current.expectKey=false;}
    } else if(char==='{')stack.push({object:true,expectKey:true,keys:new Set()});
    else if(char==='[')stack.push({object:false});
    else if(char==='}'||char===']')stack.pop();
    else if(char===','&&stack[stack.length-1]?.object)stack[stack.length-1].expectKey=true;
  }
  return null;
}

export function validateRecipeDocument(document) {
  const errors=[];
  const add=(path,code,details={})=>errors.push({path,code,...details});
  function keys(value,allowed,path) {
    if(!object(value)) { add(path,'object'); return false; }
    for(const key of Object.keys(value)) if(!allowed.includes(key))add(`${path}.${key}`,'unknown');
    return true;
  }
  function text(value,path,max,required=false,min=1) {
    if(!present(value)) { if(required)add(path,'required'); return; }
    if(typeof value!=='string') {add(path,'text');return;}
    if(value.trim().length<min || value.trim().length>max)add(path,'length',{min,max});
  }
  function numeric(value,path,min=0,max=1000000) {
    if(!present(value))return;
    if(typeof value!=='number'||!Number.isFinite(value)||value<min||value>max)add(path,'number',{min,max});
  }
  function choice(value,path,allowed,required=false) {
    if(!present(value)){if(required)add(path,'required');return;}
    if(!allowed.includes(value))add(path,'choice',{allowed:allowed.join(', ')});
  }
  function gravity(value,path) { if(present(value) && (typeof value!=='string'||!/^1\.\d{3}$/.test(value)))add(path,'gravity'); }
  if(!keys(document,['format','version','recipe'],'file'))return {errors,recipe:null};
  if(document.format!=='guttabrew-recipe')add('format','format');
  if(document.version!==1)add('version','version');
  const recipe=document.recipe;
  if(!keys(recipe,['name','beerType','flavorProfile','color','sourceUrl','defaults','steps','ingredients'],'recipe'))return {errors,recipe:null};
  text(recipe.name,'recipe.name',160,true,2);
  text(recipe.beerType,'recipe.beerType',120);text(recipe.flavorProfile,'recipe.flavorProfile',1200);text(recipe.color,'recipe.color',120);text(recipe.sourceUrl,'recipe.sourceUrl',2000);
  if(present(recipe.sourceUrl)){try{if(!['http:','https:'].includes(new URL(recipe.sourceUrl).protocol))add('recipe.sourceUrl','url');}catch{add('recipe.sourceUrl','url');}}
  const defaults=recipe.defaults ?? {};
  if(keys(defaults,['ogFrom','ogTo','fgFrom','fgTo','co2Volumes','ibu','batchSizeLiters'],'recipe.defaults')) {
    for(const key of ['ogFrom','ogTo','fgFrom','fgTo'])gravity(defaults[key],`recipe.defaults.${key}`);
    for(const key of ['co2Volumes','ibu','batchSizeLiters'])numeric(defaults[key],`recipe.defaults.${key}`);
    for(const key of ['og','fg'])if(present(defaults[`${key}From`])&&present(defaults[`${key}To`])&&Number(defaults[`${key}From`])>Number(defaults[`${key}To`]))add(`recipe.defaults.${key}From`,'range');
  }
  const steps=Array.isArray(recipe.steps)?recipe.steps:[];
  const ingredients=Array.isArray(recipe.ingredients)?recipe.ingredients:[];
  if(!Array.isArray(recipe.steps)||steps.length<1||steps.length>100)add('recipe.steps','array',{min:1,max:100});
  if(!Array.isArray(recipe.ingredients)||ingredients.length<1||ingredients.length>200)add('recipe.ingredients','array',{min:1,max:200});
  const stepIds=new Set(),ingredientIds=new Set();
  steps.forEach((step,index)=>{
    const path=`recipe.steps[${index}]`;
    if(!keys(step,['stepId','order','stepType','phase','title','description','durationMinutes','temperatureC','co2Volumes','data'],path))return;
    text(step.stepId,`${path}.stepId`,80,true);text(step.title,`${path}.title`,120,true);text(step.description,`${path}.description`,3000);
    if(typeof step.stepId==='string'){if(stepIds.has(step.stepId.trim()))add(`${path}.stepId`,'duplicate');stepIds.add(step.stepId.trim());}
    choice(step.stepType,`${path}.stepType`,PHASES,true);choice(step.phase,`${path}.phase`,PHASES);
    if(present(step.order)&&step.order!==index+1)add(`${path}.order`,'order',{order:index+1});
    numeric(step.durationMinutes,`${path}.durationMinutes`,0,525600);numeric(step.temperatureC,`${path}.temperatureC`,-50,150);numeric(step.co2Volumes,`${path}.co2Volumes`);
    if(step.data!==undefined&&step.data!==null&&keys(step.data,DATA_FIELDS[step.stepType]||[],`${path}.data`))for(const [key,value]of Object.entries(step.data)) {
      if(key==='waterAmountL')numeric(value,`${path}.data.${key}`);
      else if(key==='targetGravity')gravity(value,`${path}.data.${key}`);
      else text(value,`${path}.data.${key}`,3000);
    }
  });
  ingredients.forEach((ingredient,index)=>{
    const path=`recipe.ingredients[${index}]`;
    if(!keys(ingredient,['ingredientId','name','category','amount','unit','price','notes','stepIds'],path))return;
    text(ingredient.ingredientId,`${path}.ingredientId`,80,true);text(ingredient.name,`${path}.name`,160,true);
    text(ingredient.amount,`${path}.amount`,80);text(ingredient.unit,`${path}.unit`,40);text(ingredient.notes,`${path}.notes`,1000);numeric(ingredient.price,`${path}.price`);
    choice(ingredient.category,`${path}.category`,['fermentable','hops','yeast','other'],true);
    if(typeof ingredient.ingredientId==='string'){if(ingredientIds.has(ingredient.ingredientId.trim()))add(`${path}.ingredientId`,'duplicate');ingredientIds.add(ingredient.ingredientId.trim());}
    if(ingredient.stepIds!==undefined&&ingredient.stepIds!==null){
      if(!Array.isArray(ingredient.stepIds)||ingredient.stepIds.length>100)add(`${path}.stepIds`,'array',{min:0,max:100});
      else ingredient.stepIds.forEach((id,i)=>{if(typeof id!=='string'||!stepIds.has(id))add(`${path}.stepIds[${i}]`,'reference');});
    }
  });
  if(errors.length)return {errors,recipe:null};
  const clean=value=>typeof value==='string'?value.trim():value;
  const optional=(value,fields)=>Object.fromEntries(fields.filter(key=>present(value[key])).map(key=>[key,clean(value[key])]));
  return {errors,recipe:{name:recipe.name.trim(),...optional(recipe,['beerType','flavorProfile','color','sourceUrl']),
    defaults:optional(defaults,['ogFrom','ogTo','fgFrom','fgTo','co2Volumes','ibu','batchSizeLiters']),
    steps:steps.map((step,index)=>({...optional(step,['stepId','stepType','phase','title','description','durationMinutes','temperatureC','co2Volumes']),order:index+1,data:optional(step.data||{},DATA_FIELDS[step.stepType]||[])})),
    ingredients:ingredients.map(ingredient=>({...optional(ingredient,['ingredientId','name','category','amount','unit','price','notes']),stepIds:[...new Set(ingredient.stepIds||[])]})),
  }};
}

export function parseRecipeFile(content) {
  if(typeof content!=='string'||new TextEncoder().encode(content).length>MAX_RECIPE_FILE_BYTES)return {recipe:null,errors:[{path:'file',code:'size'}]};
  const text=content.replace(/^\uFEFF/,'').trim();
  let json=text;
  if(!text.startsWith('{')) {
    const blocks=[...text.matchAll(/^ {0,3}```json[ \t]*\r?\n([\s\S]*?)^ {0,3}```[ \t]*\r?$/gim)];
    if(blocks.length!==1)return {recipe:null,errors:[{path:'file',code:'json_block'}]};
    json=blocks[0][1];
  }
  try {
    const document=JSON.parse(json);
    const duplicate=duplicateJsonKey(json);
    if(duplicate!==null)return {recipe:null,errors:[{path:'file',code:'duplicate_key',detail:duplicate}]};
    return validateRecipeDocument(document);
  }
  catch(error){return {recipe:null,errors:[{path:'file',code:'json',detail:error.message}]};}
}
