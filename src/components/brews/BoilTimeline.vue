<template>
  <section class="boil-timeline" :aria-label="t('brews.boil.additions')">
    <div class="flex items-center justify-between gap-3">
      <h4 class="flex items-center gap-2 font-semibold">
        <ListChecks :size="18" aria-hidden="true" />{{
          t("brews.boil.additions")
        }}
      </h4>
      <button
        v-if="!readonly"
        type="button"
        class="p-2 opacity-70 hover:opacity-100"
        :disabled="disabled"
        :aria-label="t('brews.boil.edit_schedule')"
        @click="$emit('edit')"
      >
        <Pencil :size="16" aria-hidden="true" />
      </button>
    </div>
    <p class="mt-1 text-xs text-text2-faded">
      {{ t("brews.boil.schedule_help") }}
    </p>
    <p v-if="state.due" role="alert" class="boil-due mt-4">
      {{ t("brews.boil.add_now") }}:
      {{ state.nextGroup.map((item) => item.name).join(" · ") }}
    </p>
    <ol class="mt-5">
      <li
        v-for="item in state.additions"
        :key="item.additionId"
        class="boil-event"
        :class="{
          'boil-event--next': state.nextGroup.some(
            (next) => next.additionId === item.additionId,
          ),
          'boil-event--done': completed(item),
        }"
      >
        <span class="boil-event__time"
          >{{ item.remainingMinutes }} <span>min</span></span
        >
        <label class="boil-event__body">
          <input
            type="checkbox"
            :checked="completed(item)"
            :disabled="
              disabled ||
              readonly ||
              !started ||
              savingIds.includes(item.additionId)
            "
            :aria-label="
              t('brews.boil.confirm', {
                name: item.name,
                minutes: item.remainingMinutes,
              })
            "
            @change="$emit('toggle', item.additionId, $event.target.checked)"
          />
          <span class="min-w-0 flex-1"
            ><span class="block break-words font-semibold">{{ item.name }}</span
            ><span class="text-sm opacity-70">{{
              [item.amount, item.unit].filter(Boolean).join(" ")
            }}</span></span
          >
          <LoaderCircle
            v-if="savingIds.includes(item.additionId)"
            :size="16"
            class="animate-spin shrink-0"
            aria-hidden="true"
          />
          <span v-else class="boil-event__status">{{
            completed(item)
              ? t("brews.boil.added")
              : state.nextGroup.some(
                    (next) => next.additionId === item.additionId,
                  )
                ? t(state.due ? "brews.boil.now" : "brews.boil.next")
                : ""
          }}</span>
        </label>
      </li>
      <li class="boil-event boil-event--finish">
        <span class="boil-event__time">0 min</span
        ><span class="boil-event__body"
          ><Flame :size="18" class="shrink-0" aria-hidden="true" /><span
            ><strong class="block">{{ t("brews.boil.flameout") }}</strong
            ><span class="text-xs opacity-70">{{
              t("brews.boil.boil_finished")
            }}</span></span
          ></span
        >
      </li>
    </ol>
    <p v-if="!state.additions.length" class="mt-3 text-sm text-text2-faded">
      {{ t("brews.boil.empty") }}
    </p>
    <p
      v-if="step.data?.hopSchedule"
      class="mt-4 whitespace-pre-line border-t border-border3 pt-3 text-xs text-text2-faded"
    >
      <strong>{{ t("brews.boil.legacy") }}:</strong> {{ step.data.hopSchedule }}
      <span class="mt-2 block">{{ t('brews.boil.legacy_help') }}</span>
    </p>
    <p
      v-if="error"
      role="alert"
      class="mt-3 text-sm text-[var(--color-error-text,var(--color-danger))]"
    >
      {{ error }}
    </p>
  </section>
</template>
<script setup>
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { Flame, ListChecks, LoaderCircle, Pencil } from "lucide-vue-next";
import { boilScheduleState } from "@/utils/boilSchedule.js";
const props = defineProps({
  step: Object,
  ingredients: Array,
  progress: Object,
  remainingSeconds: Number,
  savingIds: { type: Array, default: () => [] },
  disabled: Boolean,
  readonly: Boolean,
  error: String,
});
defineEmits(["edit", "toggle"]);
const { t } = useI18n();
const state = computed(() =>
  boilScheduleState(
    props.step,
    props.progress,
    props.remainingSeconds,
    props.ingredients,
  ),
);
const started = computed(() =>
  Boolean(props.progress?.startedAt || props.progress?.status === "active"),
);
const completed = (item) =>
  props.progress?.completedAdditionIds?.includes(item.additionId);
</script>
<style scoped>
.boil-timeline {
  min-width: 0;
  border-top: 1px solid var(--color-border3);
  padding-top: 18px;
}
.boil-event {
  display: grid;
  grid-template-columns: 3.5rem minmax(0, 1fr);
  gap: 10px;
  min-height: 76px;
}
.boil-event__time {
  padding-top: 17px;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  opacity: 0.75;
}
.boil-event__body {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 14px 8px 20px 16px;
  border-left: 2px solid var(--color-border3);
  font-size: 14px;
}
.boil-event__body input {
  position: relative;
  flex-shrink: 0;
  width: 18px;
  height: 18px;
  margin-top: 2px;
  accent-color: var(--color-success-border);
}
.boil-event__body:focus-within {
  outline: 2px solid var(--color-text2);
  outline-offset: -2px;
  border-radius: 8px;
}
.boil-event__status {
  font-size: 10px;
  white-space: nowrap;
  padding-top: 3px;
}
.boil-event--next .boil-event__body,
.boil-due {
  background: var(--color-status-pending);
  color: var(--color-status-pending-text);
  border-radius: 10px;
}
.boil-event--next .boil-event__body {
  border-left-color: var(--color-status-pending-border);
}
.boil-event--done .boil-event__body {
  border-left-color: var(--color-success-border);
}
.boil-event--done .boil-event__status {
  color: var(--color-text2-faded);
}
.boil-event--finish .boil-event__body {
  border-left-color: transparent;
}
.boil-due {
  padding: 12px;
  font-size: 14px;
  font-weight: 600;
}
@media (max-width: 380px) {
  .boil-event {
    grid-template-columns: 2.8rem minmax(0, 1fr);
    gap: 6px;
  }
  .boil-event__body {
    gap: 8px;
    padding-left: 10px;
  }
  .boil-event__status {
    display: none;
  }
}
</style>
