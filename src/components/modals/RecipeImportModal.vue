<template>
  <div v-if="open" class="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4" @click.self="close">
    <div class="flex max-h-[92svh] w-full max-w-3xl flex-col rounded-t-2xl border border-border3 bg-bg2 text-text2 shadow-2xl sm:rounded-2xl" role="dialog" aria-modal="true" :aria-label="t('recipes.import.title')">
      <div class="flex items-center justify-between gap-3 border-b border-border3 px-5 py-4"><h3>{{ t('recipes.import.title') }}</h3><BaseButton variant="button3" :disabled="saving" :aria-label="t('common.close')" @click="close"><X :size="18" /></BaseButton></div>
      <div class="overflow-y-auto p-5 space-y-5">
        <p class="text-sm opacity-85">{{ t('recipes.import.intro') }}</p>
        <a href="/templates/guttabrew-oppskrift-mal.md" download="guttabrew-oppskrift-mal.md" class="inline-flex items-center gap-2 rounded-lg border border-border3 px-3 py-2 text-sm font-semibold"><Download :size="18" />{{ t('recipes.import.download') }}</a>
        <div class="rounded-xl border border-dashed border-border3 p-4 space-y-2"><label for="recipe-import-file" class="block text-sm font-semibold">{{ t('recipes.import.choose') }}</label><input id="recipe-import-file" type="file" accept=".md,.markdown,.json,text/markdown,application/json" :disabled="saving || reading" class="max-w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-bg4 file:px-3 file:py-2 file:text-text4" @change="readFile" /><p class="text-xs opacity-75">{{ t('recipes.import.file_help') }}</p></div>
        <p v-if="reading" class="text-sm" role="status">{{ t('common.loading') }}</p>
        <div v-if="errors.length" class="rounded-xl border border-danger-border p-4" role="alert"><h4 class="text-base">{{ t('recipes.import.invalid') }}</h4><ul class="mt-2 space-y-2"><li v-for="(error,index) in errors" :key="index" class="text-sm"><code class="font-semibold">{{ error.path }}</code>: {{ t(`recipes.import.errors.${error.code}`,error) }}<p v-if="error.code==='json' && error.detail" class="mt-1 break-words text-xs opacity-75">{{ error.detail }}</p></li></ul></div>
        <div v-if="preview" class="space-y-4">
          <div class="border-t border-border3 pt-4"><p class="text-xs opacity-70">{{ t('recipes.import.preview') }}</p><h2 class="mt-1 break-words">{{ preview.name }}</h2><p v-if="preview.beerType" class="mt-1 text-sm opacity-80">{{ preview.beerType }}</p><p v-if="preview.flavorProfile" class="mt-2 whitespace-pre-line text-sm">{{ preview.flavorProfile }}</p><a v-if="preview.sourceUrl" :href="preview.sourceUrl" target="_blank" rel="noopener noreferrer" class="mt-2 inline-block text-sm underline">{{ t('recipes.import.source') }}</a></div>
          <RecipeDefaultsSummary :defaults="preview.defaults" />
          <div class="grid gap-5 md:grid-cols-2"><div><h4>{{ t('recipes.detail.steps') }} ({{ preview.steps.length }})</h4><RecipeStepItem v-for="step in preview.steps" :key="step.stepId" :step="step" :ingredients="preview.ingredients" /></div><div><h4>{{ t('recipes.detail.ingredients') }} ({{ preview.ingredients.length }})</h4><RecipeIngredientItem v-for="ingredient in preview.ingredients" :key="ingredient.ingredientId" :ingredient="ingredient" :steps="preview.steps" /></div></div>
          <p class="text-xs opacity-75">{{ t('recipes.import.new_only') }}</p>
        </div>
        <p v-if="saveError" class="text-sm text-[var(--color-error-text,var(--color-danger))]" role="alert">{{ saveError }}</p>
      </div>
      <div class="flex justify-end gap-2 border-t border-border3 p-4"><BaseButton variant="button3" :disabled="saving" @click="close">{{ t('common.cancel') }}</BaseButton><BaseButton :disabled="!preview || saving || reading || errors.length > 0" @click="save">{{ saving ? t('common.saving') : t('recipes.import.save') }}</BaseButton></div>
    </div>
  </div>
</template>
<script setup>
import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { X, Download } from 'lucide-vue-next';
import BaseButton from '@/components/base/BaseButton.vue';
import RecipeDefaultsSummary from '@/components/recipes/RecipeDefaultsSummary.vue';
import RecipeStepItem from '@/components/recipes/RecipeStepItem.vue';
import RecipeIngredientItem from '@/components/recipes/RecipeIngredientItem.vue';
import { parseRecipeFile, MAX_RECIPE_FILE_BYTES } from '../../../server/domain/recipeImport.js';
import { importRecipeFile } from '@/services/recipes.service.js';
const props=defineProps({open:Boolean});const emit=defineEmits(['close','imported']);const {t}=useI18n();
const preview=ref(null),errors=ref([]),saving=ref(false),reading=ref(false),saveError=ref('');let content='',readVersion=0;
function close(){if(!saving.value)emit('close');}
watch(()=>props.open,()=>{preview.value=null;errors.value=[];saveError.value='';reading.value=false;content='';readVersion++;});
async function readFile(event){
  const version=++readVersion;const file=event.target.files?.[0];preview.value=null;errors.value=[];saveError.value='';content='';
  if(!file)return;
  if(file.size>MAX_RECIPE_FILE_BYTES){errors.value=[{path:'file',code:'size'}];return;}
  reading.value=true;
  try{
    const bytes=await file.arrayBuffer();const text=new TextDecoder('utf-8',{fatal:true}).decode(bytes);
    if(version!==readVersion)return;
    const result=parseRecipeFile(text);errors.value=result.errors;preview.value=result.recipe;content=text;
  }catch{if(version===readVersion)errors.value=[{path:'file',code:'encoding'}];}
  finally{if(version===readVersion)reading.value=false;}
}
async function save(){
  if(!preview.value||saving.value||errors.value.length)return;saving.value=true;saveError.value='';
  try{const recipe=await importRecipeFile(content);emit('imported',recipe);emit('close');}
  catch(error){errors.value=error?.response?.data?.errors || [];saveError.value=error?.response?.data?.error || t('recipes.errors.save_failed');}
  finally{saving.value=false;}
}
</script>
