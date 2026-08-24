<template>
  <BaseCard class="space-y-5">
    <div>
      <h3>Saftblanding</h3>
      <p class="text-sm opacity-80">Legg inn ingrediensene du har. Alkoholprosenten i hver ingrediens endres aldri.</p>
    </div>

    <div class="space-y-3">
      <div class="hidden grid-cols-[minmax(0,1fr)_8rem_8rem_2.5rem] gap-3 px-1 text-sm font-medium opacity-80 sm:grid">
        <span>Ingrediens</span>
        <span>Volum (L)</span>
        <span>Alkohol (%)</span>
        <span></span>
      </div>
      <div v-for="ingredient in mix.ingredients" :key="ingredient.id" class="grid gap-3 rounded-lg border border-border3 p-3 sm:grid-cols-[minmax(0,1fr)_8rem_8rem_2.5rem] sm:border-0 sm:p-0">
        <BaseInput
          :model-value="ingredient.name"
          label="Ingrediens"
          class="sm:[&>label]:hidden"
          @update:model-value="updateIngredient(ingredient.id, 'name', $event)"
        />
        <div class="relative">
          <BaseInput
            :model-value="ingredient.volume"
            label="Volum (L)"
            type="number"
            min="0"
            step="0.01"
            class="sm:[&>label]:hidden"
            @update:model-value="updateIngredientNumber(ingredient.id, 'volume', $event)"
          />
          <LockButton
            :locked="isIngredientLocked(ingredient.id)"
            :label="`volum for ${ingredient.name || 'ingrediens'}`"
            @click="toggleIngredientLock(ingredient.id)"
          />
        </div>
        <BaseInput
          :model-value="ingredient.abv"
          label="Alkohol (%)"
          type="number"
          min="0"
          max="100"
          step="0.01"
          class="sm:[&>label]:hidden"
          @update:model-value="updateIngredientNumber(ingredient.id, 'abv', $event)"
        />
        <button
          type="button"
          class="inline-flex h-10 w-10 items-center justify-center self-end rounded-md text-text2 hover:bg-bg3 disabled:cursor-not-allowed disabled:opacity-40"
          title="Fjern ingrediens"
          :aria-label="`Fjern ${ingredient.name || 'ingrediens'}`"
          :disabled="mix.ingredients.length === 1"
          @click="removeIngredient(ingredient.id)"
        >
          <Trash2 class="h-4 w-4" />
        </button>
      </div>
      <button type="button" class="inline-flex items-center gap-2 text-sm font-medium text-button1" @click="addIngredient">
        <Plus class="h-4 w-4" />
        Legg til ingrediens
      </button>
    </div>

    <div class="grid gap-3 border-t border-border3 pt-4 sm:grid-cols-2">
      <div class="relative">
        <BaseInput
          :model-value="mix.targetVolume"
          type="number"
          min="0"
          step="0.01"
          label="Ønsket sluttvolum (L)"
          @update:model-value="updateTarget('targetVolume', $event)"
        />
        <LockButton :locked="mix.locks.targetVolume" label="ønsket sluttvolum" @click="toggleTargetLock('targetVolume')" />
      </div>
      <div class="relative">
        <BaseInput
          :model-value="mix.targetAbv"
          type="number"
          min="0"
          max="100"
          step="0.01"
          label="Ønsket alkoholprosent (%)"
          @update:model-value="updateTarget('targetAbv', $event)"
        />
        <LockButton :locked="mix.locks.targetAbv" label="ønsket alkoholprosent" @click="toggleTargetLock('targetAbv')" />
      </div>
    </div>

    <div class="border-t border-border3 pt-4">
      <h4 class="mb-3 text-base font-semibold">Faktisk blanding</h4>
      <div class="grid gap-3 sm:grid-cols-3">
        <ResultCard label="Samlet volum" :value="formatLiters(totalVolume)" />
        <ResultCard label="Alkoholprosent" :value="formatPercent(actualAbv)" />
        <ResultCard label="Blandingsforhold" :value="mixRatio" />
      </div>
      <div class="mt-3 grid gap-2 text-sm sm:grid-cols-2">
        <p :class="volumeDifference === 0 ? 'opacity-80' : 'text-danger'">{{ volumeMessage }}</p>
        <p :class="abvDifference === 0 ? 'opacity-80' : 'text-danger'">{{ abvMessage }}</p>
      </div>
    </div>
  </BaseCard>
</template>

<script setup>
import { computed, defineComponent, h } from "vue";
import { Lock, LockOpen, Plus, Trash2 } from "lucide-vue-next";
import BaseCard from "@/components/base/BaseCard.vue";
import BaseInput from "@/components/base/BaseInput.vue";
import { useToolsStore } from "@/store/useToolsStore";

const ResultCard = defineComponent({
  props: { label: String, value: String },
  setup(props) {
    return () => h("div", { class: "rounded-lg border border-border3 p-3" }, [
      h("p", { class: "text-sm opacity-80" }, props.label),
      h("p", { class: "mt-1 text-xl font-semibold" }, props.value),
    ]);
  },
});

const LockButton = defineComponent({
  props: { locked: Boolean, label: String },
  emits: ["click"],
  setup(props, { emit }) {
    return () => h("button", {
      type: "button",
      class: "absolute bottom-1.5 right-1.5 inline-flex h-8 w-8 items-center justify-center rounded-md text-text2 hover:bg-bg3",
      title: props.locked ? "Lås opp felt" : "Lås felt",
      "aria-label": props.locked ? `Lås opp ${props.label}` : `Lås ${props.label}`,
      onClick: () => emit("click"),
    }, [h(props.locked ? Lock : LockOpen, { class: "h-4 w-4" })]);
  },
});

const store = useToolsStore();
const mix = computed(() => store.cordial);
const totalVolume = computed(() => mix.value.ingredients.reduce((sum, ingredient) => sum + ingredient.volume, 0));
const alcoholVolume = computed(() => mix.value.ingredients.reduce((sum, ingredient) => sum + (ingredient.volume * ingredient.abv) / 100, 0));
const actualAbv = computed(() => totalVolume.value > 0 ? (alcoholVolume.value / totalVolume.value) * 100 : 0);
const volumeDifference = computed(() => totalVolume.value - mix.value.targetVolume);
const abvDifference = computed(() => actualAbv.value - mix.value.targetAbv);

const mixRatio = computed(() => {
  const positiveVolumes = mix.value.ingredients.map((ingredient) => ingredient.volume).filter((volume) => volume > 0);
  if (!positiveVolumes.length) return "-";
  const reference = Math.min(...positiveVolumes);
  return mix.value.ingredients
    .map((ingredient) => `${ingredient.name || "Ingrediens"} ${formatNumber(ingredient.volume / reference)}`)
    .join(" : ");
});

const volumeMessage = computed(() => differenceMessage("Volum", volumeDifference.value, "L"));
const abvMessage = computed(() => differenceMessage("Alkoholprosent", abvDifference.value, "%"));

function number(value, maximum = Number.POSITIVE_INFINITY) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= maximum ? parsed : null;
}

function updateIngredient(id, field, value) {
  setIngredients(mix.value.ingredients.map((ingredient) => ingredient.id === id ? { ...ingredient, [field]: value } : ingredient));
}

function updateIngredientNumber(id, field, value) {
  if (value === "") return;
  const parsed = number(value, field === "abv" ? 100 : Number.POSITIVE_INFINITY);
  if (parsed === null) return;
  updateIngredient(id, field, parsed);

  syncUnlockedTargets();
}

function addIngredient() {
  setIngredients([...mix.value.ingredients, {
    id: `ingredient-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: "Ny ingrediens",
    volume: 0,
    abv: 0,
  }]);
}

function removeIngredient(id) {
  if (mix.value.ingredients.length === 1) return;
  setIngredients(mix.value.ingredients.filter((ingredient) => ingredient.id !== id));
}

function setIngredients(ingredients) {
  store.setCordial({ ingredients });
}

function updateTarget(field, value) {
  if (value === "") return;
  const parsed = number(value, field === "targetAbv" ? 100 : Number.POSITIVE_INFINITY);
  if (parsed === null) return;

  const target = { ...mix.value, [field]: parsed };
  store.setCordial({
    [field]: parsed,
    ingredients: volumesForTarget(target),
  });
}

function volumesForTarget(target) {
  const locked = target.ingredients.filter((ingredient) => target.locks.ingredientVolumes[ingredient.id]);
  const adjustable = target.ingredients.filter((ingredient) => !target.locks.ingredientVolumes[ingredient.id]);
  const alcoholic = adjustable.filter((ingredient) => ingredient.abv > 0);
  const nonAlcoholic = adjustable.filter((ingredient) => ingredient.abv === 0);
  const lockedVolume = locked.reduce((sum, ingredient) => sum + ingredient.volume, 0);
  const lockedAlcoholVolume = locked.reduce((sum, ingredient) => sum + (ingredient.volume * ingredient.abv) / 100, 0);
  const remainingVolume = Math.max(target.targetVolume - lockedVolume, 0);
  const requiredAlcoholVolume = Math.max((target.targetVolume * target.targetAbv) / 100 - lockedAlcoholVolume, 0);

  if (!adjustable.length) return target.ingredients;
  if (!alcoholic.length || !nonAlcoholic.length) {
    const adjusted = scaleGroup(adjustable, remainingVolume);
    return combineVolumes(target.ingredients, adjusted);
  }

  const alcoholicVolume = alcoholic.reduce((sum, ingredient) => sum + ingredient.volume, 0);
  const alcoholContent = alcoholic.reduce(
    (sum, ingredient) => sum + (ingredient.volume * ingredient.abv) / 100,
    0,
  );
  const averageAbv = alcoholicVolume > 0 ? (alcoholContent / alcoholicVolume) * 100 : 0;
  const requiredAlcoholicVolume = averageAbv > 0
    ? (requiredAlcoholVolume * 100) / averageAbv
    : 0;
  const alcoholicTargetVolume = Math.min(requiredAlcoholicVolume, remainingVolume);
  const nonAlcoholicTargetVolume = remainingVolume - alcoholicTargetVolume;

  const alcoholVolumes = scaleGroup(alcoholic, alcoholicTargetVolume);
  const nonAlcoholVolumes = scaleGroup(nonAlcoholic, nonAlcoholicTargetVolume);
  return combineVolumes(target.ingredients, [...alcoholVolumes, ...nonAlcoholVolumes]);
}

function combineVolumes(ingredients, adjusted) {
  const volumesById = new Map(adjusted.map((ingredient) => [ingredient.id, ingredient.volume]));
  return ingredients.map((ingredient) => ({ ...ingredient, volume: volumesById.get(ingredient.id) ?? ingredient.volume }));
}

function scaleGroup(ingredients, targetVolume) {
  const currentVolume = ingredients.reduce((sum, ingredient) => sum + ingredient.volume, 0);
  const share = currentVolume > 0 ? null : 1 / ingredients.length;
  return ingredients.map((ingredient) => ({
    ...ingredient,
    volume: Number((currentVolume > 0
      ? (ingredient.volume / currentVolume) * targetVolume
      : share * targetVolume).toFixed(3)),
  }));
}

function isIngredientLocked(id) {
  return Boolean(mix.value.locks.ingredientVolumes[id]);
}

function toggleIngredientLock(id) {
  store.setCordial({
    locks: {
      ...mix.value.locks,
      ingredientVolumes: {
        ...mix.value.locks.ingredientVolumes,
        [id]: !isIngredientLocked(id),
      },
    },
  });
}

function toggleTargetLock(field) {
  store.setCordial({ locks: { ...mix.value.locks, [field]: !mix.value.locks[field] } });
}

function syncUnlockedTargets() {
  const next = {};
  if (!mix.value.locks.targetVolume) next.targetVolume = Number(totalVolume.value.toFixed(3));
  if (!mix.value.locks.targetAbv) next.targetAbv = Number(actualAbv.value.toFixed(3));
  if (Object.keys(next).length) store.setCordial(next);
}

function formatNumber(value) {
  return Number(value).toLocaleString("nb-NO", { maximumFractionDigits: 2 });
}

function formatLiters(value) {
  return `${formatNumber(value)} L`;
}

function formatPercent(value) {
  return `${formatNumber(value)} %`;
}

function differenceMessage(label, difference, unit) {
  if (Math.abs(difference) < 0.005) return `${label}: samsvarer med målet`;
  const direction = difference > 0 ? "over" : "under";
  return `${label}: ${formatNumber(Math.abs(difference))} ${unit} ${direction} målet`;
}
</script>
