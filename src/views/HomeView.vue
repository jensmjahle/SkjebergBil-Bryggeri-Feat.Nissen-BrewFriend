<template>
  <section class="home-page mx-auto w-full max-w-6xl px-4 py-6 md:py-8">
    <header class="flex flex-col items-start gap-4 sm:flex-row sm:flex-wrap sm:justify-between">
      <div class="min-w-0 w-full space-y-4 sm:w-auto sm:flex-1">
        <img
          src="/assets/logo.png"
          alt="Skjeberg Bil & Bryggeri feat. Nissen"
          width="3000"
          height="597"
          class="h-auto w-72 max-w-full object-contain sm:w-96"
          fetchpriority="high"
        />
        <div>
        <h1 class="text-3xl font-extrabold sm:text-4xl">
          {{ t("home.title") }}
        </h1>
        <p class="mt-2 text-sm text-text2-faded">{{ t("home.subtitle") }}</p>
        </div>
      </div>
      <router-link to="/brygg/nytt"
        ><BaseButton :icon="Plus" variant="button2">{{
          t("home.plan_brew")
        }}</BaseButton></router-link
      >
    </header>
    <div v-if="loading" role="status" class="py-12 text-text2-faded">
      {{ t("common.loading") }}
    </div>
    <BaseCard v-else-if="error" class="mt-6 space-y-3"
      ><p role="alert">{{ error }}</p>
      <BaseButton variant="button3" @click="loadHomeData">{{
        t("home.retry")
      }}</BaseButton></BaseCard
    >
    <template v-else>
      <nav class="home-stats" :aria-label="t('home.overview_title')">
        <router-link v-for="stat in stats" :key="stat.label" :to="stat.to"
          ><component :is="stat.icon" :size="19" aria-hidden="true" /><span
            ><strong>{{ stat.value }}</strong
            ><span>{{ stat.label }}</span></span
          ></router-link
        >
      </nav>
      <section :aria-label="t('home.main_action_title')" class="home-active">
        <div class="mb-4 flex items-center justify-between gap-3">
          <h2>{{ t("home.main_action_title") }}</h2>
          <span class="text-xs text-text2-faded">{{
            t("home.active_count", activeBrews.length)
          }}</span>
        </div>
        <template v-if="featuredBrew">
          <BrewRow
            :brew="featuredBrew"
            class="featured-brew"
            @updated="replaceBrew"
          />
          <router-link
            v-if="featuredNext"
            :to="`/brygg/${featuredBrew._id}`"
            class="home-next"
          >
            <Timer :size="22" class="shrink-0" aria-hidden="true" /><span
              class="min-w-0 flex-1"
              ><span class="block text-xs opacity-70">{{
                t(
                  featuredNext.due
                    ? "brews.boil.add_now"
                    : "brews.boil.next_addition",
                )
              }}</span
              ><strong class="mt-1 block break-words">{{
                featuredNext.names
              }}</strong
              ><span class="mt-1 block text-xs opacity-75">{{
                t(featuredNext.due ? 'home.awaiting_addition' : 'home.until_next', {
                      time: formatBoilClock(featuredNext.remaining),
                    })
              }}<span v-if="featuredNext.paused"> · {{ t('brews.floating_timer.paused') }}</span></span></span
            ><ArrowRight :size="18" class="shrink-0" aria-hidden="true" />
          </router-link>
          <div v-if="otherActiveBrews.length" class="mt-5 space-y-3">
            <h3 class="text-sm">{{ t("home.other_active") }}</h3>
            <BrewRow
              v-for="brew in otherActiveBrews"
              :key="brew._id"
              :brew="brew"
              @updated="replaceBrew"
            />
          </div>
        </template>
        <div v-else class="home-empty">
          <FlaskConical :size="32" class="opacity-60" aria-hidden="true" />
          <div>
            <h3>{{ t("home.no_active") }}</h3>
            <p class="mt-1 text-sm text-text2-faded">
              {{ t("home.no_active_help") }}
            </p>
          </div>
          <router-link to="/brygg/nytt" class="home-text-link"
            >{{ t("home.plan_brew") }}<ArrowRight :size="16" aria-hidden="true"
          /></router-link>
        </div>
      </section>
      <div class="home-columns">
        <section class="home-section" :aria-label="t('home.planned_title')">
          <div class="home-section-heading">
            <h2 class="flex items-center gap-2">
              <CalendarDays :size="20" aria-hidden="true" />{{
                t("home.planned_title")
              }}
            </h2>
            <router-link to="/brygg/tidligere" class="home-text-link"
              >{{ t("home.see_all") }}<ArrowRight :size="14" aria-hidden="true"
            /></router-link>
          </div>
          <ul v-if="plannedBrews.length" class="mt-3">
            <li v-for="brew in plannedBrews.slice(0, 4)" :key="brew._id">
              <router-link
                :to="`/brygg/${brew._id}/planlegging`"
                class="home-plan"
                ><span class="min-w-0 flex-1"
                  ><strong class="block break-words">{{ brew.name }}</strong
                  ><span class="mt-1 block text-xs text-text2-faded">{{
                    [
                      brew.recipeSnapshot?.beerType,
                      brew.recipeSnapshot?.defaults?.batchSizeLiters
                        ? `${brew.recipeSnapshot.defaults.batchSizeLiters} L`
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" · ")
                  }}</span
                  ><span
                    class="mt-2 flex items-center gap-1.5 text-xs text-text2-faded"
                    ><CalendarDays :size="13" aria-hidden="true" />{{
                      plannedDate(brew)
                    }}</span
                  ></span
                ><ChevronRight :size="18" class="shrink-0" aria-hidden="true"
              /></router-link>
            </li>
          </ul>
          <div v-else class="py-7">
            <p class="text-sm text-text2-faded">{{ t("home.no_plans") }}</p>
            <router-link to="/brygg/nytt" class="home-text-link mt-3"
              >{{ t("home.plan_brew")
              }}<ArrowRight :size="16" aria-hidden="true"
            /></router-link>
          </div>
        </section>
        <div class="space-y-4">
          <section class="home-section">
            <div class="home-section-heading">
              <h2 class="flex items-center gap-2">
                <BookOpen :size="20" aria-hidden="true" />{{
                  t("home.recipe_book")
                }}
              </h2>
              <span class="text-xs text-text2-faded">{{
                t("home.recipe_count", recipeCount)
              }}</span>
            </div>
            <router-link to="/oppskrifter" class="home-nav-row"
              ><span
                ><strong class="block">{{
                  t("navbar.user.items.recipes")
                }}</strong
                ><span class="mt-1 block text-xs text-text2-faded">{{
                  t("home.recipes_help")
                }}</span></span
              ><ChevronRight :size="18" aria-hidden="true" /></router-link
            ><router-link to="/oppskrifter/ny" class="home-text-link mt-1"
              ><Plus :size="16" aria-hidden="true" />{{
                t("navbar.user.items.new_recipe")
              }}</router-link
            >
          </section>
          <section class="home-section">
            <div class="home-section-heading">
              <h2 class="flex items-center gap-2">
                <History :size="20" aria-hidden="true" />{{ t("home.history") }}
              </h2>
            </div>
            <router-link to="/brygg/tidligere" class="home-nav-row"
              ><span
                ><strong class="block">{{
                  t("navbar.user.items.previous_brews")
                }}</strong
                ><span class="mt-1 block text-xs text-text2-faded">{{
                  latestCompleted
                    ? t("home.latest_completed", {
                        name: brewTitle(latestCompleted),
                      })
                    : t("home.history_help")
                }}</span></span
              ><ChevronRight :size="18" class="shrink-0" aria-hidden="true"
            /></router-link>
          </section>
        </div>
      </div>
      <section class="home-tools" :aria-label="t('home.tools')">
        <h2 class="flex items-center gap-2">
          <Wrench :size="20" aria-hidden="true" />{{ t("home.tools") }}
        </h2>
        <div class="mt-4 grid gap-3 sm:grid-cols-3">
          <router-link
            v-for="action in quickActions"
            :key="action.to"
            :to="action.to"
            class="home-tool"
            ><component
              :is="action.icon"
              :size="21"
              class="shrink-0 opacity-65"
              aria-hidden="true" /><span
              class="min-w-0 text-sm font-semibold"
              >{{ action.label }}</span
            ><ArrowUpRight
              :size="15"
              class="ml-auto shrink-0 opacity-60"
              aria-hidden="true"
          /></router-link>
        </div>
      </section>
    </template>
  </section>
</template>
<script setup>
import { computed, onMounted, onBeforeUnmount, ref } from "vue";
import { useI18n } from "vue-i18n";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  ChevronRight,
  FlaskConical,
  History,
  Plus,
  Timer,
  Wrench,
  Calculator,
  Droplets,
  GlassWater,
} from "lucide-vue-next";
import BrewRow from "@/components/brews/BrewRow.vue";
import BaseCard from "@/components/base/BaseCard.vue";
import BaseButton from "@/components/base/BaseButton.vue";
import { brewPriority, brewTitle, stepPhase } from "@/utils/brewPhase.js";
import { boilScheduleState, formatBoilClock } from "@/utils/boilSchedule.js";
import { listBrews } from "@/services/brews.service.js";
import { listRecipes } from "@/services/recipes.service.js";
const { t, locale } = useI18n();
const loading = ref(true),
  error = ref(""),
  brews = ref([]),
  recipeCount = ref(0),
  now = ref(Date.now());
let tick;
const activeBrews = computed(() =>
  brews.value
    .filter((b) => ["active", "conditioning"].includes(b.status))
    .sort(
      (a, b) =>
        brewPriority(a) - brewPriority(b) ||
        Date.parse(b.updatedAt || 0) - Date.parse(a.updatedAt || 0),
    ),
);
const featuredBrew = computed(() => activeBrews.value[0] || null);
const otherActiveBrews = computed(() => activeBrews.value.slice(1));
const plannedBrews = computed(() =>
  brews.value
    .filter((b) => b.status === "planned")
    .sort(
      (a, b) =>
        (Date.parse(a.timeline?.plannedStartAt) || Infinity) -
          (Date.parse(b.timeline?.plannedStartAt) || Infinity) ||
        a.name.localeCompare(b.name),
    ),
);
const latestCompleted = computed(
  () =>
    brews.value
      .filter((b) => b.status === "completed")
      .sort(
        (a, b) =>
          Date.parse(b.timeline?.completedAt || b.updatedAt || 0) -
          Date.parse(a.timeline?.completedAt || a.updatedAt || 0),
      )[0],
);
const stats = computed(() => [
  {
    label: t("home.stats.active"),
    value: activeBrews.value.length,
    icon: FlaskConical,
    to: "/brygg/tidligere",
  },
  {
    label: t("home.stats.planned"),
    value: plannedBrews.value.length,
    icon: CalendarDays,
    to: "/brygg/tidligere",
  },
  {
    label: t("home.stats.recipes"),
    value: recipeCount.value,
    icon: BookOpen,
    to: "/oppskrifter",
  },
  {
    label: t("home.stats.brews"),
    value: brews.value.length,
    icon: History,
    to: "/brygg/tidligere",
  },
]);
const featuredNext = computed(() => {
  const brew = featuredBrew.value;
  const entry =
    brew?.progress?.stepProgress?.find((item) => item.status === "active") ||
    brew?.progress?.stepProgress?.find(
      (item) => item.startedAt && item.status !== "completed",
    );
  const step = brew?.recipeSnapshot?.steps?.find(
    (item) => item.stepId === entry?.stepId,
  );
  if (stepPhase(step) !== "boil") return null;
  const paused = entry.status !== "active";
  const remaining = paused
    ? Number(entry.pausedRemainingSeconds ?? Number(step.durationMinutes) * 60)
    : Math.floor((Date.parse(entry.timerEndsAt) - now.value) / 1000);
  if (!Number.isFinite(remaining)) return null;
  const state = boilScheduleState(
    step,
    entry,
    remaining,
    brew.recipeSnapshot.ingredients,
  );
  return state.next
    ? {
        ...state,
        paused,
        names: state.nextGroup
          .map((item) =>
            [item.name, item.amount, item.unit].filter(Boolean).join(" "),
          )
          .join(" · "),
      }
    : null;
});
const quickActions = computed(() => [
  {
    to: "/verktoy/alkoholmaler",
    label: t("navbar.user.items.alcohol_calc"),
    icon: Calculator,
  },
  {
    to: "/verktoy/co2-volumer",
    label: t("navbar.user.items.co2_volumes"),
    icon: Droplets,
  },
  {
    to: "/verktoy/saftblanding",
    label: t("navbar.user.items.cordial_mix"),
    icon: GlassWater,
  },
]);
function plannedDate(brew) {
  const date = new Date(brew.timeline?.plannedStartAt);
  return Number.isNaN(date.getTime())
    ? t("home.no_date")
    : new Intl.DateTimeFormat(locale.value === "no" ? "nb-NO" : locale.value, {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }).format(date);
}
function replaceBrew(updated) {
  brews.value = brews.value.map((item) =>
    item._id === updated._id ? updated : item,
  );
}
async function loadHomeData() {
  loading.value = true;
  error.value = "";
  try {
    const [allBrews, recipes] = await Promise.all([listBrews(), listRecipes()]);
    brews.value = Array.isArray(allBrews) ? allBrews : [];
    recipeCount.value = Array.isArray(recipes) ? recipes.length : 0;
  } catch (err) {
    error.value =
      err?.response?.data?.error ||
      err?.message ||
      t("brews.errors.fetch_failed");
  } finally {
    loading.value = false;
  }
}
onMounted(() => {
  loadHomeData();
  tick = setInterval(() => (now.value = Date.now()), 1000);
});
onBeforeUnmount(() => clearInterval(tick));
</script>
<style scoped>
.home-page {
  display: grid;
  gap: 26px;
}
.home-stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  border-block: 1px solid var(--color-border3);
}
.home-stats a {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 18px 14px;
}
.home-stats a > span {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 8px;
}
.home-stats strong {
  font-size: 24px;
  font-variant-numeric: tabular-nums;
}
.home-stats span span {
  font-size: 12px;
  color: var(--color-text2-faded);
}
.home-stats a + a {
  border-left: 1px solid var(--color-border3);
}
.home-active {
  border: 1px solid var(--color-border2);
  border-radius: 16px;
  padding: 22px;
  background: var(--color-bg2);
  color: var(--color-text2);
}
.featured-brew {
  background: transparent;
  padding: 0;
  border: 0;
}
.featured-brew :deep(h3) {
  font-size: 24px;
}
.home-next {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
  margin-top: 20px;
  border: 1px solid var(--color-status-pending-border);
  background: var(--color-status-pending);
  color: var(--color-status-pending-text);
  border-radius: 12px;
}
.home-columns {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr);
  gap: 22px;
  align-items: start;
}
.home-section {
  min-width: 0;
  padding: 20px;
  border: 1px solid var(--color-border3);
  border-radius: 14px;
}
.home-section-heading {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.home-section-heading h2,
.home-tools h2 {
  font-size: 18px;
}
.home-text-link {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 12px;
  font-weight: 600;
}
.home-text-link:hover {
  text-decoration: underline;
}
.home-plan,
.home-nav-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 17px 0;
  font-size: 14px;
}
.home-plan {
  border-top: 1px solid var(--color-border3);
}
.home-plan:hover strong,
.home-nav-row:hover strong {
  text-decoration: underline;
}
.home-tools {
  padding-top: 4px;
}
.home-tool {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: var(--color-bg4);
  color: var(--color-text4);
  border: 1px solid var(--color-border4);
  border-radius: 10px;
}
.home-tool:hover {
  border-color: var(--color-button2-border);
}
.home-empty {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 18px;
  padding: 15px 0;
}
a:focus-visible {
  outline: 2px solid var(--color-text1);
  outline-offset: 4px;
  border-radius: 6px;
}
@media (max-width: 700px) {
  .home-columns {
    grid-template-columns: minmax(0, 1fr);
  }
  .home-active {
    padding: 16px;
  }
  .home-stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .home-stats a:nth-child(3) {
    border-left: 0;
  }
  .home-stats a:nth-child(n + 3) {
    border-top: 1px solid var(--color-border3);
  }
}
</style>
