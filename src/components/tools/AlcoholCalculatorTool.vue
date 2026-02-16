<template>
  <BaseCard class="space-y-4">
    <div>
      <h3>Alkoholutregning</h3>
      <p class="text-sm opacity-80">Regner ABV automatisk fra OG og FG.</p>
    </div>

    <div class="grid gap-3 sm:grid-cols-2">
      <BaseInput
        :model-value="og"
        label="Original Gravity (OG)"
        placeholder="1.056"
        @update:model-value="onOgChange"
      />
      <BaseInput
        :model-value="fg"
        label="Final Gravity (FG)"
        placeholder="1.012"
        @update:model-value="onFgChange"
      />
    </div>

    <div class="rounded-lg border border-border3 p-3">
      <p class="text-sm">ABV: <strong>{{ abvText }}</strong></p>
    </div>
  </BaseCard>
</template>

<script setup>
import { computed } from "vue";
import BaseCard from "@/components/base/BaseCard.vue";
import BaseInput from "@/components/base/BaseInput.vue";
import { useToolsStore } from "@/store/useToolsStore";

const store = useToolsStore();

const og = computed(() => store.alcohol.og);
const fg = computed(() => store.alcohol.fg);

function parseGravity(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  if (n < 0.9 || n > 1.2) return null;
  return n;
}

const abvValue = computed(() => {
  const ogN = parseGravity(og.value);
  const fgN = parseGravity(fg.value);
  if (ogN === null || fgN === null || fgN > ogN) return null;
  return (ogN - fgN) * 131.25;
});

const abvText = computed(() => {
  if (abvValue.value === null) return "-";
  return `${abvValue.value.toFixed(2)}%`;
});

function onOgChange(value) {
  store.setAlcohol({ og: value });
}

function onFgChange(value) {
  store.setAlcohol({ fg: value });
}
</script>
