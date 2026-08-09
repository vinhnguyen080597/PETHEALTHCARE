import test from "node:test";
import assert from "node:assert/strict";
import {
  firstInvalidFieldId,
  scrollFieldIntoView,
} from "../src/lib/formFocus";

test("firstInvalidFieldId returns first errored field in declared order", () => {
  assert.equal(
    firstInvalidFieldId(
      { title: "Required", location: "Required" },
      ["title", "location"],
    ),
    "title",
  );
  assert.equal(
    firstInvalidFieldId({ title: "", location: "Required" }, [
      "title",
      "location",
    ]),
    "location",
  );
  assert.equal(firstInvalidFieldId({}, ["title"]), null);
});

test("scrollFieldIntoView no-ops on null and returns false", () => {
  assert.equal(scrollFieldIntoView(null), false);
});
