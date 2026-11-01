<template>
  <section class="mash-timeline" :aria-label="t('brews.mash.rests')">
    <h4 class="flex items-center gap-2 font-semibold"><Thermometer :size="18" aria-hidden="true" />{{ t("brews.mash.rests") }}</h4>
    <ol class="mt-4 space-y-2">
      <li v-for="(rest, index) in rows" :key="rest.restId" class="mash-rest" :class="`mash-rest--${rest.state}`">
        <div class="min-w-0 flex-1">
          <p class="text-sm font-semibold">
            <template v-if="rest.state === 'heating' || rest.state === 'pending'">{{ t("brews.mash.raise_to", { temp: rest.temperatureC }) }}</template>
            <template v-else>{{ t("brews.mash.rest_at", { temp: rest.temperatureC, minutes: rest.minutes }) }}</template>
          </p>
          <p class="text-xs opacity-80">
            <template v-if="rest.state === 'heating'">{{ t("brews.mash.then_hold", { minutes: rest.minutes }) }}</template>
            <template v-else-if="rest.state === 'pending'">{{ t("brews.mash.hold", { minutes: rest.minutes }) }}</template>
            <template v-else-if="rest.state === 'resting'">{{ t("brews.mash.remaining") }}: <strong class="tabular-nums">{{ clock(rest.remaining) }}</strong></template>
            <template v-else>{{ t("brews.mash.done") }}</template>
          </p>
        </div>
        <button v-if="rest.state === 'heating'" type="button" class="mash-rest__button" :disabled="!canAct || saving.includes(rest.restId)" @click="$emit('reached', rest.restId, true)">
          <Check :size="16" aria-hidden="true" />{{ t("brews.mash.reached") }}
        </button>
        <button v-else-if="rest.state === 'resting' || (rest.state === 'done' && index === lastReachedIndex)" type="button" class="mash-rest__undo" :disabled="!canAct || saving.includes(rest.restId)" :aria-label="t('brews.mash.undo')" :title="t('brews.mash.undo')" @click="$emit('reached', rest.restId, false)">
          <Undo2 :size="16" aria-hidden="true" />
        </button>
      </li>
    </ol>
    <p v-if="!started && !readonly" class="mt-3 text-xs text-text2-faded">{{ t("brews.mash.start_first") }}</p>
    <p v-if="error" role="alert" class="mt-3 text-sm text-[var(--color-error-text,var(--color-danger))]">{{ error }}</p>
  </section>
</template>
<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { Check, Thermometer, Undo2 } from "lucide-vue-next";
import { mashRests } from "@/utils/mashRests.js";

const props = defineProps({
  step: Object,
  progress: Object,
  savingIds: { type: Array, default: () => [] },
  disabled: Boolean,
  readonly: Boolean,
  error: String,
});
defineEmits(["reached"]);
const { t } = useI18n();
const now = ref(Date.now());
let timer;
onMounted(() => { timer = setInterval(() => { now.value = Date.now(); }, 1000); });
onBeforeUnmount(() => clearInterval(timer));

const saving = computed(() => props.savingIds);
const started = computed(() => Boolean(props.progress?.startedAt || props.progress?.status === "active"));
const canAct = computed(() => started.value && !props.disabled && !props.readonly && props.progress?.status !== "completed");

const rows = computed(() => {
  const reached = new Map((props.progress?.restReachedAt || []).map((item) => [item.restId, new Date(item.at).getTime()]));
  let currentFound = false;
  return mashRests(props.step).map((rest) => {
    const at = reached.get(rest.restId);
    if (at == null) {
      const state = currentFound ? "pending" : "heating";
      currentFound = true;
      return { ...rest, state };
    }
    const remaining = Math.max(0, Math.ceil((at + rest.minutes * 60000 - now.value) / 1000));
    return { ...rest, state: remaining > 0 ? "resting" : "done", remaining };
  });
});
const lastReachedIndex = computed(() => rows.value.reduce((last, row, index) => (row.state === "resting" || row.state === "done" ? index : last), -1));
function clock(seconds) {
  const m = Math.floor(seconds / 60);
  return `${String(m).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}
</script>
<style scoped>
.mash-timeline { min-width: 0; border-top: 1px solid var(--color-border3); padding-top: 18px; }
.mash-rest { display: flex; align-items: center; gap: 12px; padding: 12px 14px; border-left: 3px solid var(--color-border3); border-radius: 8px; }
.mash-rest--heating { background: var(--color-status-pending); color: var(--color-status-pending-text); border-left-color: var(--color-status-pending-border); }
.mash-rest--resting { border-left-color: var(--color-status-pending-border); }
.mash-rest--done { border-left-color: var(--color-success-border); opacity: 0.7; }
.mash-rest--pending { opacity: 0.65; }
.mash-rest__button { display: inline-flex; align-items: center; gap: 6px; min-height: 40px; padding: 0 14px; border: 1px solid currentColor; border-radius: 8px; font-weight: 600; font-size: 14px; }
.mash-rest__button:disabled, .mash-rest__undo:disabled { opacity: 0.4; cursor: not-allowed; }
.mash-rest__undo { display: inline-flex; align-items: center; justify-content: center; min-width: 40px; min-height: 40px; opacity: 0.7; }
</style>
