<template>
  <div class="flex flex-col items-center gap-4">
    <div
      class="relative"
      :style="{ width: `${size}px`, height: `${size}px` }"
      role="timer"
      :aria-label="label"
    >
      <svg
        class="h-full w-full -rotate-90 transform"
        viewBox="0 0 100 100"
        aria-hidden="true"
      >
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="var(--color-border3)"
          stroke-width="8"
        />
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          :stroke="strokeColor"
          stroke-width="8"
          stroke-linecap="round"
          :stroke-dasharray="circumference"
          :stroke-dashoffset="dashOffset"
        />
      </svg>

      <div class="absolute inset-0 flex flex-col items-center justify-center text-center">
        <p class="font-mono text-3xl font-bold" :style="{ color: strokeColor }">{{ formattedRemaining }}</p>
        <p class="text-xs uppercase tracking-wide opacity-70">{{ label }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
  remainingSeconds: {
    type: Number,
    default: 0,
  },
  totalSeconds: {
    type: Number,
    default: 0,
  },
  label: {
    type: String,
    default: "",
  },
  size: {
    type: Number,
    default: 260,
  },
  warningRatio: {
    type: Number,
    default: 0.2,
  },
  showDays: {
    type: Boolean,
    default: false,
  },
});

const normalizedTotal = computed(() =>
  Number.isFinite(props.totalSeconds) && props.totalSeconds > 0 ? props.totalSeconds : 1,
);

const rawRemaining = computed(() =>
  Number.isFinite(props.remainingSeconds) ? Number(props.remainingSeconds) : 0,
);

const normalizedRemaining = computed(() => {
  const value = rawRemaining.value;
  return Math.max(0, Math.min(value, normalizedTotal.value));
});

const circumference = 2 * Math.PI * 45;

const progressRatio = computed(() => normalizedRemaining.value / normalizedTotal.value);

const dashOffset = computed(() => circumference * (1 - progressRatio.value));

const strokeColor = computed(() => {
  if (rawRemaining.value <= 0) return "#dc2626";
  if (progressRatio.value <= props.warningRatio) return "#eab308";
  return "#10b981";
});

const formattedRemaining = computed(() => {
  const sign = rawRemaining.value < 0 ? "-" : "";
  const total = Math.abs(Math.floor(rawRemaining.value));

  if (props.showDays) {
    const days = Math.floor(total / 86400);
    const hours = Math.floor((total % 86400) / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    return `${sign}${days}d ${String(hours).padStart(2, "0")}h ${String(minutes).padStart(2, "0")}m`;
  }

  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  if (hours > 0) {
    return `${sign}${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${sign}${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
});
</script>
