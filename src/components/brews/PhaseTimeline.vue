<template>
  <div v-if="progress.total > 0" class="phase-timeline" :data-phase="progress.phase">
    <div class="flex items-center justify-between gap-2 text-xs mb-2">
      <span>{{ phaseLabel(progress.phase, t) }} · {{ duration(progress.elapsed) }} {{ t('brews.phase.of') }} {{ duration(progress.total) }}</span>
      <strong>{{ progress.percent }}% {{ t('brews.phase.complete') }}</strong>
    </div>
    <div class="phase-track" :class="canSeek ? 'phase-track--editable cursor-ew-resize touch-none select-none' : ''" :role="canSeek ? 'slider' : 'progressbar'" :tabindex="canSeek ? 0 : undefined" :aria-label="canSeek ? t('brews.timer.seek') : phaseLabel(progress.phase, t)" :aria-valuenow="progress.percent" aria-valuemin="0" aria-valuemax="100" :title="canSeek ? t('brews.timer.help') : undefined" @pointerdown="down" @pointermove="move" @pointerup="up" @pointercancel="cancel" @keydown="key" @click.stop.prevent>
      <div v-for="(segment, index) in progress.segments" :key="index" class="phase-segment" :style="{ flexGrow: segment.total || 1 }" :title="segment.title">
        <span :style="{ width: `${segment.total ? segment.elapsed / segment.total * 100 : 0}%` }" />
      </div>
    </div>
    <div v-if="details" class="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs opacity-75"><span v-for="(segment, index) in progress.segments" :key="index">{{ segment.title }} · {{ duration(segment.total) }}</span></div>
    <p v-if="seekError" class="mt-2 text-xs text-[var(--color-error-text,var(--color-danger))]" role="alert">{{ seekError }}</p>
  </div>
</template>
<script setup>
import { computed, ref, onMounted, onUnmounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { phaseProgress, phaseLabel } from '@/utils/brewPhase.js';
import { useTimerScrub } from '@/composables/useTimerScrub.js';
import { seekBrewTimer } from '@/services/brews.service.js';
const props = defineProps({ brew: Object, selectedStepId: String, details: Boolean });
const { t, locale } = useI18n();
const emit = defineEmits(['updated']);
const localBrew=ref(null), saving=ref(false), seekError=ref('');
watch(()=>props.brew,()=>{localBrew.value=null;});
const effectiveBrew=computed(()=>localBrew.value || props.brew);
const now = ref(Date.now());
let interval;
onMounted(() => { interval = setInterval(() => { now.value = Date.now(); }, 1000); });
onUnmounted(() => clearInterval(interval));
const savedProgress = computed(() => phaseProgress(effectiveBrew.value, now.value, props.selectedStepId));
const target = computed(()=> props.selectedStepId ? savedProgress.value.segments.find(s=>s.stepId===props.selectedStepId) : savedProgress.value.segments.find(s=>s.status==='active') || savedProgress.value.segments.find(s=>s.status!=='completed'));
const canSeek = computed(()=>Boolean(!saving.value && target.value?.total>0 && target.value.status!=='completed' && !['completed','archived'].includes(effectiveBrew.value?.status)));
const { remaining:previewRemaining, dragging, down, move, up, cancel, key } = useTimerScrub({
  remaining:()=>target.value ? target.value.total-target.value.elapsed : 0, total:()=>savedProgress.value.total, resetTotal:()=>target.value?.total || 0, editable:()=>canSeek.value, commit:saveTimer,
});
const progress=computed(()=>{
  if(!dragging.value || !target.value) return savedProgress.value;
  const segments=savedProgress.value.segments.map(s=>s.stepId===target.value.stepId ? {...s,total:Math.max(s.total,previewRemaining.value),elapsed:Math.max(0,s.total-previewRemaining.value)} : s);
  const total=segments.reduce((sum,s)=>sum+s.total,0), elapsed=segments.reduce((sum,s)=>sum+s.elapsed,0);
  return {...savedProgress.value,segments,total,elapsed,percent:total?Math.floor(elapsed/total*100):0};
});
async function saveTimer(value) {
  if(!target.value || saving.value) return;
  saving.value=true;seekError.value='';
  try { const updated=await seekBrewTimer(effectiveBrew.value._id,target.value.stepId,value);localBrew.value=updated;emit('updated',updated); }
  catch(error) { seekError.value=error?.response?.data?.error || t('brews.errors.step_failed'); }
  finally { saving.value=false; }
}
function duration(seconds) {
  const days = progress.value.total >= 86400;
  const value = seconds / (days ? 86400 : 60);
  return `${new Intl.NumberFormat(locale.value, { maximumFractionDigits: days ? 1 : 0 }).format(value)} ${t(days ? 'brews.phase.days' : 'recipes.detail.minutes')}`;
}
</script>
