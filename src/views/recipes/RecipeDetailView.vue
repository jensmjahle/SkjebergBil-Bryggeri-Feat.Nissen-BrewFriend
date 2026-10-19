<template>
  <section class="recipe-page mx-auto w-full max-w-6xl px-4 py-6 md:py-8">
    <router-link to="/oppskrifter" class="recipe-back"
      ><ArrowLeft :size="16" aria-hidden="true" />{{
        t("navbar.user.items.recipes")
      }}</router-link
    >
    <BaseCard v-if="loading" role="status" class="mt-6">{{
      t("common.loading")
    }}</BaseCard>
    <BaseCard v-else-if="error" class="mt-6 space-y-3"
      ><p role="alert">{{ error }}</p>
      <BaseButton variant="button3" @click="loadRecipe">{{
        t("home.retry")
      }}</BaseButton></BaseCard
    >
    <template v-else-if="recipe">
      <header class="recipe-header">
        <div class="recipe-identity">
          <img
            :src="recipeIcon"
            alt=""
            class="h-16 w-16 shrink-0 object-contain sm:h-20 sm:w-20"
          />
          <div class="min-w-0">
            <h1 class="break-words text-3xl font-bold sm:text-4xl">
              {{ recipe.name }}
            </h1>
            <p class="mt-2 text-sm text-text2-faded">
              {{ recipe.beerType || t("recipes.common.unknown_type") }} · v{{
                recipe.version || 1
              }}
            </p>
            <BaseStarRating
              class="mt-2 flex-wrap"
              :model-value="activeVersionRating.average"
              :count="activeVersionRating.count"
              readonly
              :size="16"
              show-value
              :empty-text="t('recipes.detail.not_rated')"
              :aria-label="t('recipes.detail.version_rating')"
            />
          </div>
        </div>
        <div class="recipe-actions">
          <router-link
            :to="{ path: '/brygg/nytt', query: { recipeId: recipe._id } }"
            class="recipe-plan"
            ><CalendarDays :size="16" aria-hidden="true" />{{
              t("home.plan_brew")
            }}</router-link
          >
          <router-link
            :to="`/oppskrifter/${recipe._id}/rediger`"
            class="recipe-edit"
            ><Pencil :size="16" aria-hidden="true" />{{
              t("recipes.detail.edit")
            }}</router-link
          >
          <div ref="actionMenuRoot" class="recipe-menu-root">
            <button
              ref="actionButton"
              type="button"
              class="recipe-menu-button"
              :aria-label="t('recipes.presentation.actions')"
              :aria-expanded="actionMenuOpen"
              :aria-controls="`${ids}-actions`"
              @click.stop="actionMenuOpen = !actionMenuOpen"
            >
              <EllipsisVertical :size="21" aria-hidden="true" />
            </button>
            <nav
              v-if="actionMenuOpen"
              :id="`${ids}-actions`"
              class="recipe-action-menu"
              :aria-label="t('recipes.presentation.actions')"
            >
              <router-link
                :to="{
                  path: '/oppskrifter/ny',
                  query: { copyFrom: recipe._id },
                }"
                @click="actionMenuOpen = false"
                ><Copy :size="16" aria-hidden="true" />{{
                  t("recipes.detail.copy")
                }}</router-link
              >
              <router-link
                :to="{
                  path: `/oppskrifter/${recipe._id}/rediger`,
                  query: { nyVersjon: '1' },
                }"
                @click="actionMenuOpen = false"
                ><Plus :size="16" aria-hidden="true" />{{
                  t("recipes.detail.new_version")
                }}</router-link
              >
              <button
                type="button"
                :disabled="deletingVersion || deletingFamily"
                @click="runMenuAction(deleteCurrentVersion)"
              >
                <Trash2 :size="16" aria-hidden="true" />{{
                  t("recipes.actions.delete_version")
                }}
              </button>
              <button
                type="button"
                :disabled="deletingVersion || deletingFamily"
                @click="runMenuAction(deleteAllVersions)"
              >
                <Trash2 :size="16" aria-hidden="true" />{{
                  t("recipes.actions.delete_recipe")
                }}
              </button>
            </nav>
          </div>
        </div>
      </header>
      <p
        v-if="actionError"
        role="alert"
        class="mt-4 text-sm text-[var(--color-error-text,var(--color-danger))]"
      >
        {{ actionError }}
      </p>
      <div
        v-if="versionOptions.length > 1 || versionError"
        class="mt-5 max-w-sm"
      >
        <BaseDropdown
          v-if="versionOptions.length > 1"
          :model-value="selectedVersionId"
          :label="t('recipes.detail.version')"
          :options="versionOptions"
          @update:model-value="switchVersion"
        />
        <p v-if="versionError" role="alert" class="text-xs text-text2-faded">
          {{ versionError }}
        </p>
      </div>
      <div class="recipe-stats" :aria-label="t('brews.plan.key_info')">
        <div v-for="stat in stats" :key="stat.label">
          <component
            :is="stat.icon"
            :size="23"
            class="shrink-0 opacity-65"
            aria-hidden="true"
          /><span class="min-w-0"
            ><span class="block text-xs text-text2-faded">{{ stat.label }}</span
            ><strong class="mt-1 block text-lg tabular-nums">{{
              stat.value
            }}</strong></span
          >
        </div>
      </div>
      <p
        v-if="recipe.flavorProfile"
        class="recipe-flavor whitespace-pre-line text-sm leading-relaxed"
      >
        {{ recipe.flavorProfile }}
      </p>
      <img
        v-if="resolvedImageSrc"
        :src="resolvedImageSrc"
        :alt="t('recipes.detail.image_alt')"
        class="mb-6 max-h-72 max-w-full rounded-xl object-contain"
      />
      <div class="recipe-workspace">
        <div class="recipe-content min-w-0">
          <div
            ref="tabsRoot"
            role="tablist"
            :aria-label="t('recipes.presentation.sections')"
            class="recipe-tabs"
            @keydown="tabKeydown"
          >
            <button
              v-for="tab in panelTabs"
              :id="`${ids}-tab-${tab.value}`"
              :key="tab.value"
              type="button"
              role="tab"
              :aria-selected="activePanel === tab.value"
              :aria-controls="`${ids}-panel-${tab.value}`"
              :tabindex="activePanel === tab.value ? 0 : -1"
              @click="activePanel = tab.value"
            >
              <component
                :is="tab.icon"
                :size="17"
                class="shrink-0"
                aria-hidden="true"
              /><span>{{ tab.label }}</span>
            </button>
          </div>
          <section
            v-show="activePanel === 'steps'"
            :id="`${ids}-panel-steps`"
            role="tabpanel"
            :aria-labelledby="`${ids}-tab-steps`"
            class="recipe-tab-content"
          >
            <p class="mb-4 text-xs text-text2-faded">
              {{
                t("recipes.presentation.step_count", {
                  count: recipe.steps?.length || 0,
                })
              }}
            </p>
            <div class="space-y-3">
              <RecipeMethodStep
                v-for="(step, index) in recipe.steps || []"
                :key="step.stepId"
                :step="step"
                :index="index"
                :ingredients="recipe.ingredients || []"
                :initially-open="index === 0 || stepPhase(step) === 'boil'"
              />
              <p v-if="!recipe.steps?.length" class="text-sm text-text2-faded">
                {{ t("recipes.create.no_steps") }}
              </p>
            </div>
          </section>
          <section
            v-show="activePanel === 'ingredients'"
            :id="`${ids}-panel-ingredients`"
            role="tabpanel"
            :aria-labelledby="`${ids}-tab-ingredients`"
            class="recipe-tab-content"
          >
            <RecipeIngredientsList
              :ingredients="recipe.ingredients || []"
              :steps="recipe.steps || []"
            />
          </section>
          <section
            v-show="activePanel === 'brews'"
            :id="`${ids}-panel-brews`"
            role="tabpanel"
            :aria-labelledby="`${ids}-tab-brews`"
            class="recipe-tab-content"
          >
            <h2 class="text-lg">{{ t("recipes.detail.brew_history") }}</h2>
            <p class="mt-2 text-xs leading-relaxed text-text2-faded">
              {{
                t("recipes.detail.brew_history_hint", {
                  version: recipe.version || 1,
                })
              }}
            </p>
            <div class="mt-5">
              <p v-if="loadingBrewHistory" role="status">
                {{ t("common.loading") }}
              </p>
              <div v-else-if="brewHistoryError">
                <p
                  role="alert"
                  class="text-sm text-[var(--color-error-text,var(--color-danger))]"
                >
                  {{ brewHistoryError }}
                </p>
                <BaseButton
                  class="mt-3"
                  variant="button3"
                  @click="loadBrewHistory(recipe._id)"
                  >{{ t("home.retry") }}</BaseButton
                >
              </div>
              <p
                v-else-if="!brewHistory.length"
                class="text-sm text-text2-faded"
              >
                {{ t("recipes.detail.no_brews") }}
              </p>
              <router-link
                v-for="brew in brewHistory"
                :key="brew._id"
                :to="
                  brew.status === 'planned'
                    ? `/brygg/${brew._id}/planlegging`
                    : `/brygg/${brew._id}`
                "
                class="recipe-history-row"
                ><div class="min-w-0 flex-1">
                  <p class="break-words font-semibold">
                    {{ brewTitle(brew) || t("recipes.detail.untitled_brew") }}
                  </p>
                  <p class="mt-1 text-xs text-text2-faded">
                    {{ formatDate(brew.brewedAt)
                    }}<span v-if="brew.version"> · v{{ brew.version }}</span>
                  </p>
                  <p
                    v-if="brew.note"
                    class="mt-2 whitespace-pre-line text-sm text-text2-faded"
                  >
                    {{ brew.note }}
                  </p>
                  <BaseStarRating
                    class="mt-2"
                    :model-value="brew.rating"
                    readonly
                    :size="15"
                    show-value
                    :empty-text="t('recipes.detail.not_rated')"
                    :aria-label="t('recipes.detail.brew_rating')"
                  />
                </div>
                <ChevronRight :size="18" class="shrink-0" aria-hidden="true"
              /></router-link>
            </div>
          </section>
        </div>
        <aside class="recipe-sidebar min-w-0 space-y-4">
          <details
            class="recipe-side-panel"
            :open="targetsOpen"
            @toggle="targetsOpen = $event.currentTarget.open"
          >
            <summary>
              <Target :size="20" aria-hidden="true" />
              <h2>{{ t("brews.plan.recipe_targets") }}</h2>
              <ChevronDown
                :size="16"
                class="sidebar-chevron ml-auto shrink-0"
                aria-hidden="true"
              />
            </summary>
            <dl class="recipe-targets">
              <div class="recipe-gravity">
                <dt>{{ t("brews.plan.og_range") }}</dt>
                <dd>
                  {{
                    gravityRange(recipe.defaults?.ogFrom, recipe.defaults?.ogTo)
                  }}
                </dd>
              </div>
              <div class="recipe-gravity">
                <dt>{{ t("brews.plan.fg_range") }}</dt>
                <dd>
                  {{
                    gravityRange(recipe.defaults?.fgFrom, recipe.defaults?.fgTo)
                  }}
                </dd>
              </div>
              <div>
                <dt>{{ t("recipes.metrics.ibu") }}</dt>
                <dd>{{ number(recipe.defaults?.ibu) }}</dd>
              </div>
              <div>
                <dt>{{ t("recipes.metrics.co2") }}</dt>
                <dd>{{ number(recipe.defaults?.co2Volumes) }}</dd>
              </div>
              <div>
                <dt>{{ t("recipes.fields.color") }}</dt>
                <dd>{{ recipe.color || "—" }}</dd>
              </div>
            </dl>
          </details>
          <details
            class="recipe-side-panel"
            :open="costOpen"
            @toggle="costOpen = $event.currentTarget.open"
          >
            <summary>
              <Coins :size="20" class="shrink-0" aria-hidden="true" />
              <h2>
                {{
                  t(
                    summary.costComplete
                      ? "recipes.detail.cost_summary"
                      : "recipes.presentation.recorded_cost",
                  )
                }}
              </h2>
              <ChevronDown
                :size="16"
                class="sidebar-chevron ml-auto shrink-0"
                aria-hidden="true"
              />
            </summary>
            <div class="mt-5">
              <p class="text-2xl font-bold tabular-nums">
                {{ formatCurrency(summary.totalCost) }}
              </p>
              <p class="mt-1 text-sm text-text2-faded">
                {{ formatCurrency(summary.literPrice) }} / L
              </p>
              <p class="mt-4 text-xs leading-relaxed text-text2-faded">
                {{
                  t("recipes.presentation.priced_count", {
                    priced: summary.pricedCount,
                    total: summary.ingredientCount,
                  })
                }}
              </p>
            </div>
          </details>
          <a
            v-if="sourceUrl"
            :href="sourceUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="recipe-source"
            >{{ t("recipes.import.source")
            }}<ArrowUpRight :size="16" aria-hidden="true"
          /></a>
        </aside>
      </div>
    </template>
  </section>
</template>
<script setup>
import { brewTitle } from "@/utils/brewPhase.js";
import { computed, onBeforeUnmount, onMounted, ref, watch, useId } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import BaseCard from "@/components/base/BaseCard.vue";
import BaseButton from "@/components/base/BaseButton.vue";
import BaseDropdown from "@/components/base/BaseDropdown.vue";

import {
  ArrowLeft,
  ArrowUpRight,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Clock3,
  Coins,
  Copy,
  EllipsisVertical,
  Flame,
  History,
  Leaf,
  ListOrdered,
  Pencil,
  Percent,
  Plus,
  Target,
  Trash2,
  Beaker,
} from "lucide-vue-next";

import RecipeMethodStep from "@/components/recipes/RecipeMethodStep.vue";
import RecipeIngredientsList from "@/components/recipes/RecipeIngredientsList.vue";
import { recipeDetailSummary } from "@/utils/recipeDetailSummary.js";
import { stepPhase } from "@/utils/brewPhase.js";
import BaseStarRating from "@/components/base/BaseStarRating.vue";
import {
  deleteRecipeFamily,
  deleteRecipeVersion,
  getRecipe,
  listRecipeBrews,
  listRecipeVersions,
} from "@/services/recipes.service.js";
import { resolveRecipeIconPath } from "@/utils/recipeAssets.js";

const route = useRoute();
const router = useRouter();
const { t, locale } = useI18n();
const loading = ref(true);
const error = ref("");
const recipe = ref(null);

const versionDocs = ref([]);
const selectedVersionId = ref("");
const deletingVersion = ref(false);
const deletingFamily = ref(false);
const activePanel = ref("steps");
const actionMenuOpen = ref(false);
const actionMenuRoot = ref(null);
const brewHistory = ref([]);
const loadingBrewHistory = ref(false);
const brewHistoryError = ref("");

const panelTabs = computed(() => [
  { label: t("recipes.detail.steps"), value: "steps", icon: ListOrdered },
  { label: t("recipes.detail.ingredients"), value: "ingredients", icon: Leaf },
  {
    label: t("recipes.presentation.history_tab"),
    value: "brews",
    icon: History,
  },
]);

function runMenuAction(action) {
  actionMenuOpen.value = false;
  return action();
}

function handleDocumentClick(event) {
  if (!actionMenuOpen.value) return;
  const root = actionMenuRoot.value;
  if (!root) return;
  if (event?.target instanceof Node && !root.contains(event.target)) {
    actionMenuOpen.value = false;
  }
}

// The rating shown at the top is the one for the version currently being
// viewed - the average of every brew made from it.
const activeVersionRating = computed(() => {
  const rating = recipe.value?.rating;
  return {
    average: Number.isFinite(Number(rating?.average))
      ? Number(rating.average)
      : null,
    count: Number(rating?.count) || 0,
  };
});

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString(locale.value === "no" ? "nb-NO" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

async function loadBrewHistory(recipeId, sequence = loadSequence) {
  loadingBrewHistory.value = true;
  brewHistoryError.value = "";
  try {
    const items = await listRecipeBrews(recipeId);
    if (sequence === loadSequence)
      brewHistory.value = Array.isArray(items) ? items : [];
  } catch (err) {
    if (sequence === loadSequence)
      brewHistoryError.value =
        err?.response?.data?.error ||
        err?.message ||
        t("recipes.errors.fetch_failed");
  } finally {
    if (sequence === loadSequence) loadingBrewHistory.value = false;
  }
}

const resolvedImageSrc = computed(() => {
  const url = recipe.value?.imageUrl;
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  const base = window.env?.VITE_API_URL || "http://localhost:3000";
  return `${base}${url}`;
});

const recipeIcon = computed(() =>
  resolveRecipeIconPath(recipe.value?.iconPath),
);

const summary = computed(() => recipeDetailSummary(recipe.value || {}));
const number = (value) =>
  value == null || value === "" || !Number.isFinite(Number(value))
    ? "—"
    : new Intl.NumberFormat(locale.value === "no" ? "nb-NO" : locale.value, {
        maximumFractionDigits: 2,
      }).format(Number(value));
const abvText = computed(() => {
  const range = summary.value.abv;
  if (!range) return "—";
  const format = (value) =>
    new Intl.NumberFormat(locale.value === "no" ? "nb-NO" : locale.value, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  return `${format(range.min)}${Math.abs(range.max - range.min) < 0.005 ? "" : `–${format(range.max)}`} %`;
});
const stats = computed(() => [
  {
    icon: Beaker,
    label: t("recipes.fields.batch_size_liters"),
    value: summary.value.volume ? `${number(summary.value.volume)} L` : "—",
  },
  {
    icon: Percent,
    label: t("recipes.presentation.abv_estimate"),
    value: abvText.value,
  },
  {
    icon: Clock3,
    label: t("brews.plan.total_mash"),
    value: `${number(summary.value.mashMinutes)} ${t("recipes.detail.minutes")}`,
  },
  {
    icon: Flame,
    label: t("brews.plan.total_boil"),
    value: `${number(summary.value.boilMinutes)} ${t("recipes.detail.minutes")}`,
  },
]);
const sourceUrl = computed(() =>
  /^https?:\/\//i.test(recipe.value?.sourceUrl || "")
    ? recipe.value.sourceUrl
    : "",
);
const gravityRange = (from, to) => `${from || "—"} – ${to || "—"}`;
const versionOptions = computed(() =>
  (versionDocs.value.length
    ? versionDocs.value
    : recipe.value
      ? [recipe.value]
      : []
  ).map((doc) => ({
    value: doc._id,
    label: [
      `v${doc.version || 1}`,
      doc.isLatest ? t("recipes.detail.latest") : "",
      doc.updatedAt ? formatDate(doc.updatedAt) : "",
    ]
      .filter(Boolean)
      .join(" · "),
  })),
);
const actionError = ref("");
const versionError = ref("");
const actionButton = ref(null);
const tabsRoot = ref(null);
const ids = useId();
const wideMedia = window.matchMedia("(min-width: 900px)");
const targetsOpen = ref(wideMedia.matches),
  costOpen = ref(wideMedia.matches);
function updateSidebar(event) {
  targetsOpen.value = event.matches;
  costOpen.value = event.matches;
}
function onEscape(event) {
  if (event.key === "Escape" && actionMenuOpen.value) {
    actionMenuOpen.value = false;
    actionButton.value?.focus();
  }
}
function tabKeydown(event) {
  if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
  event.preventDefault();
  const values = panelTabs.value.map((tab) => tab.value),
    index = values.indexOf(activePanel.value);
  const next =
    event.key === "Home"
      ? 0
      : event.key === "End"
        ? values.length - 1
        : (index + (event.key === "ArrowRight" ? 1 : -1) + values.length) %
          values.length;
  activePanel.value = values[next];
  tabsRoot.value?.querySelectorAll("button")[next]?.focus();
}
let loadSequence = 0;
function formatCurrency(value) {
  if (value == null) return "—";
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "—";
  const localeCode = locale.value === "no" ? "nb-NO" : "en-US";
  return new Intl.NumberFormat(localeCode, {
    style: "currency",
    currency: "NOK",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

async function loadRecipe() {
  const sequence = ++loadSequence;
  loading.value = true;
  error.value = "";
  actionError.value = "";
  versionError.value = "";
  actionMenuOpen.value = false;
  versionDocs.value = [];
  brewHistory.value = [];
  activePanel.value = "steps";
  try {
    const doc = await getRecipe(route.params.recipeId);
    if (sequence !== loadSequence) return;
    recipe.value = doc;
    selectedVersionId.value = doc._id;
    loading.value = false;
    await Promise.all([
      loadVersions(doc._id, sequence),
      loadBrewHistory(doc._id, sequence),
    ]);
  } catch (err) {
    if (sequence === loadSequence)
      error.value =
        err?.response?.data?.error ||
        err?.message ||
        t("recipes.errors.fetch_failed");
  } finally {
    if (sequence === loadSequence) loading.value = false;
  }
}
async function loadVersions(recipeId, sequence = loadSequence) {
  versionError.value = "";
  try {
    const docs = await listRecipeVersions(recipeId);
    if (sequence === loadSequence)
      versionDocs.value = Array.isArray(docs) ? docs : [];
  } catch (err) {
    if (sequence === loadSequence)
      versionError.value = t("recipes.presentation.versions_failed");
  }
}

async function switchVersion(recipeId) {
  if (!recipeId || String(recipeId) === String(route.params.recipeId)) return;
  await router.push(`/oppskrifter/${recipeId}`);
}

function nextVersionAfterDelete(currentId) {
  const remaining = (versionDocs.value || []).filter(
    (versionDoc) => String(versionDoc?._id || "") !== String(currentId || ""),
  );
  if (!remaining.length) return null;
  const latest = remaining.find((versionDoc) => versionDoc?.isLatest);
  if (latest?._id) return latest;
  return [...remaining].sort(
    (a, b) => Number(b?.version || 1) - Number(a?.version || 1),
  )[0];
}

async function deleteCurrentVersion() {
  if (!recipe.value?._id) return;
  const version = recipe.value?.version || 1;
  const confirmed = window.confirm(
    t("recipes.detail.confirm_delete_version", { version }),
  );
  if (!confirmed) return;

  deletingVersion.value = true;
  actionError.value = "";
  try {
    const currentId = recipe.value._id;
    const nextVersion = nextVersionAfterDelete(currentId);
    await deleteRecipeVersion(currentId);
    if (!nextVersion?._id) {
      await router.push("/oppskrifter");
      return;
    }
    await router.push(`/oppskrifter/${nextVersion._id}`);
  } catch (err) {
    actionError.value =
      err?.response?.data?.error ||
      err?.message ||
      t("recipes.errors.update_failed");
  } finally {
    deletingVersion.value = false;
  }
}

async function deleteAllVersions() {
  if (!recipe.value?._id) return;
  const confirmed = window.confirm(t("recipes.detail.confirm_delete_recipe"));
  if (!confirmed) return;

  deletingFamily.value = true;
  actionError.value = "";
  try {
    await deleteRecipeFamily(recipe.value._id);
    await router.push("/oppskrifter");
  } catch (err) {
    actionError.value =
      err?.response?.data?.error ||
      err?.message ||
      t("recipes.errors.update_failed");
  } finally {
    deletingFamily.value = false;
  }
}

watch(
  () => route.params.recipeId,
  () => {
    loadRecipe();
  },
);

onMounted(() => {
  document.addEventListener("click", handleDocumentClick);
  document.addEventListener("keydown", onEscape);
  wideMedia.addEventListener("change", updateSidebar);
  loadRecipe();
});

onBeforeUnmount(() => {
  loadSequence++;
  document.removeEventListener("click", handleDocumentClick);
  document.removeEventListener("keydown", onEscape);
  wideMedia.removeEventListener("change", updateSidebar);
});
</script>

<style scoped>
.recipe-back {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--color-text2-faded);
}
.recipe-header {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: flex-start;
  gap: 24px;
  margin-top: 24px;
}
.recipe-identity {
  display: flex;
  gap: 18px;
  align-items: center;
  flex: 1;
  min-width: 240px;
}
.recipe-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}
.recipe-menu-root {
  position: relative;
}
.recipe-plan,
.recipe-edit {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 8px 12px;
  font-size: 14px;
  font-weight: 600;
  border: 1px solid;
  border-radius: 8px;
}
.recipe-plan {
  background: var(--color-button1);
  color: var(--color-text4);
  border-color: var(--color-button1-border);
}
.recipe-plan:hover {
  background: var(--color-button1-hover);
}
.recipe-edit {
  background: var(--color-button3);
  color: var(--color-button3-meta);
  border-color: var(--color-button3-border);
}
.recipe-edit:hover {
  background: var(--color-button3-hover);
}
.recipe-menu-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 38px;
  border-radius: 6px;
}
.recipe-menu-button:hover {
  background: var(--color-bg2);
}
.recipe-action-menu {
  position: absolute;
  top: 100%;
  right: 0;
  z-index: 30;
  margin-top: 8px;
  padding: 6px;
  width: 235px;
  max-width: calc(100vw - 32px);
  border: 1px solid var(--color-border3);
  border-radius: 12px;
  background: var(--color-bg2);
  color: var(--color-text2);
  box-shadow: 0 8px 24px var(--color-overlay);
}
.recipe-action-menu > * {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 11px;
  text-align: left;
  font-size: 13px;
  border-radius: 7px;
}
.recipe-action-menu > *:hover {
  background: var(--color-bg4);
  color: var(--color-text4);
}
.recipe-action-menu button {
  border-top: 1px solid var(--color-border3);
}
.recipe-action-menu button:disabled {
  opacity: 0.4;
}
.recipe-stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  background: var(--color-bg2);
  color: var(--color-text2);
  border: 1px solid var(--color-border3);
  border-radius: 12px;
  margin-block: 26px 20px;
}
.recipe-stats > div {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px;
}
.recipe-stats > div + div {
  border-left: 1px solid var(--color-border3);
}
.recipe-flavor {
  margin-bottom: 26px;
  max-width: 70rem;
}
.recipe-workspace {
  display: grid;
  grid-template-columns: minmax(0, 2.15fr) minmax(270px, 1fr);
  gap: 20px;
  align-items: start;
}
.recipe-content {
  border: 1px solid var(--color-border3);
  border-radius: 12px;
}
.recipe-tabs {
  display: flex;
  border-bottom: 1px solid var(--color-border3);
  padding: 0 12px;
}
.recipe-tabs button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  padding: 16px 12px 13px;
  border-bottom: 3px solid transparent;
  color: var(--color-text2-faded);
  font-size: 14px;
}
.recipe-tabs button[aria-selected="true"] {
  color: var(--color-text1);
  border-bottom-color: var(--color-button2);
  font-weight: 700;
}
.recipe-tabs button:hover {
  color: var(--color-text1);
}
.recipe-tab-content {
  padding: 20px;
}
.recipe-side-panel {
  padding: 20px;
  border: 1px solid var(--color-border3);
  border-radius: 12px;
}
.recipe-side-panel > summary {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  list-style: none;
}
.recipe-side-panel > summary::-webkit-details-marker {
  display: none;
}
.recipe-side-panel h2 {
  font-size: 16px;
  line-height: 1.4;
}
.recipe-side-panel[open] .sidebar-chevron {
  transform: rotate(180deg);
}
.recipe-targets {
  margin-top: 16px;
}
.recipe-targets > div {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid var(--color-border3);
  font-size: 13px;
}
.recipe-targets > div:last-child {
  border-bottom: 0;
  padding-bottom: 0;
}
.recipe-targets dt {
  color: var(--color-text2-faded);
}
.recipe-targets dd {
  text-align: right;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  overflow-wrap: anywhere;
}
.recipe-targets .recipe-gravity {
  flex-wrap: wrap;
  gap: 6px;
}
.recipe-gravity dd {
  width: 100%;
  text-align: left;
  font-size: 16px;
}
.recipe-source {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 4px;
  text-decoration: underline;
  font-size: 13px;
}
.recipe-history-row {
  display: flex;
  gap: 16px;
  align-items: center;
  padding: 18px 0;
  border-bottom: 1px solid var(--color-border3);
}
.recipe-history-row:hover {
  text-decoration: underline;
}
button:focus-visible,
a:focus-visible,
summary:focus-visible {
  outline: 2px solid var(--color-text1);
  outline-offset: 4px;
  border-radius: 6px;
}
@media (max-width: 900px) {
  .recipe-workspace {
    grid-template-columns: minmax(0, 1fr);
  }
  .recipe-sidebar {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 16px;
  }
  .recipe-sidebar > * {
    margin-top: 0;
  }
  .recipe-stats > div {
    padding: 16px;
    gap: 10px;
  }
}
@media (max-width: 640px) {
  .recipe-header {
    gap: 20px;
  }
  .recipe-identity {
    min-width: 0;
    width: 100%;
  }
  .recipe-actions {
    width: 100%;
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 10px;
  }
  .recipe-plan {
    grid-column: 1 / 2;
  }
  .recipe-menu-root {
    grid-column: 2;
    grid-row: 1;
  }
  .recipe-edit {
    grid-column: 1 / -1;
  }
  .recipe-stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .recipe-stats > div:nth-child(3) {
    border-left: 0;
  }
  .recipe-stats > div:nth-child(n + 3) {
    border-top: 1px solid var(--color-border3);
  }
  .recipe-stats > div {
    gap: 10px;
    padding: 16px 12px;
  }
  .recipe-stats strong {
    font-size: 16px;
  }
  .recipe-tabs {
    padding: 0 6px;
  }
  .recipe-tabs button {
    flex: 1;
    padding: 14px 5px 11px;
    gap: 5px;
    font-size: 12px;
  }
  .recipe-tabs button svg {
    width: 15px;
  }
  .recipe-tab-content {
    padding: 16px 12px;
  }
  .recipe-sidebar {
    display: block;
  }
  .recipe-sidebar > * + * {
    margin-top: 16px;
  }
}
@media (prefers-reduced-motion: reduce) {
  * {
    scroll-behavior: auto;
  }
}
@media (max-width: 380px) {
  .recipe-stats > div {
    padding: 14px 10px;
    gap: 7px;
  }
  .recipe-stats svg {
    width: 18px;
    height: 18px;
  }
  .recipe-stats strong {
    font-size: 14px;
    white-space: nowrap;
  }
}
</style>
