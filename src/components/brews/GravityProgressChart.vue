<template>
  <div class="h-80">
    <Line v-if="hasData" :data="chartData" :options="chartOptions" />
    <div
      v-else
      class="flex h-full items-center justify-center rounded-xl border border-dashed border-border3 text-sm opacity-70"
    >
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
  labels: {
    type: Array,
    default: () => [],
  },
  datasets: {
    type: Array,
    default: () => [],
  },
  emptyText: {
    type: String,
    default: "No chart data yet.",
  },
});

function normalizeDataset(dataset) {
  const values = Array.isArray(dataset?.data) ? dataset.data : [];
  return {
    label: String(dataset?.label || ""),
    data: values.map((value) => {
      const numberValue = Number(value);
      return Number.isFinite(numberValue) ? numberValue : null;
    }),
    borderColor: dataset?.borderColor || "rgb(59, 130, 246)",
    backgroundColor: dataset?.backgroundColor || "rgba(59, 130, 246, 0.15)",
    tension: Number.isFinite(Number(dataset?.tension)) ? Number(dataset.tension) : 0.25,
    fill: Boolean(dataset?.fill),
    pointRadius: Number.isFinite(Number(dataset?.pointRadius)) ? Number(dataset.pointRadius) : 2,
    pointHoverRadius: Number.isFinite(Number(dataset?.pointHoverRadius))
      ? Number(dataset.pointHoverRadius)
      : 3,
    borderDash: Array.isArray(dataset?.borderDash) ? dataset.borderDash : undefined,
    yAxisID: dataset?.yAxisID || "yGravity",
  };
}

const normalizedDatasets = computed(() =>
  (props.datasets || [])
    .filter((dataset) => dataset && dataset.hidden !== true)
    .map((dataset) => normalizeDataset(dataset))
    .filter((dataset) => dataset.label.length > 0),
);

const hasData = computed(() =>
  normalizedDatasets.value.some((dataset) =>
    dataset.data.some((value) => Number.isFinite(value)),
  ),
);

const chartData = computed(() => ({
  labels: Array.isArray(props.labels) ? props.labels : [],
  datasets: normalizedDatasets.value,
}));

const visibleAxes = computed(() => {
  const active = new Set(normalizedDatasets.value.map((dataset) => dataset.yAxisID));
  return {
    gravity: active.has("yGravity"),
    temperature: active.has("yTemperature"),
    ph: active.has("yPh"),
  };
});

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    mode: "index",
    intersect: false,
  },
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
    yGravity: {
      display: visibleAxes.value.gravity,
      position: "left",
      ticks: {
        color: "#9ca3af",
      },
      grid: {
        color: "rgba(148, 163, 184, 0.2)",
      },
    },
    yTemperature: {
      display: visibleAxes.value.temperature,
      position: "right",
      ticks: {
        color: "#9ca3af",
      },
      grid: {
        drawOnChartArea: false,
      },
    },
    yPh: {
      display: visibleAxes.value.ph,
      position: "right",
      ticks: {
        color: "#9ca3af",
      },
      grid: {
        drawOnChartArea: false,
      },
    },
  },
}));
</script>
