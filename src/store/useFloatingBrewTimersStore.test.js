import test, { beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import { createPinia, setActivePinia } from "pinia";
import { useFloatingBrewTimersStore } from "./useFloatingBrewTimersStore.js";

const originalStorage = Object.getOwnPropertyDescriptor(
  globalThis,
  "sessionStorage",
);
let preferences;
beforeEach(() => {
  preferences = "{}";
  Object.defineProperty(globalThis, "sessionStorage", {
    configurable: true,
    value: {
      getItem: () => preferences,
      setItem: (_key, value) => {
        preferences = value;
      },
    },
  });
  setActivePinia(createPinia());
});
after(() => {
  if (originalStorage)
    Object.defineProperty(globalThis, "sessionStorage", originalStorage);
  else delete globalThis.sessionStorage;
});

function brew() {
  return {
    _id: "brew",
    status: "active",
    updatedAt: "2026-10-15T12:00:00Z",
    recipeSnapshot: {
      steps: [{ stepId: "mash", stepType: "mash", durationMinutes: 60 }],
    },
    progress: {
      stepProgress: [
        {
          stepId: "mash",
          status: "pending",
          startedAt: "2026-10-15T11:00:00Z",
          timerDurationSeconds: 3600,
          pausedRemainingSeconds: 1800,
        },
      ],
    },
  };
}

test("dismissal lasts while away; visiting the main timer makes it return on leaving", () => {
  const store = useFloatingBrewTimersStore();
  const input = brew();
  store.updateBrew(input);
  const key = store.visibleTimers[0].key;
  store.dismiss(key);
  store.updateBrew({ ...input, updatedAt: "2026-10-15T12:01:00Z" });
  assert.equal(store.visibleTimers.length, 0);
  store.mainTimer = { brewId: "brew", stepId: "other" };
  assert.equal(store.visibleTimers.length, 0);
  store.mainTimer = { brewId: "brew", stepId: "mash" };
  assert.equal(
    store.visibleTimers.length,
    0,
    "main clock suppresses the miniature",
  );
  store.mainTimer = null;
  assert.equal(store.visibleTimers[0].key, key);
});

test("opening a dismissed main clock before data loads also restores it", () => {
  const first = useFloatingBrewTimersStore();
  first.updateBrew(brew());
  const key = first.visibleTimers[0].key;
  first.dismiss(key);
  setActivePinia(createPinia());
  const restored = useFloatingBrewTimersStore();
  restored.mainTimer = { brewId: "brew", stepId: null };
  restored.updateBrew(brew());
  assert.equal(restored.visibleTimers.length, 0);
  restored.mainTimer = { brewId: "brew", stepId: "mash" };
  restored.mainTimer = null;
  assert.equal(restored.visibleTimers[0].key, key);
});

test("undo restores only the miniature and preserves paused timer state", () => {
  const store = useFloatingBrewTimersStore();
  const input = brew();
  const original = structuredClone(input);
  store.updateBrew(input);
  const key = store.visibleTimers[0].key;
  store.dismiss(key);
  assert.equal(store.canRestore(key), true);
  store.restore(key);
  assert.equal(store.canRestore(key), false);
  assert.equal(store.visibleTimers[0].remaining, 1800);
  assert.deepEqual(input, original);
});

test("stale updates and responses arriving after deletion cannot resurrect a clock", () => {
  const store = useFloatingBrewTimersStore();
  store.updateBrew(brew());
  store.updateBrew({
    ...brew(),
    status: "completed",
    updatedAt: "2026-10-15T12:01:00Z",
  });
  store.updateBrew(brew());
  assert.equal(store.visibleTimers.length, 0);
  assert.deepEqual(store.trackedIds, []);
  store.removeBrew("brew");
  store.updateBrew({ ...brew(), updatedAt: "2026-10-15T12:02:00Z" });
  assert.equal(store.visibleTimers.length, 0);
});

test("malformed stored preferences never prevent the app from mounting", () => {
  for (const raw of [
    "null",
    "[]",
    "42",
    '"text"',
    "{broken",
    '{"positions":{"bad":null}}',
  ]) {
    preferences = raw;
    setActivePinia(createPinia());
    const store = useFloatingBrewTimersStore();
    store.updateBrew(brew());
    assert.equal(store.visibleTimers.length, 1);
  }
});

test("stored positions are validated and bounded; invalid new positions are ignored", () => {
  preferences = JSON.stringify({
    positions: { good: { x: 2, y: -1 }, invalid: { x: "oops", y: 1 } },
  });
  const store = useFloatingBrewTimersStore();
  assert.deepEqual(store.positions, { good: { x: 1, y: 0 } });
  store.rememberPosition("invalid", { x: NaN, y: 0 });
  assert.equal(store.positions.invalid, undefined);
});
