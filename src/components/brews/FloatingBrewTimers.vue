<template>
  <Teleport to="body">
    <FloatingBrewTimer
      v-for="(timer, index) in timers.visibleTimers"
      :key="timer.key"
      :timer="timer"
      :index="index"
      :saved-position="timers.positions[timer.key]"
      :trash-element="trashElement"
      @open="openTimer(timer)"
      @dismiss="dismissTimer(timer)"
      @position="timers.rememberPosition(timer.key, $event)"
      @drag="setDrag(timer.key, $event)"
    />
    <Transition name="timer-trash">
      <div v-if="draggingKey" class="timer-trash-backdrop" aria-hidden="true" />
    </Transition>
    <div
      ref="trashElement"
      class="timer-trash-target"
      :class="{
        'timer-trash-target--visible': draggingKey,
        'timer-trash-target--over': overTrash,
      }"
      :aria-hidden="!draggingKey"
    >
      <Trash2 class="h-6 w-6" aria-hidden="true" />
      <span class="timer-trash-label">{{
        t("brews.floating_timer.remove")
      }}</span>
    </div>
    <Transition name="timer-trash">
      <div
        v-if="undoTimer && !draggingKey"
        class="timer-dismiss-notice"
        role="status"
      >
        <span>{{ t("brews.floating_timer.hidden") }}</span>
        <button type="button" class="timer-undo" @click="undoDismissal">
          {{ t("brews.floating_timer.undo") }}
        </button>
        <button
          type="button"
          class="timer-notice-close"
          :aria-label="t('brews.floating_timer.close')"
          @click="clearUndo"
        >
          <X class="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { isNavigationFailure, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { Trash2, X } from "lucide-vue-next";
import FloatingBrewTimer from "./FloatingBrewTimer.vue";
import { useFloatingBrewTimersStore } from "@/store/useFloatingBrewTimersStore.js";
import { getBrew, getCurrentBrew } from "@/services/brews.service.js";

const timers = useFloatingBrewTimersStore();
const router = useRouter();
const { t } = useI18n();
const trashElement = ref(null);
const draggingKey = ref(null);
const overTrash = ref(false);
const lastDismissed = ref(null);
const undoTimer = computed(() =>
  lastDismissed.value && timers.canRestore(lastDismissed.value.key)
    ? lastDismissed.value
    : null,
);
let undoTimeout;
let interval;
let refreshing = false;
let disposed = false;
let ticks = 0;
let opening = false;

function clearUndo() {
  clearTimeout(undoTimeout);
  lastDismissed.value = null;
}
function dismissTimer(timer) {
  timers.dismiss(timer.key);
  clearUndo();
  lastDismissed.value = timer;
  undoTimeout = setTimeout(clearUndo, 8000);
}
function undoDismissal() {
  if (undoTimer.value) timers.restore(undoTimer.value.key);
  clearUndo();
}

function setDrag(key, state) {
  if (state.dragging) {
    draggingKey.value = key;
    overTrash.value = state.overTrash;
  } else if (draggingKey.value === key) {
    draggingKey.value = null;
    overTrash.value = false;
  }
}
async function openTimer(timer) {
  if (opening) return;
  opening = true;
  const request = { brewId: timer.brewId, stepId: timer.stepId };
  timers.focusRequest = request;
  try {
    const result = await router.push({
      name: "brygg-aktiv",
      params: { brewId: timer.brewId },
    });
    if (
      isNavigationFailure(result) &&
      timers.focusRequest?.brewId === request.brewId &&
      timers.focusRequest?.stepId === request.stepId
    )
      timers.focusRequest = null;
  } catch {
    timers.focusRequest = null;
  } finally {
    opening = false;
  }
}
async function refresh() {
  if (refreshing || document.hidden) return;
  refreshing = true;
  try {
    const ids = [...timers.trackedIds];
    const results = await Promise.allSettled([
      getCurrentBrew({ silent: true }),
      ...ids.map((id) => getBrew(id, { silent: true })),
    ]);
    if (disposed) return;
    results.forEach((result, index) => {
      if (result.status === "fulfilled") timers.updateBrew(result.value);
      else if (index > 0 && result.reason?.response?.status === 404)
        timers.removeBrew(ids[index - 1]);
    });
  } finally {
    refreshing = false;
  }
}
function onVisibilityChange() {
  if (!document.hidden) {
    timers.now = Date.now();
    refresh();
  }
}
onMounted(() => {
  refresh();
  interval = setInterval(() => {
    timers.now = Date.now();
    if (++ticks % 15 === 0) refresh();
  }, 1000);
  document.addEventListener("visibilitychange", onVisibilityChange);
});
onBeforeUnmount(() => {
  disposed = true;
  clearUndo();
  clearInterval(interval);
  document.removeEventListener("visibilitychange", onVisibilityChange);
});
</script>

<style scoped>
.timer-trash-backdrop {
  position: fixed;
  inset: auto 0 0;
  z-index: 65;
  height: 150px;
  background: linear-gradient(transparent, #0003);
  pointer-events: none;
}
.timer-trash-target {
  position: fixed;
  z-index: 70;
  bottom: max(28px, env(safe-area-inset-bottom));
  left: 50%;
  margin-left: -32px;
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #ef444455;
  border-radius: 50%;
  background: var(--color-bg1, #fff);
  color: #dc2626;
  box-shadow: 0 4px 24px #0002;
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transition:
    opacity 0.15s,
    background 0.15s,
    box-shadow 0.15s;
}
.timer-trash-target--visible {
  visibility: visible;
  opacity: 1;
}
.timer-trash-target--over {
  background: #fee2e2;
  box-shadow:
    0 0 0 12px #ef44442b,
    0 4px 24px #0002;
}
.timer-trash-label {
  position: absolute;
  bottom: -21px;
  white-space: nowrap;
  color: white;
  font-size: 11px;
  text-shadow: 0 1px 4px #000a;
}
.timer-dismiss-notice {
  position: fixed;
  bottom: max(24px, env(safe-area-inset-bottom));
  left: 50%;
  transform: translateX(-50%);
  z-index: 70;
  display: flex;
  align-items: center;
  gap: 16px;
  max-width: calc(100vw - 24px);
  padding: 8px 12px 8px 16px;
  border: 1px solid var(--color-border3);
  border-radius: 12px;
  background: var(--color-bg1, #fff);
  color: var(--color-text1);
  box-shadow: 0 6px 28px #0002;
  font-size: 14px;
  white-space: nowrap;
}
.timer-undo {
  padding: 8px 2px;
  font-weight: 700;
  color: var(--color-text1);
  text-decoration: underline;
  text-decoration-color: var(--color-button1);
  text-underline-offset: 4px;
}
.timer-notice-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  opacity: 0.65;
}
.timer-undo:focus-visible,
.timer-notice-close:focus-visible {
  outline: 2px solid var(--color-button1);
  outline-offset: 2px;
  border-radius: 3px;
}
.timer-trash-enter-active,
.timer-trash-leave-active {
  transition: opacity 0.15s;
}
.timer-trash-enter-from,
.timer-trash-leave-to {
  opacity: 0;
}
@media (prefers-reduced-motion: reduce) {
  .timer-trash-target,
  .timer-trash-enter-active,
  .timer-trash-leave-active {
    transition: none;
  }
}
</style>
