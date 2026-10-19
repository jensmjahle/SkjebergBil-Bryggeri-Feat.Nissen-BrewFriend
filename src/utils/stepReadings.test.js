import { test } from "node:test";
import assert from "node:assert/strict";
import {
  fieldsForStep,
  readingInvalid,
  readingFields,
} from "./stepReadings.js";

test("boil, sparge and mash ask for different actual readings", () => {
  assert.deepEqual(
    fieldsForStep({ stepType: "boil" }).map((f) => f.key),
    ["preBoilVolumeLiters", "postBoilVolumeLiters", "preBoilGravity", "og"],
  );
  assert.deepEqual(
    fieldsForStep({ stepType: "sparge" }).map((f) => f.key),
    ["waterVolumeLiters", "volumeLiters", "temperatureC", "sg"],
  );
  assert.deepEqual(
    fieldsForStep({ stepType: "mash" }).map((f) => f.key),
    ["waterVolumeLiters", "temperatureC", "ph"],
  );
  assert(
    fieldsForStep({ stepType: "custom", phase: "cold_crash" }).some(
      (f) => f.key === "temperatureC",
    ),
  );
});
test("optional readings distinguish blanks, zero, invalid quantities and units", () => {
  assert.equal(readingInvalid(null, readingFields.volumeLiters), false);
  assert.equal(readingInvalid(0, readingFields.volumeLiters), false);
  assert.equal(readingInvalid(-1, readingFields.volumeLiters), true);
  assert.equal(readingInvalid("abc", readingFields.volumeLiters), true);
  assert.equal(readingInvalid(45, readingFields.preBoilGravity), true);
  assert.equal(readingInvalid(1.045, readingFields.preBoilGravity), false);
});
