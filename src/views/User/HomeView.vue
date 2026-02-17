<template>
  <section class="mx-auto w-full max-w-6xl px-4 py-8 space-y-6">
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
      <p class="text-red-600">{{ error }}</p>
    </BaseCard>

    <template v-else>
      <BaseCard class="space-y-3">
        <h3>{{ t("home.main_action_title") }}</h3>
        <router-link v-if="featuredBrew" :to="featuredBrewRoute" class="block">
          <BaseButton class="w-full py-4 text-lg sm:text-xl" variant="button1">
            {{ t("home.continue_brew_cta", { name: featuredBrew.name }) }}
          </BaseButton>
        </router-link>
        <router-link v-else to="/brygg/nytt" class="block">
          <BaseButton class="w-full py-4 text-lg sm:text-xl" variant="button1">
            {{ t("home.start_brew_cta") }}
          </BaseButton>
        </router-link>
        <p v-if="featuredBrew" class="text-sm opacity-80">
          {{ t("home.current_status") }}: {{ statusLabel(featuredBrew.status) }}
        </p>
      </BaseCard>

      <BaseCard>
        <h3>{{ t("home.quick_actions") }}</h3>
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
import BaseCard from "@/components/base/BaseCard.vue";
import BaseButton from "@/components/base/BaseButton.vue";
import { getCurrentBrew, listBrews } from "@/services/brews.service.js";
import { listRecipes } from "@/services/recipes.service.js";

const { t } = useI18n();

const loading = ref(true);
const error = ref("");
const currentBrew = ref(null);
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

const featuredBrew = computed(() => {
  if (!currentBrew.value) return null;
  const status = currentBrew.value.status;
  if (status === "planned" || status === "active" || status === "conditioning") {
    return currentBrew.value;
  }
  return null;
});

const featuredBrewRoute = computed(() => {
  if (!featuredBrew.value?._id) return "/brygg/nytt";
  if (featuredBrew.value.status === "planned") {
    return `/brygg/${featuredBrew.value._id}/planlegging`;
  }
  return `/brygg/${featuredBrew.value._id}`;
});

const quickActions = computed(() => [
  { to: "/brygg/nytt", label: t("navbar.user.items.new_brew"), variant: "button1" },
  { to: "/brygg/tidligere", label: t("navbar.user.items.previous_brews"), variant: "button3" },
  { to: "/oppskrifter", label: t("navbar.user.items.recipes"), variant: "button2" },
  { to: "/oppskrifter/ny", label: t("navbar.user.items.new_recipe"), variant: "button3" },
  { to: "/verktoy/alkoholmaler", label: t("navbar.user.items.alcohol_calc"), variant: "button3" },
  { to: "/verktoy/co2-volumer", label: t("navbar.user.items.co2_volumes"), variant: "button3" },
]);

function statusLabel(status) {
  return t(`brews.status.${status || "planned"}`);
}

async function loadHomeData() {
  loading.value = true;
  error.value = "";
  try {
    const [current, allBrews, recipes] = await Promise.all([
      getCurrentBrew(),
      listBrews(),
      listRecipes(),
    ]);
    currentBrew.value = current;
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
