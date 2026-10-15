import { computed, ref, watch } from "vue";
import { defineStore } from "pinia";
import { floatingBrewTimers } from "../utils/floatingBrewTimers.js";

const STORAGE_KEY = "brew-floating-timers";
function loadPreferences() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "{}");
    return saved && typeof saved === "object" && !Array.isArray(saved)
      ? saved
      : {};
  } catch {
    return {};
  }
}

export const useFloatingBrewTimersStore = defineStore(
  "floatingBrewTimers",
  () => {
    const saved = loadPreferences();
    const brews = ref({});
    const trackedIds = ref(
      Array.isArray(saved.trackedIds)
        ? [
            ...new Set(
              saved.trackedIds.filter((id) => typeof id === "string" && id),
            ),
          ]
        : [],
    );
    const dismissed = ref(
      Array.isArray(saved.dismissed)
        ? saved.dismissed.filter((key) => typeof key === "string").slice(-100)
        : [],
    );
    const positions = ref(
      Object.fromEntries(
        Object.entries(saved.positions || {})
          .filter(
            ([, position]) =>
              Number.isFinite(position?.x) && Number.isFinite(position?.y),
          )
          .slice(-100)
          .map(([key, position]) => [
            key,
            {
              x: Math.max(0, Math.min(1, position.x)),
              y: Math.max(0, Math.min(1, position.y)),
            },
          ]),
      ),
    );
    const removedIds = new Set();
    const mainTimer = ref(null);
    const focusRequest = ref(null);
    const now = ref(Date.now());
    const timers = computed(() =>
      Object.values(brews.value).flatMap((brew) =>
        floatingBrewTimers(brew, now.value),
      ),
    );
    const visibleTimers = computed(() =>
      timers.value.filter(
        (timer) =>
          !dismissed.value.includes(timer.key) &&
          !(
            mainTimer.value?.brewId === timer.brewId &&
            (!mainTimer.value.stepId || mainTimer.value.stepId === timer.stepId)
          ),
      ),
    );

    function persist() {
      try {
        sessionStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            trackedIds: trackedIds.value,
            dismissed: dismissed.value.slice(-100),
            positions: positions.value,
          }),
        );
      } catch {
        /* A blocked storage setting must not interrupt a running clock. */
      }
    }
    function updateBrew(brew) {
      if (!brew?._id) return;
      const id = String(brew._id);
      if (removedIds.has(id)) return;
      const previous = brews.value[id];
      if (
        previous?.updatedAt &&
        brew.updatedAt &&
        Date.parse(previous.updatedAt) > Date.parse(brew.updatedAt)
      )
        return;
      brews.value[id] = brew;
      const hasTimers = floatingBrewTimers(brew).length > 0;
      const wasTracked = trackedIds.value.includes(id);
      if (hasTimers && !wasTracked) trackedIds.value.push(id);
      else if (!hasTimers && wasTracked)
        trackedIds.value = trackedIds.value.filter((value) => value !== id);
      if (hasTimers !== wasTracked) persist();
    }
    function removeBrew(id) {
      removedIds.add(String(id));
      delete brews.value[id];
      trackedIds.value = trackedIds.value.filter((value) => value !== id);
      persist();
    }
    function dismiss(key) {
      dismissed.value = [...new Set([...dismissed.value, key])].slice(-100);
      persist();
    }
    function restore(key) {
      if (!dismissed.value.includes(key)) return;
      dismissed.value = dismissed.value.filter((value) => value !== key);
      persist();
    }
    function canRestore(key) {
      return (
        dismissed.value.includes(key) &&
        timers.value.some((timer) => timer.key === key)
      );
    }
    function rememberPosition(key, position) {
      if (!Number.isFinite(position?.x) || !Number.isFinite(position?.y))
        return;
      positions.value = Object.fromEntries(
        [
          ...Object.entries(positions.value).filter(
            ([entryKey]) => entryKey !== key,
          ),
          [
            key,
            {
              x: Math.max(0, Math.min(1, position.x)),
              y: Math.max(0, Math.min(1, position.y)),
            },
          ],
        ].slice(-100),
      );
      persist();
    }

    // Dismissing is temporary: visiting the main clock arms its miniature again.
    // Also handle a main view which mounts before its brew has loaded.
    watch(
      [mainTimer, () => timers.value.map((timer) => timer.key).join("|")],
      () => {
        const main = mainTimer.value;
        if (!main?.stepId) return;
        for (const timer of timers.value) {
          if (timer.brewId === main.brewId && timer.stepId === main.stepId)
            restore(timer.key);
        }
      },
      { flush: "sync" },
    );

    return {
      brews,
      trackedIds,
      positions,
      mainTimer,
      focusRequest,
      now,
      visibleTimers,
      updateBrew,
      removeBrew,
      dismiss,
      restore,
      canRestore,
      rememberPosition,
    };
  },
);
