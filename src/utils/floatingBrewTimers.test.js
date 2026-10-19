import test from "node:test";
import assert from "node:assert/strict";
import {
  floatingBrewTimers,
  clampTimerPosition,
} from "./floatingBrewTimers.js";

const now = Date.parse("2026-10-15T12:00:00Z");
test('sparge never floats a countdown, including legacy recipes with saved durations', () => {
  const doc = brew({status:'active',startedAt:new Date(now-60000).toISOString(),timerEndsAt:new Date(now+60000).toISOString(),timerDurationSeconds:1200});
  doc.recipeSnapshot.steps[0].stepType = 'sparge';
  assert.deepEqual(floatingBrewTimers(doc,now),[]);
});
function brew(entry = {}, status = "active") {
  return {
    _id: "brew",
    name: "Pils",
    status,
    recipeSnapshot: {
      steps: [
        {
          stepId: "mash",
          title: "Mesking",
          stepType: "mash",
          durationMinutes: 60,
        },
      ],
    },
    progress: {
      stepProgress: [{ stepId: "mash", status: "pending", ...entry }],
    },
  };
}
const started = "2026-10-15T11:30:00Z";

test('floating boil clocks target the next unconfirmed addition and then flameout',()=>{
  const doc=brew({status:'pending',startedAt:started,pausedRemainingSeconds:1800});
  doc.recipeSnapshot.steps[0]={stepId:'mash',title:'Boil',stepType:'boil',durationMinutes:60,data:{additions:[{additionId:'a',name:'Whirlfloc',remainingMinutes:10}]}};
  const [timer]=floatingBrewTimers(doc,now);
  assert.equal(timer.remaining,1200);assert.match(timer.title,/Whirlfloc/);
  doc.progress.stepProgress[0].completedAdditionIds=['a'];
  assert.equal(floatingBrewTimers(doc,now)[0].remaining,1800);
});

test("unstarted and merely adjusted timers do not float", () => {
  assert.deepEqual(floatingBrewTimers(brew(), now), []);
  assert.deepEqual(
    floatingBrewTimers(
      brew({ timerDurationSeconds: 3600, pausedRemainingSeconds: 1800 }),
      now,
    ),
    [],
  );
});

test("running clocks use the saved deadline and can run overdue", () => {
  const input = brew({
    status: "active",
    startedAt: started,
    timerEndsAt: "2026-10-15T12:30:00Z",
    timerDurationSeconds: 3600,
  });
  assert.equal(floatingBrewTimers(input, now)[0].remaining, 1800);
  assert.equal(floatingBrewTimers(input, now + 10000)[0].remaining, 1790);
  assert.equal(floatingBrewTimers(input, now + 1801000)[0].remaining, -1);
});

test("paused clocks stay frozen, including when paused at zero", () => {
  const input = brew({
    startedAt: started,
    pausedRemainingSeconds: 1200,
    timerDurationSeconds: 3600,
  });
  const timer = floatingBrewTimers(input, now)[0];
  assert.equal(timer.paused, true);
  assert.equal(floatingBrewTimers(input, now + 60000)[0].remaining, 1200);
  input.progress.stepProgress[0].pausedRemainingSeconds = 0;
  assert.equal(floatingBrewTimers(input, now)[0].remaining, 0);
});

test("dismissal identity survives pause and resume but changes after a restart", () => {
  const input = brew({
    status: "active",
    startedAt: started,
    timerEndsAt: "2026-10-15T12:30:00Z",
  });
  const key = floatingBrewTimers(input, now)[0].key;
  Object.assign(input.progress.stepProgress[0], {
    status: "pending",
    timerEndsAt: null,
    pausedRemainingSeconds: 1200,
  });
  assert.equal(floatingBrewTimers(input, now)[0].key, key);
  input.progress.stepProgress[0].startedAt = "2026-10-15T12:01:00Z";
  assert.notEqual(floatingBrewTimers(input, now)[0].key, key);
});

test("reset, completed and archived clocks disappear; untimed steps never float", () => {
  assert.deepEqual(
    floatingBrewTimers(brew({ status: "completed", startedAt: started }), now),
    [],
  );
  const input = brew({ startedAt: started, pausedRemainingSeconds: 20 });
  for (const status of ["completed", "archived", "planned"]) {
    assert.deepEqual(floatingBrewTimers({ ...input, status }, now), []);
  }
  input.recipeSnapshot.steps[0].durationMinutes = null;
  assert.deepEqual(floatingBrewTimers(input, now), []);
});

test("day-based clocks retain the main clock day formatting", () => {
  const input = brew({ startedAt: started, pausedRemainingSeconds: 86400 });
  input.recipeSnapshot.steps[0].stepType = "primary_fermentation";
  assert.equal(floatingBrewTimers(input, now)[0].showDays, true);
});

test("dragging and viewport changes keep the whole clock inside the screen", () => {
  assert.deepEqual(clampTimerPosition(-100, 1000, 88, 390, 844), {
    x: 12,
    y: 744,
  });
  assert.deepEqual(clampTimerPosition(1400, -40, 108, 1440, 900), {
    x: 1320,
    y: 12,
  });
});
