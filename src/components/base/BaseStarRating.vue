<template>
  <div class="flex items-center gap-2">
    <div
      class="flex items-center"
      :class="readonly ? '' : 'cursor-pointer'"
      :role="readonly ? 'img' : 'slider'"
      :aria-label="ariaLabel"
      :aria-valuenow="readonly ? undefined : displayValue"
      :aria-valuemin="readonly ? undefined : 0.25"
      :aria-valuemax="readonly ? undefined : 5"
      :tabindex="readonly ? undefined : 0"
      @keydown="onKeydown"
      @mouseleave="hoverValue = null"
    >
      <span
        v-for="star in 5"
        :key="star"
        class="relative block"
        :style="{ width: `${size}px`, height: `${size}px` }"
        @mousemove="onMove(star, $event)"
        @click="onClick(star, $event)"
      >
        <Star
          class="absolute inset-0 h-full w-full text-border3"
          :stroke-width="1.5"
        />
        <span
          class="absolute left-0 top-0 h-full overflow-hidden"
          :style="{ width: `${fillPercent(star)}%` }"
        >
          <Star
            class="h-full w-full fill-amber-400 text-amber-400"
            :style="{ width: `${size}px`, height: `${size}px` }"
            :stroke-width="1.5"
          />
        </span>
      </span>
    </div>

    <span v-if="showValue" class="text-sm opacity-80">{{ valueText }}</span>
  </div>
</template>

<script setup>
import { computed, ref } from "vue";
import { Star } from "lucide-vue-next";

const props = defineProps({
  // null means "not rated yet"
  modelValue: {
    type: Number,
    default: null,
  },
  readonly: {
    type: Boolean,
    default: false,
  },
  size: {
    type: Number,
    default: 20,
  },
  showValue: {
    type: Boolean,
    default: false,
  },
  count: {
    type: Number,
    default: null,
  },
  emptyText: {
    type: String,
    default: "-",
  },
  ariaLabel: {
    type: String,
    default: "Rating",
  },
});

const emit = defineEmits(["update:modelValue"]);

const hoverValue = ref(null);

const displayValue = computed(() => {
  const active = hoverValue.value ?? props.modelValue;
  const numeric = Number(active);
  if (!Number.isFinite(numeric) || numeric <= 0) return 0;
  return Math.min(5, numeric);
});

const valueText = computed(() => {
  const rating = Number(props.modelValue);
  if (!Number.isFinite(rating) || rating <= 0) return props.emptyText;
  const base = rating.toFixed(2).replace(/\.?0+$/, "");
  return props.count === null ? base : `${base} (${props.count})`;
});

// Each star is filled from 0 to 100%, so a 3.25 rating fills three stars and a
// quarter of the fourth.
function fillPercent(star) {
  const filled = displayValue.value - (star - 1);
  if (filled <= 0) return 0;
  if (filled >= 1) return 100;
  return filled * 100;
}

// A click in the left quarter of a star gives .25, the right edge gives a full
// star - that is what makes quarter-step ratings possible.
function ratingFromEvent(star, event) {
  const rect = event.currentTarget.getBoundingClientRect();
  const ratio = rect.width > 0 ? (event.clientX - rect.left) / rect.width : 1;
  const quarters = Math.ceil(Math.min(1, Math.max(0, ratio)) * 4) || 1;
  return star - 1 + quarters / 4;
}

function onMove(star, event) {
  if (props.readonly) return;
  hoverValue.value = ratingFromEvent(star, event);
}

function onClick(star, event) {
  if (props.readonly) return;
  emit("update:modelValue", ratingFromEvent(star, event));
}

function onKeydown(event) {
  if (props.readonly) return;
  const current = Number(props.modelValue) || 0;

  if (event.key === "ArrowRight" || event.key === "ArrowUp") {
    event.preventDefault();
    emit("update:modelValue", Math.min(5, current + 0.25));
  } else if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
    event.preventDefault();
    emit("update:modelValue", Math.max(0.25, current - 0.25));
  }
}
</script>
