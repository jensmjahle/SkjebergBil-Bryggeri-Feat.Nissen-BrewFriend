<template>
  <section class="mx-auto w-full max-w-6xl px-4 py-2 md:py-8 space-y-2 md:space-y-6">
    <BaseCard class="overflow-hidden">
      <div class="grid gap-6 md:grid-cols-[220px_1fr] md:items-center">
        <div class="flex justify-center md:justify-start">
          <img
            src="/assets/logo.png"
            alt="GuttaBrew logo"
            class="h-32 w-auto object-contain md:h-36"
          />
        </div>
        <div class="space-y-3">
          <h1 class="text-3xl font-extrabold sm:text-4xl">{{ t("home.title") }}</h1>
          <p class="text-sm opacity-80 sm:text-base">{{ t("home.subtitle") }}</p>
        </div>
      </div>
    </BaseCard>

    <BaseCard v-if="loading">
      <p>{{ t("common.loading") }}</p>
    </BaseCard>

    <BaseCard v-else-if="error">
      <p class="text-[var(--color-error-text,var(--color-danger))]">{{ error }}</p>
    </BaseCard>

    <template v-else>
      <div class="space-y-4">
        <div class="flex items-center justify-between gap-3"><h2>{{ featuredBrew ? t("home.main_action_title") : t("home.start_brew_cta") }}</h2><router-link to="/brygg/nytt"><BaseButton>{{ t("brews.actions.new_brew") }}</BaseButton></router-link></div>
        <BrewRow v-if="featuredBrew" :brew="featuredBrew" class="featured-brew" />
        <router-link v-else to="/brygg/nytt"><BaseButton class="w-full py-5">{{ t("home.start_brew_cta") }}</BaseButton></router-link>
        <template v-if="otherActiveBrews.length">
          <h3 class="pt-2">{{ t("brews.phase.active_brews") }}</h3>
          <div class="space-y-3"><BrewRow v-for="brew in otherActiveBrews" :key="brew._id" :brew="brew" /></div>
        </template>
      </div>

      <BaseCard>
        <h3>{{ t("home.quick_actions") }}</h3>
        <div class="mt-4 grid gap-3 md:grid-cols-2">
          <router-link to="/oppskrifter" class="group block">
            <div class="quick-action rounded-2xl border border-border3 bg-bg4 p-4 transition-all group-hover:-translate-y-0.5 group-hover:border-button2-border">
              <div class="flex items-center gap-3">
                <img src="/icons/157-book.png" alt="Oppskriftsboka" class="h-12 w-12 shrink-0 object-contain" />
                <div class="min-w-0">
                  <p class="truncate text-base font-semibold">{{ t("navbar.user.items.recipes") }}</p>
                  <p class="text-sm opacity-75">Oppskriftsboka</p>
                </div>
              </div>
              <p class="mt-3 text-sm opacity-80">{{ recipeCount }} oppskrifter</p>
            </div>
          </router-link>

          <router-link to="/brygg/tidligere" class="group block">
            <div class="quick-action rounded-2xl border border-border3 bg-bg4 p-4 transition-all group-hover:-translate-y-0.5 group-hover:border-button3-border">
              <div class="flex items-center gap-3">
                <img src="/icons/115-international-beer-day-1.png" alt="Alle brygg" class="h-12 w-12 shrink-0 object-contain" />
                <div class="min-w-0">
                  <p class="truncate text-base font-semibold">{{ t("navbar.user.items.previous_brews") }}</p>
                  <p class="text-sm opacity-75">Alle brygga</p>
                </div>
              </div>
              <p class="mt-3 text-sm opacity-80">{{ brewCount }} brygg totalt</p>
            </div>
          </router-link>
        </div>

        <div class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <router-link v-for="action in quickActions" :key="action.to" :to="action.to">
            <BaseButton class="w-full" :variant="action.variant">{{ action.label }}</BaseButton>
          </router-link>
        </div>
      </BaseCard>

      <BaseCard>
        <h3>{{ t("home.overview_title") }}</h3>
        <div class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div class="rounded-lg border border-border3 p-3">
            <p class="text-xs uppercase tracking-wide opacity-70">{{ t("home.stats.recipes") }}</p>
            <p class="mt-1 text-2xl font-bold">{{ recipeCount }}</p>
          </div>
          <div class="rounded-lg border border-border3 p-3">
            <p class="text-xs uppercase tracking-wide opacity-70">{{ t("home.stats.brews") }}</p>
            <p class="mt-1 text-2xl font-bold">{{ brewCount }}</p>
          </div>
          <div class="rounded-lg border border-border3 p-3">
            <p class="text-xs uppercase tracking-wide opacity-70">{{ t("home.stats.active") }}</p>
            <p class="mt-1 text-2xl font-bold">{{ activeCount }}</p>
          </div>
          <div class="rounded-lg border border-border3 p-3">
            <p class="text-xs uppercase tracking-wide opacity-70">{{ t("home.stats.planned") }}</p>
            <p class="mt-1 text-2xl font-bold">{{ plannedCount }}</p>
          </div>
        </div>
      </BaseCard>
    </template>
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import BrewRow from "@/components/brews/BrewRow.vue";
import { brewPriority } from "@/utils/brewPhase.js";
import BaseCard from "@/components/base/BaseCard.vue";
import BaseButton from "@/components/base/BaseButton.vue";
import { listBrews } from "@/services/brews.service.js";
import { listRecipes } from "@/services/recipes.service.js";

const { t } = useI18n();

const loading = ref(true);
const error = ref("");
const brews = ref([]);
const recipeCount = ref(0);

const brewCount = computed(() => brews.value.length);
const activeCount = computed(
  () =>
    brews.value.filter(
      (brew) => brew?.status === "active" || brew?.status === "conditioning",
    ).length,
);
const plannedCount = computed(
  () => brews.value.filter((brew) => brew?.status === "planned").length,
);

const processBrews = computed(() => brews.value.filter(b => ["active", "conditioning", "planned"].includes(b.status)).sort((a, b) => brewPriority(a) - brewPriority(b) || new Date(b.updatedAt) - new Date(a.updatedAt)));
const featuredBrew = computed(() => processBrews.value[0] || null);
const otherActiveBrews = computed(() => processBrews.value.slice(1).filter(b => b.status !== "planned"));

const quickActions = computed(() => [
  { to: "/brygg/nytt", label: t("navbar.user.items.new_brew"), variant: "button1" },
  { to: "/oppskrifter/ny", label: t("navbar.user.items.new_recipe"), variant: "button3" },
  { to: "/verktoy/alkoholmaler", label: t("navbar.user.items.alcohol_calc"), variant: "button3" },
  { to: "/verktoy/co2-volumer", label: t("navbar.user.items.co2_volumes"), variant: "button3" },
  { to: "/verktoy/saftblanding", label: t("navbar.user.items.cordial_mix"), variant: "button3" },
]);

async function loadHomeData() {
  loading.value = true;
  error.value = "";
  try {
    const [allBrews, recipes] = await Promise.all([
      listBrews(),
      listRecipes(),
    ]);
    brews.value = Array.isArray(allBrews) ? allBrews : [];
    recipeCount.value = Array.isArray(recipes) ? recipes.length : 0;
  } catch (err) {
    error.value = err?.response?.data?.error || err?.message || t("brews.errors.fetch_failed");
  } finally {
    loading.value = false;
  }
}

onMounted(loadHomeData);
</script>

<style scoped>
.featured-brew { padding-block: 2rem; }
.featured-brew :deep(h3) { font-size: 1.5rem; }
.quick-action, .quick-action p { color: var(--color-text4); }
</style>
