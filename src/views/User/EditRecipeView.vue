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

        <div class="space-y-3 rounded-lg border border-border3 p-4">
          <h3>Bilde</h3>
          <input type="file" accept="image/*" @change="handleImageUpload" class="block w-full text-sm" />
          <p v-if="imageUploadMessage" class="text-sm opacity-80">{{ imageUploadMessage }}</p>
          <img v-if="resolvedImageSrc" :src="resolvedImageSrc" alt="Recipe image" class="max-h-56 rounded-lg border border-border3 object-cover" />
        </div>

        <div>
          <label class="mb-1 block text-sm font-medium text-[var(--color-text1)]">Smaksprofil</label>
          <textarea v-model="form.flavorProfile" rows="3" class="w-full rounded-lg border border-border4 bg-bg4 px-3 py-2 text-text4 focus:outline-none focus:ring-2 focus:ring-button1" />
        </div>

        <div class="space-y-2">
          <h3>Standardverdier</h3>
          <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <BaseInput v-model="form.defaults.ogFrom" label="OG fra" placeholder="1.056" />
            <BaseInput v-model="form.defaults.ogTo" label="OG til" placeholder="1.062" />
            <BaseInput v-model="form.defaults.fgFrom" label="FG fra" placeholder="1.010" />
            <BaseInput v-model="form.defaults.fgTo" label="FG til" placeholder="1.014" />
            <BaseInput v-model.number="form.defaults.co2Volumes" :model-modifiers="{ number: true }" type="number" step="0.1" label="CO2" />
            <BaseInput v-model.number="form.defaults.ibu" :model-modifiers="{ number: true }" type="number" step="1" label="IBU" />
          </div>
          <p class="text-sm opacity-80">Estimert alkohol: {{ abvText }}</p>
        </div>

        <div class="flex gap-2">
          <BaseButton type="button" :variant="activeTab === 'steps' ? 'button1' : 'button3'" @click="activeTab = 'steps'">Steg</BaseButton>
          <BaseButton type="button" :variant="activeTab === 'ingredients' ? 'button1' : 'button3'" @click="activeTab = 'ingredients'">Ingredienser</BaseButton>
        </div>

        <div v-if="activeTab === 'steps'" class="space-y-3">
          <div class="flex flex-wrap items-end gap-3">
            <div class="w-full sm:max-w-xs">
              <BaseDropdown v-model="selectedStepType" label="Legg til stegtype" :options="stepTypeOptions" placeholder="Velg steg" />
            </div>
            <BaseButton type="button" variant="button2" @click="addStepByType">Legg til steg</BaseButton>
          </div>

          <div v-for="(step, idx) in form.steps" :key="step.stepId || idx" class="space-y-2">
            <component :is="resolveStepComponent(step.stepType)" :model-value="step" :step-number="idx + 1" @update:model-value="updateStep(idx, $event)" />
            <div class="flex flex-wrap justify-end gap-2">
              <BaseButton type="button" variant="button3" :disabled="idx === 0" @click="moveStep(idx, -1)">Opp</BaseButton>
              <BaseButton type="button" variant="button3" :disabled="idx === form.steps.length - 1" @click="moveStep(idx, 1)">Ned</BaseButton>
              <BaseButton type="button" variant="button4" @click="removeStep(idx)">Fjern</BaseButton>
            </div>
          </div>
        </div>

        <div v-else class="space-y-3">
          <div class="flex flex-wrap items-end gap-3">
            <div class="w-full sm:max-w-xs">
              <BaseDropdown v-model="selectedIngredientCategory" label="Kategori" :options="ingredientCategoryOptions" placeholder="Velg kategori" />
            </div>
            <BaseButton type="button" variant="button2" @click="addIngredient">Legg til ingrediens</BaseButton>
          </div>

          <BaseCard v-for="(ingredient, idx) in form.ingredients" :key="ingredient.ingredientId" class="space-y-3">
            <div class="grid gap-3 md:grid-cols-2">
              <BaseInput v-model="ingredient.name" label="Navn" />
              <BaseDropdown v-model="ingredient.category" label="Kategori" :options="ingredientCategoryOptions" placeholder="Velg kategori" />
              <BaseInput v-model="ingredient.amount" label="Mengde" />
              <BaseInput v-model="ingredient.unit" label="Enhet" />
            </div>
            <BaseInput v-model="ingredient.notes" label="Notater" />

            <div>
              <p class="mb-2 text-sm font-medium">Knytt til steg</p>
              <div v-if="!form.steps.length" class="text-sm opacity-70">Legg til steg først.</div>
              <div v-else class="grid gap-2 sm:grid-cols-2">
                <label v-for="step in form.steps" :key="`${ingredient.ingredientId}-${step.stepId}`" class="flex items-center gap-2 text-sm">
                  <input type="checkbox" :checked="ingredient.stepIds.includes(step.stepId)" @change="toggleIngredientStep(ingredient, step.stepId)" />
                  <span>{{ step.title || stepTypeLabel(step.stepType) }}</span>
                </label>
              </div>
            </div>

            <div class="flex justify-end">
              <BaseButton type="button" variant="button4" @click="removeIngredient(idx)">Fjern ingrediens</BaseButton>
            </div>
          </BaseCard>
        </div>

        <div class="flex flex-wrap items-center gap-3">
          <BaseButton type="submit" :disabled="isSubmitting || !isGravityValid">{{ isSubmitting ? "Lagrer..." : "Lagre Endringer" }}</BaseButton>
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
import { computed, onMounted, reactive, ref } from "vue";
import { useRoute } from "vue-router";
import BaseCard from "@/components/base/BaseCard.vue";
import BaseButton from "@/components/base/BaseButton.vue";
import BaseInput from "@/components/base/BaseInput.vue";
import BaseDropdown from "@/components/base/BaseDropdown.vue";
import { getRecipe, updateRecipe, uploadRecipeImage } from "@/services/recipes.service.js";
import { STEP_COMPONENTS, STEP_TYPE_OPTIONS, createDefaultStep } from "@/components/recipe-steps/index.js";

const route = useRoute();
const gravityPattern = /^1\.\d{3}$/;

const loading = ref(true);
const loadError = ref("");
const isSubmitting = ref(false);
const successMessage = ref("");
const errorMessage = ref("");
const imageUploadMessage = ref("");
const activeTab = ref("steps");
const selectedStepType = ref("mash");
const selectedIngredientCategory = ref("fermentable");

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

const ingredientCategoryOptions = [
  { label: "Fermenterbart", value: "fermentable" },
  { label: "Humle", value: "hops" },
  { label: "Annet", value: "other" },
];

const stepTypeOptions = STEP_TYPE_OPTIONS;

function newIngredientId() {
  if (globalThis.crypto?.randomUUID) return `ingredient-${globalThis.crypto.randomUUID()}`;
  return `ingredient-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const form = reactive({
  name: "",
  beerType: "",
  flavorProfile: "",
  color: "",
  imageUrl: "",
  defaults: { ogFrom: "", ogTo: "", fgFrom: "", fgTo: "", co2Volumes: null, ibu: null },
  steps: [],
  ingredients: [],
});

const resolvedImageSrc = computed(() => {
  if (!form.imageUrl) return "";
  if (form.imageUrl.startsWith("http://") || form.imageUrl.startsWith("https://")) return form.imageUrl;
  if (form.imageUrl.startsWith("/")) {
    const base = window.env?.VITE_API_URL || "http://localhost:3000";
    return `${base}${form.imageUrl}`;
  }
  return form.imageUrl;
});

function parseGravity(value) {
  if (!value || !gravityPattern.test(value)) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

const abvText = computed(() => {
  const ogFrom = parseGravity(form.defaults.ogFrom);
  const ogTo = parseGravity(form.defaults.ogTo);
  const fgFrom = parseGravity(form.defaults.fgFrom);
  const fgTo = parseGravity(form.defaults.fgTo);

  if (ogFrom === null || ogTo === null || fgFrom === null || fgTo === null) {
    return "Legg inn OG/FG range for beregning";
  }

  const min = Math.max(0, (ogFrom - fgTo) * 131.25);
  const max = Math.max(0, (ogTo - fgFrom) * 131.25);
  return `${min.toFixed(2)}% - ${max.toFixed(2)}% ABV`;
});

const isGravityValid = computed(() => {
  const fields = [form.defaults.ogFrom, form.defaults.ogTo, form.defaults.fgFrom, form.defaults.fgTo];
  const allEmpty = fields.every((v) => !v);
  if (allEmpty) return true;
  return fields.every((v) => gravityPattern.test(v || ""));
});

function stepTypeLabel(value) {
  return STEP_TYPE_OPTIONS.find((s) => s.value === value)?.label || value || "Eget";
}
function resolveStepComponent(stepType) { return STEP_COMPONENTS[stepType] || STEP_COMPONENTS.custom; }
function addStepByType() { form.steps.push(createDefaultStep(selectedStepType.value || "custom")); }
function updateStep(index, value) { form.steps.splice(index, 1, value); }
function removeStep(index) {
  const removed = form.steps[index];
  form.steps.splice(index, 1);
  if (removed?.stepId) {
    form.ingredients.forEach((ing) => {
      ing.stepIds = ing.stepIds.filter((id) => id !== removed.stepId);
    });
  }
}
function moveStep(index, direction) {
  const target = index + direction;
  if (target < 0 || target >= form.steps.length) return;
  const tmp = form.steps[index];
  form.steps[index] = form.steps[target];
  form.steps[target] = tmp;
}

function addIngredient() {
  form.ingredients.push({ ingredientId: newIngredientId(), name: "", category: selectedIngredientCategory.value || "other", amount: "", unit: "", notes: "", stepIds: [] });
}
function removeIngredient(index) { form.ingredients.splice(index, 1); }
function toggleIngredientStep(ingredient, stepId) {
  const set = new Set(ingredient.stepIds || []);
  if (set.has(stepId)) set.delete(stepId); else set.add(stepId);
  ingredient.stepIds = Array.from(set);
}

function sanitizeNumber(value) {
  return typeof value === "number" && !Number.isNaN(value) ? value : null;
}

function hydrateForm(recipe) {
  form.name = recipe?.name || "";
  form.beerType = recipe?.beerType || "";
  form.flavorProfile = recipe?.flavorProfile || "";
  form.color = recipe?.color || "";
  form.imageUrl = recipe?.imageUrl || "";
  form.defaults = {
    ogFrom: recipe?.defaults?.ogFrom || "",
    ogTo: recipe?.defaults?.ogTo || "",
    fgFrom: recipe?.defaults?.fgFrom || "",
    fgTo: recipe?.defaults?.fgTo || "",
    co2Volumes: recipe?.defaults?.co2Volumes ?? null,
    ibu: recipe?.defaults?.ibu ?? null,
  };
  form.steps = Array.isArray(recipe?.steps)
    ? recipe.steps.map((s) => ({
        stepId: s.stepId || createDefaultStep(s.stepType || "custom").stepId,
        stepType: s.stepType || "custom",
        title: s.title || "",
        description: s.description || "",
        durationMinutes: s.durationMinutes ?? null,
        temperatureC: s.temperatureC ?? null,
        co2Volumes: s.co2Volumes ?? null,
        data: s.data || {},
      }))
    : [];
  form.ingredients = Array.isArray(recipe?.ingredients)
    ? recipe.ingredients.map((ing) => ({
        ingredientId: ing.ingredientId || newIngredientId(),
        name: ing.name || "",
        category: ing.category || "other",
        amount: ing.amount || "",
        unit: ing.unit || "",
        notes: ing.notes || "",
        stepIds: Array.isArray(ing.stepIds) ? ing.stepIds : [],
      }))
    : [];
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

async function handleImageUpload(event) {
  const file = event?.target?.files?.[0];
  if (!file) return;
  imageUploadMessage.value = "Laster opp bilde...";
  try {
    const data = await uploadRecipeImage(file);
    form.imageUrl = data.url;
    imageUploadMessage.value = "Bilde lastet opp.";
  } catch (err) {
    imageUploadMessage.value = err?.response?.data?.error || err?.message || "Kunne ikke laste opp bilde.";
  }
}

async function handleSubmit() {
  if (!isGravityValid.value) {
    errorMessage.value = "OG/FG må være i format 1.056";
    return;
  }

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
        ogFrom: form.defaults.ogFrom?.trim() || undefined,
        ogTo: form.defaults.ogTo?.trim() || undefined,
        fgFrom: form.defaults.fgFrom?.trim() || undefined,
        fgTo: form.defaults.fgTo?.trim() || undefined,
        co2Volumes: sanitizeNumber(form.defaults.co2Volumes),
        ibu: sanitizeNumber(form.defaults.ibu),
      },
      steps: form.steps
        .map((s, idx) => ({
          stepId: s.stepId,
          order: idx + 1,
          stepType: s.stepType || "custom",
          title: s.title?.trim(),
          description: s.description?.trim() || undefined,
          durationMinutes: sanitizeNumber(s.durationMinutes),
          temperatureC: sanitizeNumber(s.temperatureC),
          co2Volumes: sanitizeNumber(s.co2Volumes),
          data: s.data || {},
        }))
        .filter((s) => s.title),
      ingredients: form.ingredients
        .map((ing) => ({
          ingredientId: ing.ingredientId,
          name: ing.name?.trim(),
          category: ing.category || "other",
          amount: ing.amount?.trim() || undefined,
          unit: ing.unit?.trim() || undefined,
          notes: ing.notes?.trim() || undefined,
          stepIds: (ing.stepIds || []).filter((id) => form.steps.some((s) => s.stepId === id)),
        }))
        .filter((ing) => ing.name),
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
