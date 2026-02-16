<template>
  <section class="mx-auto w-full max-w-5xl px-4 py-8">
    <BaseCard>
      <div class="mb-6">
        <h1>Ny Oppskrift</h1>
        <p class="mt-2 opacity-80">Opprett en oppskrift med standardverdier og valgbare standardsteg.</p>
      </div>

      <form class="space-y-6" @submit.prevent="handleSubmit">
        <div class="grid gap-4 md:grid-cols-2">
          <BaseInput v-model="form.name" label="Navn" required placeholder="f.eks. Sommer IPA" />
          <BaseDropdown v-model="form.beerType" label="Øltype" :options="beerTypeOptions" placeholder="Velg øltype" />
          <BaseInput v-model="form.color" label="Farge" placeholder="f.eks. Gylden" />
          <BaseInput v-model="form.imageUrl" label="Bilde URL" placeholder="https://..." />
        </div>

        <div>
          <label class="mb-1 block text-sm font-medium text-[var(--color-text1)]">Smaksprofil</label>
          <textarea
            v-model="form.flavorProfile"
            rows="3"
            class="w-full rounded-lg border border-border4 bg-bg4 px-3 py-2 text-text4 focus:outline-none focus:ring-2 focus:ring-button1"
            placeholder="Beskriv smak, aroma og munnfølelse"
          />
        </div>

        <div class="space-y-2">
          <h3>Standardverdier</h3>
          <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <BaseInput v-model.number="form.defaults.og" :model-modifiers="{ number: true }" type="number" step="0.001" label="OG" />
            <BaseInput v-model.number="form.defaults.fg" :model-modifiers="{ number: true }" type="number" step="0.001" label="FG" />
            <BaseInput v-model.number="form.defaults.sg" :model-modifiers="{ number: true }" type="number" step="0.001" label="SG" />
            <BaseInput v-model.number="form.defaults.co2Volumes" :model-modifiers="{ number: true }" type="number" step="0.1" label="CO2" />
            <BaseInput v-model.number="form.defaults.ibu" :model-modifiers="{ number: true }" type="number" step="1" label="IBU" />
          </div>
        </div>

        <div class="space-y-3">
          <div class="flex flex-wrap items-end gap-3">
            <div class="w-full sm:max-w-xs">
              <BaseDropdown
                v-model="selectedStepType"
                label="Legg til stegtype"
                :options="stepTypeOptions"
                placeholder="Velg steg"
              />
            </div>
            <BaseButton type="button" variant="button2" @click="addStepByType">Legg til steg</BaseButton>
          </div>

          <div v-if="!form.steps.length" class="rounded-lg border border-dashed border-border3 p-4 text-sm opacity-70">
            Ingen steg lagt til enda. Du kan velge ett eller flere standardsteg.
          </div>

          <div v-for="(step, idx) in form.steps" :key="idx" class="space-y-2">
            <component
              :is="resolveStepComponent(step.stepType)"
              :model-value="step"
              :step-number="idx + 1"
              @update:model-value="updateStep(idx, $event)"
            />

            <div class="flex flex-wrap justify-end gap-2">
              <BaseButton type="button" variant="button3" :disabled="idx === 0" @click="moveStep(idx, -1)">Opp</BaseButton>
              <BaseButton type="button" variant="button3" :disabled="idx === form.steps.length - 1" @click="moveStep(idx, 1)">Ned</BaseButton>
              <BaseButton type="button" variant="button4" @click="removeStep(idx)">Fjern</BaseButton>
            </div>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-3">
          <BaseButton type="submit" :disabled="isSubmitting">
            {{ isSubmitting ? "Lagrer..." : "Opprett oppskrift" }}
          </BaseButton>
          <BaseButton type="button" variant="button3" :disabled="isSubmitting" @click="resetForm">Nullstill</BaseButton>
          <p v-if="successMessage" class="text-sm text-green-600">{{ successMessage }}</p>
        </div>
      </form>
    </BaseCard>
  </section>
</template>

<script setup>
import { reactive, ref } from "vue";
import BaseCard from "@/components/base/BaseCard.vue";
import BaseButton from "@/components/base/BaseButton.vue";
import BaseInput from "@/components/base/BaseInput.vue";
import BaseDropdown from "@/components/base/BaseDropdown.vue";
import { createRecipe } from "@/services/recipes.service.js";
import {
  STEP_COMPONENTS,
  STEP_TYPE_OPTIONS,
  createDefaultStep,
} from "@/components/recipe-steps/index.js";

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

const initialState = () => ({
  name: "",
  beerType: "",
  flavorProfile: "",
  color: "",
  imageUrl: "",
  defaults: {
    og: null,
    fg: null,
    sg: null,
    co2Volumes: null,
    ibu: null,
  },
  steps: [],
});

const form = reactive(initialState());
const selectedStepType = ref("mash");
const isSubmitting = ref(false);
const successMessage = ref("");

function resolveStepComponent(stepType) {
  return STEP_COMPONENTS[stepType] || STEP_COMPONENTS.custom;
}

function addStepByType() {
  form.steps.push(createDefaultStep(selectedStepType.value || "custom"));
}

function updateStep(index, value) {
  form.steps.splice(index, 1, value);
}

function removeStep(index) {
  form.steps.splice(index, 1);
}

function moveStep(index, direction) {
  const target = index + direction;
  if (target < 0 || target >= form.steps.length) return;
  const current = form.steps[index];
  form.steps[index] = form.steps[target];
  form.steps[target] = current;
}

function resetForm() {
  Object.assign(form, initialState());
  selectedStepType.value = "mash";
  successMessage.value = "";
}

function sanitizeNumber(value) {
  return typeof value === "number" && !Number.isNaN(value) ? value : null;
}

async function handleSubmit() {
  if (!form.name?.trim()) return;

  isSubmitting.value = true;
  successMessage.value = "";

  try {
    const payload = {
      name: form.name.trim(),
      beerType: form.beerType || undefined,
      flavorProfile: form.flavorProfile?.trim() || undefined,
      color: form.color?.trim() || undefined,
      imageUrl: form.imageUrl?.trim() || undefined,
      defaults: {
        og: sanitizeNumber(form.defaults.og),
        fg: sanitizeNumber(form.defaults.fg),
        sg: sanitizeNumber(form.defaults.sg),
        co2Volumes: sanitizeNumber(form.defaults.co2Volumes),
        ibu: sanitizeNumber(form.defaults.ibu),
      },
      steps: form.steps
        .map((s, index) => ({
          order: index + 1,
          stepType: s.stepType || "custom",
          title: s.title?.trim(),
          description: s.description?.trim() || undefined,
          durationMinutes: sanitizeNumber(s.durationMinutes),
          temperatureC: sanitizeNumber(s.temperatureC),
          co2Volumes: sanitizeNumber(s.co2Volumes),
          data: s.data || {},
        }))
        .filter((s) => s.title),
    };

    await createRecipe(payload);
    successMessage.value = "Oppskrift lagret.";
    resetForm();
  } finally {
    isSubmitting.value = false;
  }
}
</script>
