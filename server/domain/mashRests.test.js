import test from "node:test";
import assert from "node:assert/strict";
import { mashRests } from "./mashRests.js";

test("keeps valid rests in order and drops invalid or duplicate ones", () => {
  const step = { data: { rests: [
    { restId: "a", temperatureC: 65, minutes: 30 },
    { restId: "a", temperatureC: 70, minutes: 5 },
    { restId: "b", temperatureC: "", minutes: 5 },
    { restId: "c", temperatureC: "78", minutes: "10" },
    { temperatureC: 60, minutes: 1 },
  ] } };
  assert.deepEqual(mashRests(step), [{ restId: "a", temperatureC: 65, minutes: 30 }, { restId: "c", temperatureC: 78, minutes: 10 }]);
  });
test("returns an empty list without rests", () => { assert.deepEqual(mashRests({}), []); });
