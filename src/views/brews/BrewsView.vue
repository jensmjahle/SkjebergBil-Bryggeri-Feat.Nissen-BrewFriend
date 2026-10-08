<template>
  <section class="mx-auto w-full max-w-6xl px-4 py-8 space-y-6">
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1>{{ t("brews.list.title") }}</h1>
        <p class="mt-2 opacity-80">{{ t("brews.list.subtitle") }}</p>
      </div>
      <router-link to="/brygg/nytt">
        <BaseButton>{{ t("brews.actions.new_brew") }}</BaseButton>
      </router-link>
    </div>

    <BaseCard>
      <form class="grid gap-3 md:grid-cols-3" @submit.prevent="loadBrews">
        <BaseInput v-model="search" :label="t('recipes.filters.search')" :placeholder="t('brews.list.search_placeholder')" />
        <BaseDropdown
          v-model="statusFilter"
          :label="t('brews.fields.status')"
          :options="statusOptions"
          :placeholder="t('common.all')"
        />
        <div class="flex items-end gap-2">
          <BaseButton type="submit" :disabled="loading">{{ loading ? t("common.loading") : t("common.search") }}</BaseButton>
          <BaseButton type="button" variant="button3" :disabled="loading" @click="reset">{{ t("common.reset") }}</BaseButton>
        </div>
      </form>
    </BaseCard>

    <div class="flex flex-wrap gap-2">
      <BaseButton
        v-for="option in quickFilters"
        :key="option.value"
        type="button"
        :variant="statusFilter === option.value ? 'button1' : 'button3'"
        :aria-pressed="statusFilter === option.value"
        @click="statusFilter = option.value"
      >{{ option.label }}</BaseButton>
    </div>

    <div v-if="error" class="rounded-xl border border-danger-border bg-danger p-4 text-white">
      {{ error }}
    </div>

    <p class="text-sm opacity-70">{{ t("brews.list.found", { count: visibleBrews.length }) }}</p>

    <div v-if="!loading && !visibleBrews.length" class="rounded-xl border border-dashed border-border3 p-8 text-center opacity-70">
      {{ t("brews.list.empty") }}
    </div>

    <div v-else class="space-y-3">
      <BrewRow v-for="brew in visibleBrews" :key="brew._id" :brew="brew" />
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import BrewRow from "@/components/brews/BrewRow.vue";
import { PHASES, brewPhase, phaseLabel } from "@/utils/brewPhase.js";
import BaseCard from "@/components/base/BaseCard.vue";
import BaseButton from "@/components/base/BaseButton.vue";
import BaseInput from "@/components/base/BaseInput.vue";
import BaseDropdown from "@/components/base/BaseDropdown.vue";
import { listBrews } from "@/services/brews.service.js";

const { t } = useI18n();
const loading = ref(false);
const error = ref("");
const brews = ref([]);
const search = ref("");
const statusFilter = ref("all");
const brewDayPhases = new Set(["preparation", "mash", "sparge", "boil"]);
const quickFilters = computed(() => [
  { label: t("common.all"), value: "all" },
  { label: t("brews.status.completed"), value: "completed" },
  { label: t("brews.status.planned"), value: "planned" },
  { label: phaseLabel("primary_fermentation", t), value: "primary_fermentation" },
  { label: phaseLabel("conditioning", t), value: "conditioning" },
  { label: t("brews.list.brew_day_filter"), value: "brew_day" },
]);

const visibleBrews = computed(() => brews.value
  .filter(b => statusFilter.value === "all" || (statusFilter.value === "brew_day"
    ? brewDayPhases.has(brewPhase(b))
    : brewPhase(b) === statusFilter.value))
  .sort((a, b) => (b.batchNumber ?? 0) - (a.batchNumber ?? 0)));
const statusOptions = computed(() => [
  { label: t("common.all"), value: "all" },
  { label: t("brews.list.brew_day_filter"), value: "brew_day" },
  { label: t("brews.status.planned"), value: "planned" },
  ...PHASES.map(value => ({ value, label: phaseLabel(value, t) })),
  { label: t("brews.status.completed"), value: "completed" },
  { label: t("brews.status.archived"), value: "archived" },
]);

async function loadBrews() {
  loading.value = true;
  error.value = "";
  try {
    const params = {
      q: search.value || undefined,
    };
    brews.value = await listBrews(params);
  } catch (err) {
    error.value = err?.response?.data?.error || err?.message || t("brews.errors.fetch_failed");
  } finally {
    loading.value = false;
  }
}

async function reset() {
  search.value = "";
  statusFilter.value = "all";
  await loadBrews();
}

onMounted(loadBrews);
</script>
