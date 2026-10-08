<template>
  <div class="brew-row cursor-pointer" :data-phase="phase" @click="router.push(brewRoute)">
    <div class="min-w-0"><router-link :to="brewRoute"><h3 class="text-lg break-words">{{ brewTitle(brew) }}</h3></router-link><p class="mt-1 text-sm opacity-70">{{ brew.recipeSnapshot?.beerType || brew.recipeSnapshot?.name || t('brews.common.no_recipe') }}</p><p class="mt-1 text-xs opacity-80 break-words">{{ t('brews.fields.brew_date') }}: {{ brewDate }}<span v-if="brew.brewers?.length"> · {{ t('brews.fields.brewers') }}: {{ brew.brewers.join(', ') }}</span></p></div>
    <div class="min-w-0 space-y-2"><span class="phase-label">{{ phaseLabel(phase, t) }}</span><PhaseTimeline :brew="effectiveBrew" @updated="localBrew=$event" /></div>
    <router-link :to="brewRoute" class="brew-row-action">{{ brew.status === 'planned' ? t('brews.actions.open_plan') : t('brews.actions.open_brew') }} <ArrowRight :size="18" aria-hidden="true" /></router-link>
  </div>
</template>
<script setup>
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { ArrowRight } from 'lucide-vue-next';
import { brewPhase, phaseLabel, brewTitle } from '@/utils/brewPhase.js';
import PhaseTimeline from './PhaseTimeline.vue';
const props = defineProps({ brew: { type: Object, required: true } });
const { t, locale } = useI18n();
const router=useRouter();
const localBrew=ref(null);
watch(()=>props.brew,()=>localBrew.value=null);
const effectiveBrew=computed(()=>localBrew.value || props.brew);
const brewRoute=computed(()=>props.brew.status==='planned'?`/brygg/${props.brew._id}/planlegging`:`/brygg/${props.brew._id}`);
const brewDate=computed(()=>{
  const value=props.brew.timeline?.brewDayAt || props.brew.progress?.brewStartedAt;
  const date=value?new Date(value):null;
  return date && !Number.isNaN(date.getTime()) ? date.toLocaleDateString(locale.value==='no'?'nb-NO':locale.value) : '—';
});
const phase = computed(() => brewPhase(props.brew));
</script>
