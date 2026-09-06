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
  Chart as ChartJS,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  TimeScale,
  Title,
  Tooltip,
} from "chart.js";
import "chartjs-adapter-date-fns";

ChartJS.register(
  Title,
  Tooltip,
  Legend,
  LineElement,
  PointElement,
  TimeScale,
  LinearScale,
  Filler,
);

const props = defineProps({
  datasets: {
    type: Array,
    default: () => [],
  },
  emptyText: {
    type: String,
    default: "No chart data yet.",
  },
});

// Measurements are taken at irregular intervals, so every series is plotted as
// {x: timestamp, y: value} on a time axis. Entries without a value are dropped
// instead of being coerced to 0, which would turn the line into a zig-zag.
function normalizePoint(entry) {
  if (!entry || typeof entry !== "object") return null;
  const x = Number(entry.x);
  if (!Number.isFinite(x)) return null;
  const rawValue = entry.y;
  if (rawValue === null || rawValue === undefined || rawValue === "") return null;
  const y = Number(rawValue);
  return Number.isFinite(y) ? { x, y } : null;
}

function normalizeDataset(dataset) {
  const values = Array.isArray(dataset?.data) ? dataset.data : [];
  return {
    label: String(dataset?.label || ""),
    data: values
      .map((entry) => normalizePoint(entry))
      .filter((point) => point !== null)
      .sort((a, b) => a.x - b.x),
    borderColor: dataset?.borderColor || "rgb(59, 130, 246)",
    backgroundColor: dataset?.backgroundColor || "rgba(59, 130, 246, 0.15)",
    tension: Number.isFinite(Number(dataset?.tension)) ? Number(dataset.tension) : 0.25,
    fill: Boolean(dataset?.fill),
    pointRadius: Number.isFinite(Number(dataset?.pointRadius)) ? Number(dataset.pointRadius) : 2,
    pointHoverRadius: Number.isFinite(Number(dataset?.pointHoverRadius))
      ? Number(dataset.pointHoverRadius)
      : 3,
    borderDash: Array.isArray(dataset?.borderDash) ? dataset.borderDash : undefined,
    stepped: dataset?.stepped || false,
    spanGaps: true,
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
  normalizedDatasets.value.some((dataset) => dataset.data.length > 0),
);

const chartData = computed(() => ({
  datasets: normalizedDatasets.value,
}));

const visibleAxes = computed(() => {
  const active = new Set(
    normalizedDatasets.value
      .filter((dataset) => dataset.data.length > 0)
      .map((dataset) => dataset.yAxisID),
  );
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
    mode: "nearest",
    axis: "x",
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
      type: "time",
      time: {
        tooltipFormat: "d MMM HH:mm",
        displayFormats: {
          hour: "d MMM HH:mm",
          day: "d MMM",
          week: "d MMM",
          month: "MMM yyyy",
        },
      },
      ticks: {
        color: "#9ca3af",
        maxRotation: 0,
        autoSkip: true,
        autoSkipPadding: 12,
      },
      grid: {
        color: "rgba(148, 163, 184, 0.2)",
      },
    },
    // Gravity lives in a narrow band around 1.000, so the axis must fit the data
    // instead of stretching down to 0 - otherwise every reading collapses into
    // one flat line at the top of the chart.
    yGravity: {
      display: visibleAxes.value.gravity,
      position: "left",
      beginAtZero: false,
      grace: "10%",
      ticks: {
        color: "#9ca3af",
        precision: 3,
        callback: (value) => Number(value).toFixed(3),
      },
      grid: {
        color: "rgba(148, 163, 184, 0.2)",
      },
    },
    yTemperature: {
      display: visibleAxes.value.temperature,
      position: "right",
      beginAtZero: false,
      grace: "10%",
      ticks: {
        color: "#9ca3af",
        callback: (value) => `${Number(value).toFixed(1)} °C`,
      },
      grid: {
        drawOnChartArea: false,
      },
    },
    yPh: {
      display: visibleAxes.value.ph,
      position: "right",
      beginAtZero: false,
      grace: "10%",
      ticks: {
        color: "#9ca3af",
        callback: (value) => Number(value).toFixed(2),
      },
      grid: {
        drawOnChartArea: false,
      },
    },
  },
}));
</script>
