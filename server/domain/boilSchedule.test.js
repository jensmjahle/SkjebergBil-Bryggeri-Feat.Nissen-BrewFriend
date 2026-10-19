import test from "node:test";
import assert from "node:assert/strict";
import {
  boilAdditions,
  boilScheduleState,
  legacyBoilAdditions,
  invalidBoilSchedule,
} from "./boilSchedule.js";
const step = {
  stepType: "boil",
  durationMinutes: 60,
  data: {
    additions: [
      { additionId: "bitter", name: "Bitter hops", remainingMinutes: 60 },
      { additionId: "aroma", ingredientId: "saaz", remainingMinutes: 15 },
      {
        additionId: "finings",
        name: "Whirlfloc",
        amount: "1",
        unit: "tablet",
        remainingMinutes: 15,
      },
      { additionId: "flameout", name: "Citra", remainingMinutes: 0 },
    ],
  },
};
const ingredients = [
  { ingredientId: "saaz", name: "Saaz", amount: "20", unit: "g" },
];
test("boil events include all ingredient types, grouped at the same timestamp", () => {
  const state = boilScheduleState(
    step,
    { startedAt: "today", completedAdditionIds: ["bitter"] },
    42 * 60,
    ingredients,
  );
  assert.equal(state.remaining, 27 * 60);
  assert.equal(state.total, 45 * 60);
  assert.deepEqual(
    state.nextGroup.map((item) => item.name),
    ["Saaz", "Whirlfloc"],
  );
  assert.equal(state.next.amount, "20");
  assert.equal(state.due, false);
});
test("overdue additions never disappear, confirmations advance the clock and flameout remains", () => {
  const progress = { status: "active", completedAdditionIds: ["bitter"] };
  const due = boilScheduleState(step, progress, 14 * 60, ingredients);
  assert.equal(due.remaining, -60);
  assert.equal(due.due, true);
  progress.completedAdditionIds.push("aroma", "finings");
  const last = boilScheduleState(step, progress, 14 * 60, ingredients);
  assert.equal(last.next.name, "Citra");
  assert.equal(last.remaining, 14 * 60);
  progress.completedAdditionIds.push("flameout");
  assert.equal(boilScheduleState(step, progress, 0, ingredients).next, null);
});
test("unstarted due-at-start additions do not announce an alarm and paused clocks do", () => {
  assert.equal(boilScheduleState(step, {}, 3600, ingredients).due, false);
  assert.equal(
    boilScheduleState(step, { startedAt: "today" }, 3600, ingredients).due,
    true,
  );
  assert.equal(
    boilScheduleState(step, { status: "completed" }, 0, ingredients).due,
    false,
  );
});
test("legacy timestamps are read conservatively and source prose is not guessed", () => {
  const suffix=legacyBoilAdditions({data:{hopSchedule:'138g East Kent Golding @ 60m, 83g East Kent Golding @ 15m, 1 tablett Whirlfloc @ 10m'}});
  assert.deepEqual(suffix.map(item=>[item.name,item.amount,item.unit,item.remainingMinutes]),[['East Kent Golding','138','g',60],['East Kent Golding','83','g',15],['Whirlfloc','1','tablett',10]]);
  assert.deepEqual(legacyBoilAdditions({data:{hopSchedule:'60m bitter,15m aroma,5,5 min finings'}}).map(item=>item.remainingMinutes),[60,15,5.5]);
  assert.deepEqual(
    legacyBoilAdditions({
      data: { hopSchedule: "60m bitter; 15 min Saaz; 10 min Whirlfloc" },
    }).map((item) => item.remainingMinutes),
    [60, 15, 10],
  );
  assert.equal(
    legacyBoilAdditions({
      data: { hopSchedule: "Tilsett 20 g når det gjenstår 10 minutter." },
    }).length,
    0,
  );
  assert.equal(
    boilAdditions({
      durationMinutes: 60,
      data: { additions: [], hopSchedule: "60m bitter" },
    }).length,
    0,
  );
});
test("invalid, duplicate or out-of-boil timestamps cannot silently become timer events", () => {
  assert.equal(invalidBoilSchedule(step), false);
  for (const item of [
    null,
    { additionId: "x", name: "X", remainingMinutes: 61 },
    { additionId: "x", name: "X", remainingMinutes: -1 },
    { additionId: "x", name: "X", remainingMinutes: "" },
    { additionId: "x", remainingMinutes: 5 },
  ]) {
    assert.equal(
      invalidBoilSchedule({ ...step, data: { additions: [item] } }),
      true,
    );
  }
  const row = { additionId: "x", name: "X", remainingMinutes: 5 };
  assert.equal(
    invalidBoilSchedule({ ...step, data: { additions: [row, row] } }),
    true,
  );
});
