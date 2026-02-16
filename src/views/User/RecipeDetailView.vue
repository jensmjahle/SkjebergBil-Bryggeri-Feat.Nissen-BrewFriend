<template>
  <section class="mx-auto w-full max-w-5xl px-4 py-8 space-y-6">
    <BaseCard v-if="loading">
      <p>Laster oppskrift...</p>
    </BaseCard>

    <BaseCard v-else-if="error">
      <p class="text-red-600">{{ error }}</p>
    </BaseCard>

    <template v-else-if="recipe">
      <BaseCard>
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1>{{ recipe.name }}</h1>
            <p class="mt-1 opacity-80">{{ recipe.beerType || "Ukjent type" }}</p>
          </div>

          <div class="flex flex-wrap gap-2">
            <router-link :to="`/oppskrifter/${recipe._id}/rediger`">
              <BaseButton variant="button3">Rediger</BaseButton>
            </router-link>
            <router-link :to="{ path: '/oppskrifter/ny', query: { copyFrom: recipe._id } }">
              <BaseButton variant="button2">Kopier Oppskrift</BaseButton>
            </router-link>
          </div>
        </div>

        <router-link :to="{ path: '/brygg/nytt', query: { recipeId: recipe._id } }" class="mt-5 block">
          <BaseButton class="w-full py-3 text-base" variant="button1">Start Brygg</BaseButton>
        </router-link>
      </BaseCard>

      <BaseCard v-if="recipe.flavorProfile">
        <h3>Smaksprofil</h3>
        <p class="mt-2 whitespace-pre-line">{{ recipe.flavorProfile }}</p>
      </BaseCard>

      <BaseCard>
        <h3>Standardverdier</h3>
        <div class="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5 text-sm">
          <div>OG: {{ formatMetric(recipe.defaults?.og) }}</div>
          <div>FG: {{ formatMetric(recipe.defaults?.fg) }}</div>
          <div>SG: {{ formatMetric(recipe.defaults?.sg) }}</div>
          <div>CO2: {{ formatMetric(recipe.defaults?.co2Volumes) }}</div>
          <div>IBU: {{ formatMetric(recipe.defaults?.ibu) }}</div>
        </div>
      </BaseCard>

      <BaseCard>
        <h3>Steg</h3>
        <div class="mt-3 space-y-3">
          <div v-for="step in recipe.steps || []" :key="`${step.order}-${step.title}`" class="rounded-lg border border-border3 p-3">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <h4>{{ step.order }}. {{ step.title }}</h4>
              <span class="rounded-full bg-bg4 px-2 py-1 text-xs">{{ stepTypeLabel(step.stepType) }}</span>
            </div>
            <p v-if="step.description" class="mt-2 text-sm opacity-90">{{ step.description }}</p>
            <div class="mt-2 flex flex-wrap gap-4 text-xs opacity-80">
              <span v-if="step.temperatureC !== null && step.temperatureC !== undefined">Temp: {{ step.temperatureC }} °C</span>
              <span v-if="step.durationMinutes !== null && step.durationMinutes !== undefined">Tid: {{ step.durationMinutes }} min</span>
              <span v-if="step.co2Volumes !== null && step.co2Volumes !== undefined">CO2: {{ step.co2Volumes }}</span>
            </div>
          </div>
        </div>
      </BaseCard>
    </template>
  </section>
</template>

<script setup>
import { onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import BaseCard from "@/components/base/BaseCard.vue";
import BaseButton from "@/components/base/BaseButton.vue";
import { getRecipe } from "@/services/recipes.service.js";
import { STEP_TYPE_OPTIONS } from "@/components/recipe-steps/index.js";

const route = useRoute();
const loading = ref(true);
const error = ref("");
const recipe = ref(null);

function stepTypeLabel(value) {
  return STEP_TYPE_OPTIONS.find((s) => s.value === value)?.label || value || "Eget";
}

function formatMetric(value) {
  return value === null || value === undefined || value === "" ? "-" : value;
}

async function loadRecipe() {
  loading.value = true;
  error.value = "";
  try {
    recipe.value = await getRecipe(route.params.recipeId);
  } catch (err) {
    error.value = err?.response?.data?.error || err?.message || "Kunne ikke hente oppskrift";
  } finally {
    loading.value = false;
  }
}

onMounted(loadRecipe);
</script>
