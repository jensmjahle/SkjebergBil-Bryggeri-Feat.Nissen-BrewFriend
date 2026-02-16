<template>
  <section class="mx-auto w-full max-w-6xl px-4 py-8 space-y-6">
    <BaseCard>
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1>Oppskrifter</h1>
          <p class="mt-2 opacity-80">Søk og filtrer oppskrifter på øltype, steg og ingredienser.</p>
        </div>
        <router-link to="/oppskrifter/ny">
          <BaseButton>Ny Oppskrift</BaseButton>
        </router-link>
      </div>
    </BaseCard>

    <BaseCard>
      <form class="grid gap-4 md:grid-cols-2 xl:grid-cols-6" @submit.prevent="loadRecipes">
        <BaseInput v-model="filters.q" label="Søk" placeholder="Navn, smakprofil, ingrediens" />
        <BaseDropdown v-model="filters.beerType" label="Øltype" :options="beerTypeOptions" placeholder="Alle" />
        <BaseDropdown v-model="filters.stepType" label="Stegtype" :options="stepTypeOptions" placeholder="Alle" />
        <BaseDropdown v-model="filters.ingredientCategory" label="Ingrediens" :options="ingredientCategoryOptions" placeholder="Alle" />
        <BaseDropdown v-model="filters.hasDefaults" label="Standardverdier" :options="defaultsOptions" placeholder="Alle" />
        <BaseDropdown v-model="filters.sort" label="Sortering" :options="sortOptions" placeholder="Nyeste først" />

        <div class="xl:col-span-6 flex flex-wrap gap-3">
          <BaseButton type="submit" :disabled="loading">{{ loading ? "Laster..." : "Søk" }}</BaseButton>
          <BaseButton type="button" variant="button3" :disabled="loading" @click="resetFilters">Nullstill</BaseButton>
        </div>
      </form>
    </BaseCard>

    <div v-if="error" class="rounded-xl border border-danger-border bg-danger p-4 text-text1">{{ error }}</div>

    <BaseCard>
      <p class="text-sm opacity-80">{{ recipes.length }} oppskrift(er) funnet</p>
    </BaseCard>

    <div v-if="!loading && !recipes.length" class="rounded-xl border border-dashed border-border3 p-8 text-center opacity-70">
      Ingen oppskrifter matcher filtrene.
    </div>

    <div v-else class="grid gap-4 md:grid-cols-2">
      <router-link v-for="recipe in recipes" :key="recipe._id" :to="`/oppskrifter/${recipe._id}`" class="block">
        <BaseCard class="space-y-3 cursor-pointer transition hover:scale-[1.01]">
          <div class="flex items-start justify-between gap-3">
            <div>
              <h3>{{ recipe.name }}</h3>
              <p class="text-sm opacity-80">{{ recipe.beerType || "Ukjent type" }}</p>
            </div>
            <span class="rounded-full bg-bg4 px-2 py-1 text-xs">{{ recipe.steps?.length || 0 }} steg</span>
          </div>

          <p v-if="recipe.flavorProfile" class="text-sm opacity-90">{{ recipe.flavorProfile }}</p>

          <div class="grid grid-cols-2 gap-2 text-sm">
            <div>OG: {{ recipe.defaults?.ogFrom || '-' }} - {{ recipe.defaults?.ogTo || '-' }}</div>
            <div>FG: {{ recipe.defaults?.fgFrom || '-' }} - {{ recipe.defaults?.fgTo || '-' }}</div>
            <div>CO2: {{ formatMetric(recipe.defaults?.co2Volumes) }}</div>
            <div>IBU: {{ formatMetric(recipe.defaults?.ibu) }}</div>
            <div class="col-span-2">ABV: {{ abvText(recipe) }}</div>
          </div>

          <div class="flex flex-wrap gap-2">
            <span v-for="step in recipe.steps || []" :key="`${recipe._id}-${step.stepId || step.order}`" class="rounded-full border border-border3 px-2 py-1 text-xs">
              {{ stepTypeLabel(step.stepType) }}
            </span>
          </div>
        </BaseCard>
      </router-link>
    </div>
  </section>
</template>

<script setup>
import { onMounted, reactive, ref } from "vue";
import { listRecipes } from "@/services/recipes.service.js";
import BaseCard from "@/components/base/BaseCard.vue";
import BaseInput from "@/components/base/BaseInput.vue";
import BaseDropdown from "@/components/base/BaseDropdown.vue";
import BaseButton from "@/components/base/BaseButton.vue";
import { STEP_TYPE_OPTIONS } from "@/components/recipe-steps/index.js";

const loading = ref(false);
const error = ref("");
const recipes = ref([]);

const filters = reactive({
  q: "",
  beerType: "",
  stepType: "",
  ingredientCategory: "",
  hasDefaults: "",
  sort: "newest",
});

const beerTypeOptions = [
  { label: "IPA", value: "IPA" },
  { label: "Pale Ale", value: "Pale Ale" },
  { label: "Lager", value: "Lager" },
  { label: "Pilsner", value: "Pilsner" },
  { label: "Stout", value: "Stout" },
  { label: "Porter", value: "Porter" },
  { label: "Wheat", value: "Wheat" },
  { label: "Sour", value: "Sour" },
  { label: "Annet", value: "Annet" },
];

const stepTypeOptions = STEP_TYPE_OPTIONS;
const ingredientCategoryOptions = [
  { label: "Fermenterbart", value: "fermentable" },
  { label: "Humle", value: "hops" },
  { label: "Annet", value: "other" },
];
const defaultsOptions = [
  { label: "Har standardverdier", value: "true" },
  { label: "Ingen standardverdier", value: "false" },
];

const sortOptions = [
  { label: "Nyeste først", value: "newest" },
  { label: "Eldste først", value: "oldest" },
  { label: "Navn A-Å", value: "name_asc" },
  { label: "Navn Å-A", value: "name_desc" },
  { label: "Flest steg", value: "steps_desc" },
];

function stepTypeLabel(value) {
  return STEP_TYPE_OPTIONS.find((s) => s.value === value)?.label || value || "Eget";
}

function formatMetric(value) {
  return value === null || value === undefined || value === "" ? "-" : value;
}

function abvText(recipe) {
  const d = recipe?.defaults || {};
  const ogFrom = Number(d.ogFrom);
  const ogTo = Number(d.ogTo);
  const fgFrom = Number(d.fgFrom);
  const fgTo = Number(d.fgTo);
  if (!Number.isFinite(ogFrom) || !Number.isFinite(ogTo) || !Number.isFinite(fgFrom) || !Number.isFinite(fgTo)) {
    return recipe?.abvRange ? `${recipe.abvRange.min}% - ${recipe.abvRange.max}%` : "-";
  }
  const min = Math.max(0, (ogFrom - fgTo) * 131.25);
  const max = Math.max(0, (ogTo - fgFrom) * 131.25);
  return `${min.toFixed(2)}% - ${max.toFixed(2)}%`;
}

async function loadRecipes() {
  loading.value = true;
  error.value = "";

  try {
    const params = {
      q: filters.q || undefined,
      beerType: filters.beerType || undefined,
      stepType: filters.stepType || undefined,
      ingredientCategory: filters.ingredientCategory || undefined,
      hasDefaults: filters.hasDefaults || undefined,
      sort: filters.sort || undefined,
    };
    recipes.value = await listRecipes(params);
  } catch (err) {
    error.value = err?.response?.data?.error || err?.message || "Kunne ikke hente oppskrifter";
  } finally {
    loading.value = false;
  }
}

function resetFilters() {
  filters.q = "";
  filters.beerType = "";
  filters.stepType = "";
  filters.ingredientCategory = "";
  filters.hasDefaults = "";
  filters.sort = "newest";
  loadRecipes();
}

onMounted(loadRecipes);
</script>
