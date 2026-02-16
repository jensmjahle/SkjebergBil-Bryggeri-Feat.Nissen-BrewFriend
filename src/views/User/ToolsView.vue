<template>
  <section class="mx-auto w-full max-w-6xl px-4 py-8 space-y-4">
    <BaseCard class="hidden sm:block">
      <h1 class="mb-2">Verktøy</h1>
      <p class="text-sm opacity-80">Verktøyene lagrer siste verdier lokalt automatisk.</p>

      <div class="mt-4 flex flex-wrap gap-2">
        <BaseButton :variant="activeTool === 'alcohol' ? 'button1' : 'button3'" @click="activeTool = 'alcohol'">
          Alkoholutregning
        </BaseButton>
        <BaseButton :variant="activeTool === 'co2' ? 'button1' : 'button3'" @click="activeTool = 'co2'">
          CO2 volumer
        </BaseButton>
        <BaseButton :variant="activeTool === 'hydrometer' ? 'button1' : 'button3'" @click="activeTool = 'hydrometer'">
          Hydrometer-korrigering
        </BaseButton>
      </div>
    </BaseCard>

    <AlcoholCalculatorTool v-if="activeTool === 'alcohol'" />
    <Co2CalculatorTool v-else-if="activeTool === 'co2'" />
    <HydrometerCorrectionTool v-else />
  </section>
</template>

<script setup>
import { ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import BaseCard from "@/components/base/BaseCard.vue";
import BaseButton from "@/components/base/BaseButton.vue";
import AlcoholCalculatorTool from "@/components/tools/AlcoholCalculatorTool.vue";
import Co2CalculatorTool from "@/components/tools/Co2CalculatorTool.vue";
import HydrometerCorrectionTool from "@/components/tools/HydrometerCorrectionTool.vue";

const props = defineProps({
  initialTool: {
    type: String,
    default: "alcohol",
  },
});

const route = useRoute();
const router = useRouter();
const activeTool = ref(props.initialTool || "alcohol");

watch(
  () => props.initialTool,
  (val) => {
    if (val && val !== activeTool.value) {
      activeTool.value = val;
    }
  },
);

watch(activeTool, (tool) => {
  const query = { ...route.query, tool };
  router.replace({ query });
});
</script>
