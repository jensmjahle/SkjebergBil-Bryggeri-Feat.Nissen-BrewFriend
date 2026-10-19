<template>
  <section class="recipe-builder mx-auto w-full max-w-6xl px-4 py-6 md:py-8">
    <router-link to="/oppskrifter" class="builder-back"
      ><ArrowLeft :size="16" aria-hidden="true" />{{
        t("navbar.user.items.recipes")
      }}</router-link
    >
    <header class="mt-5">
      <h1 class="text-3xl font-bold sm:text-4xl">{{ title }}</h1>
      <p class="mt-2 text-sm text-text2-faded">{{ subtitle }}</p>
    </header>
    <p v-if="loading" role="status" class="py-8">{{ t("common.loading") }}</p>
    <p
      v-else-if="loadError"
      role="alert"
      class="py-8 text-sm text-[var(--color-error-text,var(--color-danger))]"
    >
      {{ loadError }}
    </p>
    <form v-else class="mt-6" novalidate @submit.prevent="submit">
      <p v-if="prefilling" role="status" class="mb-4 text-sm text-text2-faded">
        {{ t("recipes.create.copy_loading") }}
      </p>
      <nav
        ref="tabsRoot"
        class="builder-tabs"
        role="tablist"
        :aria-label="t('recipes.presentation.sections')"
        @keydown="tabKeydown"
      >
        <button
          v-for="tab in tabs"
          :id="`${id}-tab-${tab.value}`"
          :key="tab.value"
          role="tab"
          type="button"
          :aria-selected="activeSection === tab.value"
          :aria-controls="`${id}-panel-${tab.value}`"
          :tabindex="activeSection === tab.value ? 0 : -1"
          @click="activeSection = tab.value"
        >
          <component :is="tab.icon" :size="17" aria-hidden="true" /><span>{{
            tab.label
          }}</span
          ><span v-if="tab.count != null" class="builder-count">{{
            tab.count
          }}</span>
        </button>
      </nav>
      <fieldset class="builder-layout" :disabled="busy" :aria-busy="busy">
        <div class="builder-main min-w-0">
          <section
            v-show="activeSection === 'basics'"
            :id="`${id}-panel-basics`"
            :aria-labelledby="`${id}-tab-basics`"
            role="tabpanel"
            class="builder-panel space-y-5"
          >
            <h2 class="builder-title">{{ t("recipes.builder.details") }}</h2>
            <BaseInput
              :id="`${id}-name`"
              v-model="form.name"
              :label="t('recipes.fields.name')"
              required
              maxlength="160"
              :placeholder="t('recipes.create.name_placeholder')"
            />
            <BaseDropdown
              v-model="form.beerType"
              :label="t('recipes.fields.beer_type')"
              :options="beerTypeOptions"
              :placeholder="t('recipes.create.select_beer_type')"
            />
            <BaseTextarea
              :id="`${id}-flavor`"
              v-model="form.flavorProfile"
              :label="t('recipes.fields.flavor_profile')"
              :placeholder="t('recipes.create.flavor_placeholder')"
              :rows="4"
              maxlength="1200"
            />
            <BaseInput
              v-model="form.color"
              :label="t('recipes.fields.color')"
              :placeholder="t('recipes.create.color_placeholder')"
              maxlength="120"
            />
            <details ref="appearanceDetails" class="builder-appearance">
              <summary>
                <img
                  :src="resolveRecipeIconPath(form.iconPath)"
                  alt=""
                  class="h-7 w-7 object-contain"
                /><span>{{ t("recipes.builder.appearance") }}</span
                ><ChevronDown
                  :size="17"
                  class="builder-chevron ml-auto"
                  aria-hidden="true"
                />
              </summary>
              <div class="mt-5 space-y-5">
                <RecipeIconPicker v-model="form.iconPath" />
                <div class="builder-upload">
                  <label
                    :for="`${id}-image`"
                    class="mb-2 flex items-center gap-2 text-sm font-semibold"
                    ><ImagePlus :size="18" aria-hidden="true" />{{
                      t("recipes.fields.image")
                    }}</label
                  ><input
                    :id="`${id}-image`"
                    type="file"
                    accept="image/*"
                    class="block w-full text-sm"
                    @change="$emit('upload', $event)"
                  />
                  <p
                    v-if="imageUploadMessage"
                    role="status"
                    class="mt-2 text-xs text-text2-faded"
                  >
                    {{ imageUploadMessage }}
                  </p>
                  <img
                    v-if="resolvedImageSrc"
                    :src="resolvedImageSrc"
                    :alt="t('recipes.detail.image_alt')"
                    class="mt-3 max-h-48 max-w-full rounded-lg object-contain"
                  />
                </div>
                <BaseInput
                  v-model="form.imageUrl"
                  :label="t('recipes.fields.image_url')"
                  :placeholder="t('recipes.create.image_url_placeholder')"
                />
                <BaseInput
                  :id="`${id}-source`"
                  v-model="form.sourceUrl"
                  type="url"
                  maxlength="2000"
                  :label="t('recipes.import.source')"
                  placeholder="https://"
                />
              </div>
            </details>
          </section>
          <section
            v-show="activeSection === 'steps'"
            :id="`${id}-panel-steps`"
            :aria-labelledby="`${id}-tab-steps`"
            role="tabpanel"
            class="builder-panel builder-entries"
          >
            <h2 class="builder-title mb-1">
              {{ t("recipes.builder.method") }}
            </h2>
            <p class="mb-5 text-xs text-text2-faded">
              {{ t("recipes.builder.method_help") }}
            </p>
            <slot name="steps" />
          </section>
          <section
            v-show="activeSection === 'ingredients'"
            :id="`${id}-panel-ingredients`"
            :aria-labelledby="`${id}-tab-ingredients`"
            role="tabpanel"
            class="builder-panel builder-entries"
          >
            <h2 class="builder-title mb-1">
              {{ t("recipes.detail.ingredients") }}
            </h2>
            <p class="mb-5 text-xs text-text2-faded">
              {{ t("recipes.builder.ingredients_help") }}
            </p>
            <slot name="ingredients" />
          </section>
        </div>
        <aside class="builder-sidebar min-w-0 space-y-4">
          <details
            ref="targetsDetails"
            class="builder-panel builder-disclosure"
            :open="targetsOpen"
            @toggle="targetsOpen = $event.currentTarget.open"
          >
            <summary>
              <Target :size="19" aria-hidden="true" />
              <h2 class="builder-title">
                {{ t("brews.plan.recipe_targets") }}
              </h2>
              <ChevronDown
                :size="16"
                class="builder-chevron ml-auto shrink-0"
                aria-hidden="true"
              />
            </summary>
            <div class="mt-5 space-y-4">
              <BaseInput
                :id="`${id}-volume`"
                v-model.number="form.defaults.batchSizeLiters"
                :model-modifiers="{ number: true }"
                type="number"
                min="0.1"
                step="0.1"
                :label="t('recipes.fields.batch_size_liters')"
                :error="volumeInvalid ? t('brews.plan.volume_invalid') : ''"
                :aria-invalid="volumeInvalid ? true : undefined"
              />
              <BaseRangeInput
                v-model:from="form.defaults.ogFrom"
                v-model:to="form.defaults.ogTo"
                :label="t('brews.plan.og_range')"
                :from-label="t('brews.plan.range_from')"
                :to-label="t('brews.plan.range_to')"
                from-placeholder="1.056"
                to-placeholder="1.062"
                :error="ogError ? t(`brews.plan.gravity_${ogError}`) : ''"
              />
              <BaseRangeInput
                v-model:from="form.defaults.fgFrom"
                v-model:to="form.defaults.fgTo"
                :label="t('brews.plan.fg_range')"
                :from-label="t('brews.plan.range_from')"
                :to-label="t('brews.plan.range_to')"
                from-placeholder="1.010"
                to-placeholder="1.014"
                :error="fgError ? t(`brews.plan.gravity_${fgError}`) : ''"
              />
              <div class="grid grid-cols-2 gap-3">
                <BaseInput
                  v-model.number="form.defaults.ibu"
                  :model-modifiers="{ number: true }"
                  type="number"
                  min="0"
                  step="1"
                  :label="t('recipes.metrics.ibu')"
                  :error="
                    invalidNonnegative(form.defaults.ibu)
                      ? t('recipes.builder.nonnegative')
                      : ''
                  "
                  :aria-invalid="
                    invalidNonnegative(form.defaults.ibu) ? true : undefined
                  "
                /><BaseInput
                  v-model.number="form.defaults.co2Volumes"
                  :model-modifiers="{ number: true }"
                  type="number"
                  min="0"
                  step="0.1"
                  :label="t('recipes.metrics.co2')"
                  :error="
                    invalidNonnegative(form.defaults.co2Volumes)
                      ? t('recipes.builder.nonnegative')
                      : ''
                  "
                  :aria-invalid="
                    invalidNonnegative(form.defaults.co2Volumes)
                      ? true
                      : undefined
                  "
                />
              </div>
              <div class="builder-estimate">
                <p class="text-xs text-text2-faded">
                  {{ t("recipes.presentation.abv_estimate") }}
                </p>
                <strong class="mt-1 block text-base tabular-nums">{{
                  abvText
                }}</strong>
              </div>
            </div>
          </details>
          <details
            class="builder-panel builder-disclosure"
            :open="summaryOpen"
            @toggle="summaryOpen = $event.currentTarget.open"
          >
            <summary>
              <ClipboardList :size="19" aria-hidden="true" />
              <h2 class="builder-title">
                {{ t("recipes.builder.live_summary") }}
              </h2>
              <ChevronDown
                :size="16"
                class="builder-chevron ml-auto shrink-0"
                aria-hidden="true"
              />
            </summary>
            <div class="mt-4">
              <dl class="builder-summary">
                <div>
                  <dt>{{ t("recipes.detail.steps") }}</dt>
                  <dd>{{ form.steps.length }}</dd>
                </div>
                <div>
                  <dt>{{ t("recipes.detail.ingredients") }}</dt>
                  <dd>{{ summary.ingredientCount }}</dd>
                </div>
                <div>
                  <dt>{{ t("brews.plan.total_mash") }}</dt>
                  <dd>
                    {{ number(summary.mashMinutes) }}
                    {{ t("recipes.detail.minutes") }}
                  </dd>
                </div>
                <div>
                  <dt>{{ t("brews.plan.total_boil") }}</dt>
                  <dd>
                    {{ number(summary.boilMinutes) }}
                    {{ t("recipes.detail.minutes") }}
                  </dd>
                </div>
              </dl>
              <div class="mt-4 border-t border-border3 pt-4">
                <p class="text-xs text-text2-faded">
                  {{ t("recipes.presentation.recorded_cost") }}
                </p>
                <p class="mt-1 text-lg font-semibold">
                  {{ money(summary.totalCost) }}
                </p>
                <p class="mt-1 text-xs text-text2-faded">
                  {{
                    t("recipes.presentation.priced_count", {
                      priced: summary.pricedCount,
                      total: summary.ingredientCount,
                    })
                  }}
                </p>
              </div>
            </div>
          </details>
        </aside>
      </fieldset>
      <footer class="builder-actions">
        <div class="flex flex-wrap items-center gap-3">
          <BaseButton
            type="submit"
            :icon="Save"
            :disabled="busy"
            class="builder-save"
            >{{ submitting ? t("common.saving") : submitLabel }}</BaseButton
          ><BaseButton
            v-if="resettable"
            type="button"
            variant="button3"
            :icon="RotateCcw"
            :disabled="busy"
            @click="reset"
            >{{ t("common.reset") }}</BaseButton
          ><router-link
            v-else
            :to="backTo"
            class="text-sm underline underline-offset-4"
            >{{ t("common.cancel") }}</router-link
          ><span class="text-xs text-text2-faded">{{
            t("recipes.builder.save_help")
          }}</span>
        </div>
        <p
          v-if="validationError || errorMessage"
          role="alert"
          class="mt-3 text-sm text-[var(--color-error-text,var(--color-danger))]"
        >
          {{ validationError || errorMessage }}
        </p>
        <p v-if="successMessage" role="status" class="mt-3 text-sm text-text2">
          {{ successMessage }}
        </p>
      </footer>
    </form>
  </section>
</template>
<script setup>
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  useId,
  watch,
} from "vue";
import { useI18n } from "vue-i18n";
import {
  ArrowLeft,
  ChevronDown,
  ClipboardList,
  ImagePlus,
  Leaf,
  ListOrdered,
  NotebookPen,
  RotateCcw,
  Save,
  Target,
} from "lucide-vue-next";
import BaseButton from "@/components/base/BaseButton.vue";
import BaseInput from "@/components/base/BaseInput.vue";
import BaseDropdown from "@/components/base/BaseDropdown.vue";
import BaseTextarea from "@/components/base/BaseTextarea.vue";
import BaseRangeInput from "@/components/base/BaseRangeInput.vue";
import RecipeIconPicker from "./RecipeIconPicker.vue";
import { resolveRecipeIconPath } from "@/utils/recipeAssets.js";
import { gravityRangeError } from "@/utils/brewPlanningSummary.js";
import { recipeDetailSummary } from "@/utils/recipeDetailSummary.js";
import { invalidBoilSchedule } from "@/utils/boilSchedule.js";
const props = defineProps({
  form: Object,
  title: String,
  subtitle: String,
  submitLabel: String,
  backTo: { type: String, default: "/oppskrifter" },
  beerTypeOptions: Array,
  loading: Boolean,
  loadError: String,
  busy: Boolean,
  submitting: Boolean,
  prefilling: Boolean,
  resettable: Boolean,
  imageUploadMessage: String,
  errorMessage: String,
  successMessage: String,
});
const emit = defineEmits([
  "submit",
  "reset",
  "upload",
  "invalid-step",
  "invalid-ingredient",
]);
const { t, locale } = useI18n();
const id = useId(),
  activeSection = ref("basics"),
  tabsRoot = ref(null),
  targetsDetails = ref(null),
  appearanceDetails = ref(null),
  validationError = ref("");
const media = window.matchMedia("(min-width:900px)"),
  targetsOpen = ref(media.matches),
  summaryOpen = ref(media.matches);
function updateSidebar(event) {
  targetsOpen.value = event.matches;
  summaryOpen.value = event.matches;
}
onMounted(() => media.addEventListener("change", updateSidebar));
onBeforeUnmount(() => media.removeEventListener("change", updateSidebar));
const tabs = computed(() => [
  { value: "basics", label: t("recipes.builder.basics"), icon: NotebookPen },
  {
    value: "steps",
    label: t("recipes.detail.steps"),
    icon: ListOrdered,
    count: props.form.steps.length,
  },
  {
    value: "ingredients",
    label: t("recipes.detail.ingredients"),
    icon: Leaf,
    count: props.form.ingredients.length,
  },
]);
const summary = computed(() => recipeDetailSummary(props.form));
const localeCode = () => (locale.value === "no" ? "nb-NO" : locale.value);
const number = (value) =>
  new Intl.NumberFormat(localeCode(), { maximumFractionDigits: 1 }).format(
    value,
  );
const money = (value) =>
  value == null
    ? "—"
    : new Intl.NumberFormat(localeCode(), {
        style: "currency",
        currency: "NOK",
      }).format(value);
const abvText = computed(() =>
  summary.value.abv
    ? `${new Intl.NumberFormat(localeCode(), { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(summary.value.abv.min)}–${new Intl.NumberFormat(localeCode(), { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(summary.value.abv.max)} %`
    : "—",
);
const ogError = computed(() =>
  gravityRangeError(props.form.defaults.ogFrom, props.form.defaults.ogTo),
);
const fgError = computed(() =>
  gravityRangeError(props.form.defaults.fgFrom, props.form.defaults.fgTo),
);
const supplied = (value) =>
  value !== null && value !== undefined && value !== "";
const invalidNonnegative = (value) =>
  supplied(value) && (!Number.isFinite(Number(value)) || Number(value) < 0);
const volumeInvalid = computed(
  () =>
    supplied(props.form.defaults.batchSizeLiters) &&
    (!Number.isFinite(Number(props.form.defaults.batchSizeLiters)) ||
      Number(props.form.defaults.batchSizeLiters) <= 0),
);
const resolvedImageSrc = computed(() => {
  const url = props.form.imageUrl;
  if (!url) return "";
  return url.startsWith("/")
    ? `${window.env?.VITE_API_URL || "http://localhost:3000"}${url}`
    : url;
});
function tabKeydown(event) {
  if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
  event.preventDefault();
  const values = tabs.value.map((tab) => tab.value),
    index = values.indexOf(activeSection.value);
  const next =
    event.key === "Home"
      ? 0
      : event.key === "End"
        ? values.length - 1
        : (index + (event.key === "ArrowRight" ? 1 : -1) + values.length) %
          values.length;
  activeSection.value = values[next];
  tabsRoot.value?.querySelectorAll("button")[next]?.focus();
}
async function fail(message, section = "basics", focusId) {
  validationError.value = message;
  activeSection.value = section;
  await nextTick();
  if (focusId) document.getElementById(focusId)?.focus();
}
async function submit() {
  if (props.busy) return;
  validationError.value = "";
  if (!props.form.name?.trim())
    return fail(t("recipes.builder.name_required"), "basics", `${id}-name`);
  if (
    ogError.value ||
    fgError.value ||
    volumeInvalid.value ||
    ["ibu", "co2Volumes"].some(
      (key) =>
        supplied(props.form.defaults[key]) &&
        (!Number.isFinite(Number(props.form.defaults[key])) ||
          Number(props.form.defaults[key]) < 0),
    )
  ) {
    targetsOpen.value = true;
    validationError.value = t("recipes.builder.check_targets");
    await nextTick();
    (
      targetsDetails.value?.querySelector('input[aria-invalid="true"]') ||
      targetsDetails.value?.querySelector("input")
    )?.focus();
    return;
  }
  if (props.form.sourceUrl) {
    try {
      const url = new URL(props.form.sourceUrl);
      if (!["http:", "https:"].includes(url.protocol)) throw Error();
    } catch {
      appearanceDetails.value.open = true;
      return fail(t("recipes.import.errors.url"), "basics", `${id}-source`);
    }
  }
  const invalidStep = props.form.steps.find(
    (step) => !step.title?.trim() || invalidBoilSchedule(step),
  );
  if (invalidStep) {
    emit("invalid-step", invalidStep.stepId);
    return fail(t("recipes.builder.check_steps"), "steps");
  }
  const invalidIngredient = props.form.ingredients.find(
    (item) =>
      !item.name?.trim() ||
      (supplied(item.price) &&
        (!Number.isFinite(Number(item.price)) || Number(item.price) < 0)),
  );
  if (invalidIngredient) {
    emit("invalid-ingredient", invalidIngredient.ingredientId);
    return fail(t("recipes.builder.check_ingredients"), "ingredients");
  }
  emit("submit");
}
function reset() {
  if (props.busy) return;
  validationError.value = "";
  activeSection.value = "basics";
  const imageInput = document.getElementById(`${id}-image`);
  if (imageInput) imageInput.value = "";
  emit("reset");
}
watch(
  () => props.successMessage,
  (value) => {
    if (value) {
      validationError.value = "";
      if (props.resettable) {
        activeSection.value = "basics";
        const imageInput = document.getElementById(`${id}-image`);
        if (imageInput) imageInput.value = "";
      }
    }
  },
);
</script>
<style scoped>
.builder-back {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--color-text2-faded);
}
.builder-tabs {
  display: flex;
  gap: 10px;
  border-bottom: 1px solid var(--color-border3);
  margin-bottom: 22px;
}
.builder-tabs button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 15px 17px 12px;
  border-bottom: 3px solid transparent;
  font-size: 14px;
  color: var(--color-text2-faded);
}
.builder-tabs button[aria-selected="true"] {
  border-color: var(--color-button2);
  color: var(--color-text1);
  font-weight: 700;
}
.builder-count {
  padding: 1px 6px;
  border-radius: 6px;
  background: var(--color-bg2);
  font-size: 11px;
}
.builder-layout {
  display: grid;
  grid-template-columns: minmax(0, 2.1fr) minmax(290px, 1fr);
  gap: 20px;
  align-items: start;
  margin: 0;
  padding: 0;
  border: 0;
  min-width: 0;
}
.builder-panel {
  padding: 22px;
  border: 1px solid var(--color-border3);
  border-radius: 12px;
  min-width: 0;
}
.builder-title {
  font-size: 18px;
  font-weight: 700;
  line-height: 1.4;
}
.builder-disclosure > summary {
  display: flex;
  align-items: center;
  gap: 9px;
  cursor: pointer;
  list-style: none;
}
.builder-disclosure > summary::-webkit-details-marker,
.builder-appearance > summary::-webkit-details-marker {
  display: none;
}
.builder-disclosure .builder-title {
  font-size: 16px;
}
.builder-disclosure[open] > summary .builder-chevron,
.builder-appearance[open] > summary .builder-chevron {
  transform: rotate(180deg);
}
.builder-appearance {
  padding-top: 18px;
  border-top: 1px solid var(--color-border3);
}
.builder-appearance > summary {
  display: flex;
  align-items: center;
  gap: 10px;
  list-style: none;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
}
.builder-upload {
  padding: 16px;
  border: 1px dashed var(--color-border4);
  border-radius: 10px;
}
.builder-estimate {
  padding: 12px;
  background: var(--color-bg2);
  border-radius: 8px;
}
.builder-summary > div {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding: 8px 0;
  font-size: 13px;
}
.builder-summary dt {
  color: var(--color-text2-faded);
}
.builder-summary dd {
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
.builder-actions {
  position: sticky;
  bottom: 12px;
  z-index: 20;
  background: var(--color-bg1);
  margin-top: 22px;
  padding: 16px;
  border: 1px solid var(--color-border3);
  border-radius: 12px;
}
.builder-save {
  color: var(--color-text4);
}
.builder-entries :deep(.shadow-sm) {
  box-shadow: none;
  border-color: var(--color-border3);
  border-radius: 12px;
}
.builder-entries :deep([class*="border-l-"]) {
  border-left-color: var(--color-button2);
}
.builder-entries :deep(h3) {
  font-size: 16px;
}
.builder-entries :deep(h4) {
  overflow-wrap: anywhere;
}
button:focus-visible,
a:focus-visible,
summary:focus-visible {
  outline: 2px solid var(--color-text1);
  outline-offset: 4px;
  border-radius: 6px;
}
@media (max-width: 900px) {
  .builder-layout {
    grid-template-columns: minmax(0, 1fr);
  }
  .builder-sidebar {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 16px;
  }
  .builder-sidebar > * {
    margin-top: 0;
  }
}
@media (max-width: 640px) {
  .builder-actions {
    position: static;
  }
  .builder-panel {
    padding: 16px;
  }
  .builder-tabs {
    gap: 0;
  }
  .builder-tabs button {
    flex: 1;
    gap: 5px;
    padding: 13px 4px 10px;
    font-size: 12px;
  }
  .builder-tabs button > svg {
    display: none;
  }
  .builder-sidebar {
    display: block;
  }
  .builder-sidebar > * + * {
    margin-top: 16px;
  }
  .builder-actions > div {
    gap: 10px;
  }
  .builder-actions .builder-save {
    flex: 1;
  }
  .builder-actions > div > span {
    width: 100%;
  }
}
</style>
