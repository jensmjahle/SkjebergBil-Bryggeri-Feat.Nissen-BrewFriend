<template>
  <div class="space-y-5">
    <BaseCard class="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
      <div class="overview-result"><p class="text-sm opacity-75">{{ t('brews.overview.final_abv') }}</p><strong class="block mt-2 text-3xl">{{ percent(summary.actualAbv) }}</strong><p class="mt-2 text-sm">{{ t('brews.overview.planned') }} {{ percent(summary.plannedAbv) }}</p><p class="text-sm opacity-80">{{ delta(summary.abvDelta, 2) }} {{ summary.abvDelta !== null ? t('brews.overview.percentage_points') : '' }}</p></div>
      <div v-for="metric in summary.metrics.slice(0,2)" :key="metric.key" class="overview-result"><p class="text-sm opacity-75">{{ metric.key.toUpperCase() }}</p><strong class="block mt-2 text-3xl">{{ number(metric.actual, 3) }}</strong><p class="mt-2 text-sm">{{ t('brews.overview.planned') }} {{ number(metric.planned, 3) }}</p><p class="text-sm opacity-80">{{ t('brews.overview.deviation') }} {{ delta(metric.delta, 3) }}</p></div>
      <div class="overview-result"><p class="text-sm opacity-75">{{ t('brews.overview.total_time') }}</p><strong class="block mt-2 text-2xl">{{ duration(summary.totalSeconds) }}</strong><p class="mt-2 text-sm">{{ date(summary.startedAt) }} – {{ date(summary.completedAt) }}</p><p class="text-sm opacity-80">{{ t('brews.overview.logged_time') }} {{ duration(summary.loggedSeconds) }}</p></div>
    </BaseCard>

    <p v-if="summary.actualAbv === null" class="text-sm opacity-80">{{ t('brews.overview.missing_gravity') }} <button class="underline font-semibold" @click="$emit('measurements')">{{ t('brews.current.measurements_tab') }}</button></p>

    <div class="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div class="space-y-5 min-w-0">
        <BaseCard class="space-y-4">
          <div class="flex items-center justify-between gap-3"><h3>{{ t('brews.overview.deviations') }}</h3><span class="text-xs opacity-70">{{ t('brews.overview.saved_plan') }}</span></div>
          <div class="overflow-x-auto"><table class="w-full text-sm"><thead><tr class="border-b border-border3"><th class="text-left py-2">{{ t('recipes.detail.steps') }}</th><th>{{ t('brews.overview.planned') }}</th><th>{{ t('brews.overview.actual') }}</th><th>{{ t('brews.overview.deviation') }}</th></tr></thead><tbody>
            <tr v-for="step in summary.steps" :key="step.stepId" class="border-b border-border3"><td class="py-3 pr-3"><p class="text-sm font-semibold">{{ step.title }}</p><p v-if="step.temperature !== null && step.plannedTemperature !== null" class="mt-1 text-xs opacity-80">{{ t('brews.overview.mean_temperature') }} {{ number(step.temperature,1) }} °C · {{ delta(step.temperature-step.plannedTemperature,1) }} °C</p><p v-if="step.timerAdjustmentSeconds" class="mt-1 text-xs opacity-80">{{ t('brews.overview.timer_adjustment') }} {{ duration(step.timerAdjustmentSeconds, true) }}</p></td><td class="text-center px-2 whitespace-nowrap">{{ duration(step.planned) }}</td><td class="text-center px-2 whitespace-nowrap">{{ duration(step.actual) }}</td><td class="text-right pl-2 whitespace-nowrap">{{ duration(step.delta, true) }}</td></tr>
          </tbody></table></div>
          <p v-if="!summary.steps.length" class="text-sm opacity-70">{{ t('recipes.create.no_steps') }}</p>
          <p class="text-xs opacity-75">{{ t('brews.overview.coverage', { logged:summary.loggedSteps, total:summary.steps.length }) }}</p>
          <p v-if="summary.startDelta !== null" class="text-sm">{{ t('brews.overview.start_deviation') }}: {{ duration(summary.startDelta, true) }}</p>
          <div v-for="metric in summary.metrics.slice(2).filter(m=>m.actual !== null)" :key="metric.key" class="flex flex-wrap justify-between gap-2 text-sm"><span>{{ metricLabel(metric.key) }}</span><span>{{ number(metric.actual,metric.precision) }} · {{ t('brews.overview.planned') }} {{ number(metric.planned,metric.precision) }} · {{ delta(metric.delta,metric.precision) }}</span></div>
        </BaseCard>
        <BaseCard class="space-y-4">
          <h3>{{ t('brews.overview.final_notes') }}</h3>
          <BaseTextarea v-model="notes" :aria-label="t('brews.overview.final_notes')" :rows="4" maxlength="3000" :placeholder="t('brews.evaluation.note_placeholder')" />
          <div class="flex items-center justify-between gap-3"><p class="text-xs opacity-70">{{ notes.length }}/3000</p><BaseButton :disabled="savingNotes || !notesChanged" @click="saveNotes">{{ savingNotes ? t('common.saving') : t('brews.overview.save_notes') }}</BaseButton></div>
          <p v-if="notesMessage" class="text-sm" role="status">{{ notesMessage }}</p>
        </BaseCard>
      </div>
      <div class="space-y-5 min-w-0">
        <BaseCard v-if="wideScreen" class="space-y-4"><div class="flex items-center justify-between gap-3"><h3>{{ t('brews.current.measurement_graph') }}</h3><button class="text-sm underline" @click="$emit('measurements')">{{ t('brews.current.measurements_tab') }}</button></div><slot name="graph" /></BaseCard>
        <BaseCard class="space-y-4">
          <div class="flex flex-wrap justify-between gap-3"><div><h3>{{ t('brews.overview.ratings') }}</h3><BaseStarRating class="mt-2" :model-value="average" :count="ratings.length" readonly show-value :empty-text="t('brews.evaluation.no_rating')" /></div><BaseButton @click="openRating()">{{ t('brews.overview.add_rating') }}</BaseButton></div>
          <p v-if="!ratings.length" class="text-sm opacity-70">{{ t('brews.evaluation.no_rating') }}</p>
          <div v-for="rating in ratings" :key="rating.ratingId" class="border-t border-border3 pt-4 space-y-2">
            <div class="flex flex-wrap justify-between gap-2"><BaseStarRating :model-value="rating.rating" readonly show-value /><span class="text-xs opacity-75">{{ date(rating.evaluatedAt, true) }}</span></div>
            <p v-if="rating.note" class="whitespace-pre-line break-words text-sm">{{ rating.note }}</p>
            <div class="flex justify-end gap-2"><BaseButton variant="button3" :disabled="savingRating" @click="openRating(rating)">{{ t('brews.actions.edit') }}</BaseButton><BaseButton variant="button4" :disabled="savingRating" @click="removeRating(rating)">{{ t('brews.actions.delete') }}</BaseButton></div>
          </div>
          <p v-if="ratingError" class="text-sm text-[var(--color-error-text,var(--color-danger))]" role="alert">{{ ratingError }}</p>
        </BaseCard>
      </div>
    </div>
    <BaseCard v-if="brew.notes || stepNotes.length" class="space-y-4"><h3>{{ t('brews.overview.brew_notes') }}</h3><p v-if="brew.notes" class="whitespace-pre-line break-words text-sm">{{ brew.notes }}</p><div v-for="step in stepNotes" :key="step.stepId" class="border-t border-border3 pt-3"><h4 class="text-base">{{ step.title }}</h4><p class="mt-1 whitespace-pre-line break-words text-sm opacity-85">{{ step.note }}</p></div></BaseCard>
    <BrewEvaluationModal :open="ratingOpen" :evaluation="editingRating" :loading="savingRating" :error="ratingError" rating-only @close="ratingOpen=false" @submit="saveRating" />
  </div>
</template>
<script setup>
import { computed, ref, watch, onMounted, onBeforeUnmount } from 'vue';
import { useI18n } from 'vue-i18n';
import BaseCard from '@/components/base/BaseCard.vue';
import BaseButton from '@/components/base/BaseButton.vue';
import BaseTextarea from '@/components/base/BaseTextarea.vue';
import BaseStarRating from '@/components/base/BaseStarRating.vue';
import BrewEvaluationModal from '@/components/modals/BrewEvaluationModal.vue';
import { completedSummary } from '@/utils/brewSummary.js';
import { brewRatings, ratingAverage } from '../../../server/domain/brewRatings.js';
import { addBrewRating, editBrewRating, deleteBrewRating, updateBrew } from '@/services/brews.service.js';
const props = defineProps({ brew:{type:Object,required:true} });
const emit = defineEmits(['updated','measurements']);
const { t, locale } = useI18n();
const screenQuery=window.matchMedia('(min-width:1280px)');
const wideScreen=ref(screenQuery.matches);
const screenChanged=event=>wideScreen.value=event.matches;
onMounted(()=>screenQuery.addEventListener('change',screenChanged));
onBeforeUnmount(()=>screenQuery.removeEventListener('change',screenChanged));
const summary = computed(()=>completedSummary(props.brew));
const ratings = computed(()=>brewRatings(props.brew));
const average = computed(()=>ratingAverage(ratings.value));
const stepNotes = computed(()=>summary.value.steps.filter(s=>s.note));
const savedNotes = computed(()=>props.brew.finalNotes ?? props.brew.evaluation?.note ?? '');
const notes = ref(savedNotes.value), savingNotes=ref(false), notesMessage=ref('');
watch(savedNotes, (value,old)=>{ if(notes.value===old) notes.value=value; });
const notesChanged = computed(()=>notes.value!==savedNotes.value);
const ratingOpen=ref(false), editingRating=ref(null), savingRating=ref(false), ratingError=ref('');
function number(value, digits=2) { return value===null ? '—' : new Intl.NumberFormat(locale.value,{minimumFractionDigits:digits,maximumFractionDigits:digits}).format(value); }
function percent(value) { return value===null ? '—' : `${number(value)} %`; }
function delta(value,digits) { return value===null ? '—' : `${value>0?'+':''}${number(value,digits)}`; }
function duration(value,signed=false) {
  if(value===null) return '—';
  const abs=Math.abs(value), unit=abs>=86400?'days':abs>=3600?'hours':'minutes';
  const divisor=unit==='days'?86400:unit==='hours'?3600:60;
  const sign=signed&&value>0?'+':value<0?'−':'';
  if(abs>=3600 && abs<86400) {
    const totalMinutes=Math.round(abs/60),hours=Math.floor(totalMinutes/60),minutes=totalMinutes%60;
    return `${sign}${hours} ${t('brews.overview.hours')}${minutes ? ` ${minutes} ${t('brews.overview.minutes')}` : ''}`;
  }
  return `${sign}${number(abs/divisor,abs>=86400?1:0)} ${t(`brews.overview.${unit}`)}`;
}
function date(value,time=false) { return value ? new Date(value).toLocaleString(locale.value==='no'?'nb-NO':locale.value,{day:'numeric',month:'short',year:'numeric',...(time?{hour:'2-digit',minute:'2-digit'}:{})}) : '—'; }
function metricLabel(key) { return t(`brews.measurements.${{ph:'ph',co2Volumes:'co2_volumes',ibu:'ibu'}[key]}`); }
function openRating(rating=null) { editingRating.value=rating;ratingError.value='';ratingOpen.value=true; }
async function saveRating(payload) {
  if(savingRating.value) return;
  savingRating.value=true;ratingError.value='';
  try { emit('updated', await (editingRating.value ? editBrewRating(props.brew._id,editingRating.value.ratingId,payload) : addBrewRating(props.brew._id,payload)));ratingOpen.value=false; }
  catch(error) { ratingError.value=error?.response?.data?.error || t('brews.errors.save_failed'); }
  finally { savingRating.value=false; }
}
async function removeRating(rating) {
  if(!window.confirm(t('brews.overview.confirm_delete_rating'))) return;
  savingRating.value=true;ratingError.value='';
  try { emit('updated',await deleteBrewRating(props.brew._id,rating.ratingId)); }
  catch(error) { ratingError.value=error?.response?.data?.error || t('brews.errors.save_failed'); }
  finally { savingRating.value=false; }
}
async function saveNotes() {
  savingNotes.value=true;notesMessage.value='';
  const submitted=notes.value;
  try {
    const saved=await updateBrew(props.brew._id,{finalNotes:submitted});
    if(notes.value===submitted)notes.value=saved.finalNotes ?? saved.evaluation?.note ?? '';
    emit('updated',saved);notesMessage.value=t('brews.overview.notes_saved');
  }
  catch(error) { notesMessage.value=error?.response?.data?.error || t('brews.errors.save_failed'); }
  finally { savingNotes.value=false; }
}
</script>
<style scoped>
th { font-weight:600; font-size:.75rem; opacity:.8; }
.overview-result + .overview-result { border-left:1px solid var(--color-border3); padding-left:1.25rem; }
@media(max-width:639px) { .overview-result + .overview-result { border-left:0; border-top:1px solid var(--color-border3); padding:1rem 0 0; } }
</style>
