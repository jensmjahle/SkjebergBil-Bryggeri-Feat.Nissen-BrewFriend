<template>
  <div
    ref="clock"
    class="floating-brew-timer"
    :class="{
      'floating-brew-timer--dragging': dragging,
      'floating-brew-timer--discard': overTrash,
    }"
    :style="{
      width: `${size}px`,
      height: `${size}px`,
      transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
    }"
    role="button"
    tabindex="0"
    :aria-label="
      t('brews.floating_timer.open', {
        step: timer.title,
        brew: timer.brewName,
      })
    "
    :title="t('brews.floating_timer.help', { step: timer.title })"
    :aria-description="t('brews.floating_timer.help', { step: timer.title })"
    aria-keyshortcuts="Enter Space Delete ArrowLeft ArrowRight ArrowUp ArrowDown"
    @pointerdown="pointerDown"
    @pointermove="pointerMove"
    @pointerup="pointerUp"
    @pointercancel="cancelDrag"
    @lostpointercapture="cancelDrag"
    @keydown="keyDown"
    @click="click"
  >
    <CircularCountdown
      :remaining-seconds="timer.remaining"
      :total-seconds="timer.total"
      :show-days="timer.showDays"
      :size="size"
      compact
    />
    <span
      v-if="timer.paused"
      class="floating-brew-timer__paused"
      :title="t('brews.floating_timer.paused')"
    >
      <Pause class="h-3 w-3" aria-hidden="true" /><span class="sr-only">{{
        t("brews.floating_timer.paused")
      }}</span>
    </span>
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { Pause } from "lucide-vue-next";
import CircularCountdown from "./CircularCountdown.vue";
import { clampTimerPosition } from "@/utils/floatingBrewTimers.js";

const props = defineProps({
  timer: { type: Object, required: true },
  index: { type: Number, default: 0 },
  savedPosition: Object,
  trashElement: Object,
});
const emit = defineEmits(["open", "dismiss", "drag", "position"]);
const { t } = useI18n();
const clock = ref(null);
const size = ref(96);
const position = ref({ x: -200, y: -200 });
const dragging = ref(false);
const overTrash = ref(false);
let press = null;
let suppressClick = false;
let initialized = false;
let anchor = null;

function savePosition() {
  anchor = {
    x: position.value.x / Math.max(1, window.innerWidth - size.value),
    y: position.value.y / Math.max(1, window.innerHeight - size.value),
  };
  emit("position", anchor);
}
function resize() {
  if (press) cancelDrag();
  const width = window.innerWidth;
  const height = window.innerHeight;
  size.value = width < 640 ? 88 : 108;
  if (!initialized) {
    const saved = props.savedPosition;
    anchor =
      saved && Number.isFinite(saved.x) && Number.isFinite(saved.y)
        ? { ...saved }
        : {
            x: 1 - 20 / Math.max(1, width - size.value),
            y:
              1 -
              (28 + props.index * (size.value + 16)) /
                Math.max(1, height - size.value),
          };
    initialized = true;
  }
  position.value = clampTimerPosition(
    anchor.x * (width - size.value),
    anchor.y * (height - size.value),
    size.value,
    width,
    height,
  );
}
function pointerDown(event) {
  if (!event.isPrimary || event.button !== 0) return;
  press = {
    id: event.pointerId,
    x: event.clientX,
    y: event.clientY,
    origin: { ...position.value },
  };
  suppressClick = false;
  clock.value.setPointerCapture(event.pointerId);
}
function pointerMove(event) {
  if (!press || press.id !== event.pointerId) return;
  const dx = event.clientX - press.x;
  const dy = event.clientY - press.y;
  if (!dragging.value && Math.hypot(dx, dy) < 5) return;
  dragging.value = true;
  suppressClick = true;
  position.value = clampTimerPosition(
    press.origin.x + dx,
    press.origin.y + dy,
    size.value,
    window.innerWidth,
    window.innerHeight,
  );
  const trash = props.trashElement?.getBoundingClientRect();
  const center = {
    x: position.value.x + size.value / 2,
    y: position.value.y + size.value / 2,
  };
  overTrash.value = Boolean(
    trash &&
      Math.hypot(
        center.x - (trash.left + trash.width / 2),
        center.y - (trash.top + trash.height / 2),
      ) <
        trash.width / 2 + size.value * 0.25,
  );
  emit("drag", { dragging: true, overTrash: overTrash.value });
}
function finishDrag() {
  const id = press?.id;
  press = null;
  dragging.value = false;
  overTrash.value = false;
  emit("drag", { dragging: false, overTrash: false });
  if (id != null && clock.value?.hasPointerCapture(id))
    clock.value.releasePointerCapture(id);
}
function pointerUp(event) {
  if (!press || press.id !== event.pointerId) return;
  pointerMove(event);
  const discard = dragging.value && overTrash.value;
  if (dragging.value && !discard) savePosition();
  finishDrag();
  if (discard) emit("dismiss");
}
function cancelDrag() {
  if (!press) return;
  position.value = press.origin;
  finishDrag();
}
function click() {
  if (suppressClick) {
    suppressClick = false;
    return;
  }
  emit("open");
}
function keyDown(event) {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    if (!event.repeat) emit("open");
  } else if (event.key === "Delete" || event.key === "Backspace") {
    event.preventDefault();
    emit("dismiss");
  } else if (event.key === "Escape") cancelDrag();
  else if (
    ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)
  ) {
    event.preventDefault();
    const delta = event.shiftKey ? 40 : 10;
    const dx =
      event.key === "ArrowLeft"
        ? -delta
        : event.key === "ArrowRight"
          ? delta
          : 0;
    const dy =
      event.key === "ArrowUp" ? -delta : event.key === "ArrowDown" ? delta : 0;
    position.value = clampTimerPosition(
      position.value.x + dx,
      position.value.y + dy,
      size.value,
      window.innerWidth,
      window.innerHeight,
    );
    savePosition();
  }
}
watch(
  () => props.timer.key,
  () => {
    initialized = false;
    resize();
  },
);
onMounted(() => {
  resize();
  window.addEventListener("resize", resize);
  window.addEventListener("blur", cancelDrag);
});
onBeforeUnmount(() => {
  finishDrag();
  window.removeEventListener("resize", resize);
  window.removeEventListener("blur", cancelDrag);
});
</script>

<style scoped>
.floating-brew-timer {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 60;
  border-radius: 50%;
  background: var(--color-bg1, #fff);
  box-shadow:
    0 4px 24px #0002,
    0 1px 4px #0001;
  cursor: grab;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
  transition:
    box-shadow 0.15s,
    opacity 0.15s;
}
.floating-brew-timer:focus-visible {
  outline: 2px solid var(--color-button1);
  outline-offset: 5px;
}
.floating-brew-timer--dragging {
  z-index: 80;
  cursor: grabbing;
  box-shadow: 0 12px 36px #0003;
}
.floating-brew-timer--discard {
  opacity: 0.5;
}
.floating-brew-timer__paused {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translate(-50%, 20%);
  display: flex;
  padding: 4px;
  border-radius: 50%;
  background: var(--color-bg1, #fff);
  color: var(--color-text1);
  box-shadow: 0 1px 5px #0002;
}
@media (prefers-reduced-motion: reduce) {
  .floating-brew-timer {
    transition: none;
  }
}
</style>
