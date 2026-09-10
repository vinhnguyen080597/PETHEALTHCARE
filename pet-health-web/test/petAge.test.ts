import assert from "node:assert/strict";
import test from "node:test";
import {
  birthDateToAgeMonths,
  listingBirthDateDisplayIso,
  listingBirthDateForForm,
  listingBirthDateValidationIssue,
} from "../src/lib/petAge";

test("listingBirthDateForForm prefers stored ISO date over age months", () => {
  assert.equal(
    listingBirthDateForForm({
      ageMonths: 6,
      birthDate: "2023-05-10",
    }),
    "2023-05-10",
  );
});

test("listingBirthDateDisplayIso prefers stored date and skips zero age fallback", () => {
  assert.equal(
    listingBirthDateDisplayIso({
      ageMonths: 0,
      birthDate: "2026-09-01",
    }),
    "2026-09-01",
  );
  assert.equal(listingBirthDateDisplayIso({ ageMonths: 0 }), "");
});

test("listingBirthDateValidationIssue rejects empty invalid and future dates", () => {
  const today = new Date("2026-09-10T12:00:00");
  assert.equal(listingBirthDateValidationIssue("", today), "required");
  assert.equal(listingBirthDateValidationIssue("2026-13-01", today), "invalid");
  assert.equal(listingBirthDateValidationIssue("2026-09-11", today), "future");
  assert.equal(listingBirthDateValidationIssue("2026-09-10", today), null);
});

test("birthDateToAgeMonths computes whole months", () => {
  assert.equal(
    birthDateToAgeMonths("2024-01-15", new Date("2024-03-20T12:00:00")),
    2,
  );
});
