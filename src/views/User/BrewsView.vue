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

    <BaseCard v-if="currentBrew" class="space-y-3">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p class="text-sm uppercase tracking-wide opacity-70">{{ t("brews.list.current_brew") }}</p>
          <h3>{{ currentBrew.name }}</h3>
        </div>
        <router-link :to="brewRoute(currentBrew)">
          <BaseButton variant="button2">{{ t("brews.actions.continue") }}</BaseButton>
        </router-link>
      </div>
    </BaseCard>

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

    <div v-if="error" class="rounded-xl border border-danger-border bg-danger p-4 text-text1">
      {{ error }}
    </div>

    <BaseCard>
      <p class="text-sm opacity-80">{{ t("brews.list.found", { count: brews.length }) }}</p>
    </BaseCard>

    <div v-if="!loading && !brews.length" class="rounded-xl border border-dashed border-border3 p-8 text-center opacity-70">
      {{ t("brews.list.empty") }}
    </div>

    <div v-else class="grid gap-4 md:grid-cols-2">
      <BaseCard v-for="brew in brews" :key="brew._id" class="space-y-3">
        <div class="flex items-start justify-between gap-3">
          <div>
            <h3>{{ brew.name }}</h3>
            <p class="text-sm opacity-75">{{ brew.recipeSnapshot?.name || t("brews.common.no_recipe") }}</p>
          </div>
          <span class="rounded-full bg-bg4 px-2 py-1 text-xs">{{ statusLabel(brew.status) }}</span>
        </div>

        <div class="grid gap-1 text-sm opacity-85">
          <p>{{ t("brews.fields.updated") }}: {{ formatDateTime(brew.updatedAt) }}</p>
          <p>{{ t("brews.fields.steps") }}: {{ brew.recipeSnapshot?.steps?.length || 0 }}</p>
          <p v-if="brew.currentStep">{{ t("brews.fields.current_step") }}: {{ brew.currentStep.title }}</p>
        </div>

        <div class="flex flex-wrap gap-2">
          <router-link :to="brewRoute(brew)">
            <BaseButton>{{ brew.status === "planned" ? t("brews.actions.open_plan") : t("brews.actions.open_brew") }}</BaseButton>
          </router-link>
          <router-link v-if="brew.status === 'planned'" :to="`/brygg/${brew._id}`">
            <BaseButton variant="button3">{{ t("brews.actions.open_live") }}</BaseButton>
          </router-link>
        </div>
      </BaseCard>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import BaseCard from "@/components/base/BaseCard.vue";
import BaseButton from "@/components/base/BaseButton.vue";
import BaseInput from "@/components/base/BaseInput.vue";
import BaseDropdown from "@/components/base/BaseDropdown.vue";
import { getCurrentBrew, listBrews } from "@/services/brews.service.js";

const { t } = useI18n();
const loading = ref(false);
const error = ref("");
const brews = ref([]);
const search = ref("");
const statusFilter = ref("all");
const currentBrew = ref(null);

const statusOptions = computed(() => [
  { label: t("common.all"), value: "all" },
  { label: t("brews.status.planned"), value: "planned" },
  { label: t("brews.status.active"), value: "active" },
  { label: t("brews.status.conditioning"), value: "conditioning" },
  { label: t("brews.status.completed"), value: "completed" },
  { label: t("brews.status.archived"), value: "archived" },
]);

function brewRoute(brew) {
  if (brew?.status === "planned") return `/brygg/${brew._id}/planlegging`;
  return `/brygg/${brew._id}`;
}

function statusLabel(status) {
  return t(`brews.status.${status || "planned"}`);
}

function formatDateTime(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString();
}

async function loadCurrent() {
  try {
    currentBrew.value = await getCurrentBrew();
  } catch (_err) {
    currentBrew.value = null;
  }
}

async function loadBrews() {
  loading.value = true;
  error.value = "";
  try {
    const params = {
      q: search.value || undefined,
      status: statusFilter.value && statusFilter.value !== "all" ? statusFilter.value : undefined,
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

onMounted(async () => {
  await Promise.all([loadCurrent(), loadBrews()]);
});
</script>
