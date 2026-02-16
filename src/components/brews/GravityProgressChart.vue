<template>
  <div class="h-80">
    <Line v-if="hasData" :data="chartData" :options="chartOptions" />
    <div v-else class="flex h-full items-center justify-center rounded-xl border border-dashed border-border3 text-sm opacity-70">
      {{ emptyText }}
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { Line } from "vue-chartjs";
import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Title,
  Tooltip,
} from "chart.js";

ChartJS.register(
  Title,
  Tooltip,
  Legend,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Filler,
);

const props = defineProps({
  measurements: {
    type: Array,
    default: () => [],
  },
  targetFg: {
    type: Number,
    default: null,
  },
  emptyText: {
    type: String,
    default: "Ingen målinger ennå.",
  },
});

function gravityValue(measurement) {
  const candidates = [
    measurement?.gravity,
    measurement?.fg,
    measurement?.sg,
    measurement?.og,
  ];
  for (const value of candidates) {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

const normalized = computed(() =>
  [...(props.measurements || [])]
    .map((measurement) => ({
      at: measurement?.takenAt ? new Date(measurement.takenAt) : null,
      value: gravityValue(measurement),
    }))
    .filter((point) => point.at && !Number.isNaN(point.at.getTime()) && point.value !== null)
    .sort((a, b) => a.at.getTime() - b.at.getTime()),
);

const hasData = computed(() => normalized.value.length > 0);

const labels = computed(() =>
  normalized.value.map((point) =>
    point.at.toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }),
  ),
);

const values = computed(() => normalized.value.map((point) => point.value));

const fgLineValues = computed(() => {
  const target = Number(props.targetFg);
  if (!Number.isFinite(target)) return [];
  return normalized.value.map(() => target);
});

const chartData = computed(() => {
  const datasets = [
    {
      label: "Gravity",
      data: values.value,
      borderColor: "rgb(16, 185, 129)",
      backgroundColor: "rgba(16, 185, 129, 0.15)",
      tension: 0.25,
      fill: true,
      pointRadius: 3,
      pointHoverRadius: 4,
    },
  ];

  if (fgLineValues.value.length) {
    datasets.push({
      label: "FG Target",
      data: fgLineValues.value,
      borderColor: "rgb(245, 158, 11)",
      borderDash: [6, 6],
      tension: 0,
      fill: false,
      pointRadius: 0,
    });
  }

  return {
    labels: labels.value,
    datasets,
  };
});

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: true,
      labels: {
        color: "#9ca3af",
      },
    },
  },
  scales: {
    x: {
      ticks: {
        color: "#9ca3af",
        maxRotation: 0,
        autoSkip: true,
      },
      grid: {
        color: "rgba(148, 163, 184, 0.2)",
      },
    },
    y: {
      ticks: {
        color: "#9ca3af",
      },
      grid: {
        color: "rgba(148, 163, 184, 0.2)",
      },
    },
  },
}));
</script>
