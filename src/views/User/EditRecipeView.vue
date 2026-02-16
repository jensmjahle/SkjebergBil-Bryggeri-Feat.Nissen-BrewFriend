<template>
  <section class="mx-auto w-full max-w-5xl px-4 py-8">
    <BaseCard>
      <div class="mb-6">
        <h1>Rediger Oppskrift</h1>
        <p class="mt-2 opacity-80">Oppdater oppskriften og lagre endringer.</p>
      </div>

      <div v-if="loading" class="py-4">Laster...</div>
      <p v-else-if="loadError" class="text-sm text-red-600">{{ loadError }}</p>

      <form v-else class="space-y-6" @submit.prevent="handleSubmit">
        <div class="grid gap-4 md:grid-cols-2">
          <BaseInput v-model="form.name" label="Navn" required />
          <BaseDropdown v-model="form.beerType" label="Øltype" :options="beerTypeOptions" placeholder="Velg øltype" />
          <BaseInput v-model="form.color" label="Farge" />
          <BaseInput v-model="form.imageUrl" label="Bilde URL" />
        </div>

        <div>
          <label class="mb-1 block text-sm font-medium text-[var(--color-text1)]">Smaksprofil</label>
          <textarea v-model="form.flavorProfile" rows="3" class="w-full rounded-lg border border-border4 bg-bg4 px-3 py-2 text-text4 focus:outline-none focus:ring-2 focus:ring-button1" />
        </div>

        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <BaseInput v-model.number="form.defaults.og" :model-modifiers="{ number: true }" type="number" step="0.001" label="OG" />
          <BaseInput v-model.number="form.defaults.fg" :model-modifiers="{ number: true }" type="number" step="0.001" label="FG" />
          <BaseInput v-model.number="form.defaults.sg" :model-modifiers="{ number: true }" type="number" step="0.001" label="SG" />
          <BaseInput v-model.number="form.defaults.co2Volumes" :model-modifiers="{ number: true }" type="number" step="0.1" label="CO2" />
          <BaseInput v-model.number="form.defaults.ibu" :model-modifiers="{ number: true }" type="number" step="1" label="IBU" />
        </div>

        <div class="space-y-3">
          <div class="flex flex-wrap items-end gap-3">
            <div class="w-full sm:max-w-xs">
              <BaseDropdown v-model="selectedStepType" label="Legg til stegtype" :options="stepTypeOptions" placeholder="Velg steg" />
            </div>
            <BaseButton type="button" variant="button2" @click="addStepByType">Legg til steg</BaseButton>
          </div>

          <div v-for="(step, idx) in form.steps" :key="idx" class="space-y-2">
            <component :is="resolveStepComponent(step.stepType)" :model-value="step" :step-number="idx + 1" @update:model-value="updateStep(idx, $event)" />
            <div class="flex flex-wrap justify-end gap-2">
              <BaseButton type="button" variant="button3" :disabled="idx === 0" @click="moveStep(idx, -1)">Opp</BaseButton>
              <BaseButton type="button" variant="button3" :disabled="idx === form.steps.length - 1" @click="moveStep(idx, 1)">Ned</BaseButton>
              <BaseButton type="button" variant="button4" @click="removeStep(idx)">Fjern</BaseButton>
            </div>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-3">
          <BaseButton type="submit" :disabled="isSubmitting">{{ isSubmitting ? "Lagrer..." : "Lagre Endringer" }}</BaseButton>
          <router-link :to="`/oppskrifter/${route.params.recipeId}`">
            <BaseButton type="button" variant="button3">Avbryt</BaseButton>
          </router-link>
          <p v-if="successMessage" class="text-sm text-green-600">{{ successMessage }}</p>
          <p v-if="errorMessage" class="text-sm text-red-600">{{ errorMessage }}</p>
        </div>
      </form>
    </BaseCard>
  </section>
</template>

<script setup>
import { onMounted, reactive, ref } from "vue";
import { useRoute } from "vue-router";
import BaseCard from "@/components/base/BaseCard.vue";
import BaseButton from "@/components/base/BaseButton.vue";
import BaseInput from "@/components/base/BaseInput.vue";
import BaseDropdown from "@/components/base/BaseDropdown.vue";
import { getRecipe, updateRecipe } from "@/services/recipes.service.js";
import { STEP_COMPONENTS, STEP_TYPE_OPTIONS, createDefaultStep } from "@/components/recipe-steps/index.js";

const route = useRoute();
const loading = ref(true);
const loadError = ref("");

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
const selectedStepType = ref("mash");
const isSubmitting = ref(false);
const successMessage = ref("");
const errorMessage = ref("");

const form = reactive({
  name: "",
  beerType: "",
  flavorProfile: "",
  color: "",
  imageUrl: "",
  defaults: { og: null, fg: null, sg: null, co2Volumes: null, ibu: null },
  steps: [],
});

function normalizeNumber(value) {
  return typeof value === "number" && !Number.isNaN(value) ? value : null;
}

function hydrateForm(recipe) {
  form.name = recipe?.name || "";
  form.beerType = recipe?.beerType || "";
  form.flavorProfile = recipe?.flavorProfile || "";
  form.color = recipe?.color || "";
  form.imageUrl = recipe?.imageUrl || "";
  form.defaults = {
    og: recipe?.defaults?.og ?? null,
    fg: recipe?.defaults?.fg ?? null,
    sg: recipe?.defaults?.sg ?? null,
    co2Volumes: recipe?.defaults?.co2Volumes ?? null,
    ibu: recipe?.defaults?.ibu ?? null,
  };
  form.steps = Array.isArray(recipe?.steps)
    ? recipe.steps.map((s) => ({
        stepType: s.stepType || "custom",
        title: s.title || "",
        description: s.description || "",
        durationMinutes: s.durationMinutes ?? null,
        temperatureC: s.temperatureC ?? null,
        co2Volumes: s.co2Volumes ?? null,
        data: s.data || {},
      }))
    : [];
}

function resolveStepComponent(stepType) {
  return STEP_COMPONENTS[stepType] || STEP_COMPONENTS.custom;
}
function addStepByType() { form.steps.push(createDefaultStep(selectedStepType.value || "custom")); }
function updateStep(index, value) { form.steps.splice(index, 1, value); }
function removeStep(index) { form.steps.splice(index, 1); }
function moveStep(index, direction) {
  const target = index + direction;
  if (target < 0 || target >= form.steps.length) return;
  const tmp = form.steps[index];
  form.steps[index] = form.steps[target];
  form.steps[target] = tmp;
}

async function loadRecipe() {
  loading.value = true;
  loadError.value = "";
  try {
    const recipe = await getRecipe(route.params.recipeId);
    hydrateForm(recipe);
  } catch (err) {
    loadError.value = err?.response?.data?.error || err?.message || "Kunne ikke laste oppskrift";
  } finally {
    loading.value = false;
  }
}

async function handleSubmit() {
  isSubmitting.value = true;
  successMessage.value = "";
  errorMessage.value = "";
  try {
    await updateRecipe(route.params.recipeId, {
      name: form.name.trim(),
      beerType: form.beerType || undefined,
      flavorProfile: form.flavorProfile?.trim() || undefined,
      color: form.color?.trim() || undefined,
      imageUrl: form.imageUrl?.trim() || undefined,
      defaults: {
        og: normalizeNumber(form.defaults.og),
        fg: normalizeNumber(form.defaults.fg),
        sg: normalizeNumber(form.defaults.sg),
        co2Volumes: normalizeNumber(form.defaults.co2Volumes),
        ibu: normalizeNumber(form.defaults.ibu),
      },
      steps: form.steps
        .map((s, idx) => ({
          order: idx + 1,
          stepType: s.stepType || "custom",
          title: s.title?.trim(),
          description: s.description?.trim() || undefined,
          durationMinutes: normalizeNumber(s.durationMinutes),
          temperatureC: normalizeNumber(s.temperatureC),
          co2Volumes: normalizeNumber(s.co2Volumes),
          data: s.data || {},
        }))
        .filter((s) => s.title),
    });
    successMessage.value = "Oppskrift oppdatert.";
  } catch (err) {
    errorMessage.value = err?.response?.data?.error || err?.message || "Kunne ikke oppdatere oppskrift";
  } finally {
    isSubmitting.value = false;
  }
}

onMounted(loadRecipe);
</script>
