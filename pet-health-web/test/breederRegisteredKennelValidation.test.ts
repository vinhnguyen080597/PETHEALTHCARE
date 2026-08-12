import test from "node:test";
import assert from "node:assert/strict";
import {
  hasRegisteredKennelFieldErrors,
  validateRegisteredKennelFields,
} from "../src/lib/breederRegisteredKennelValidation";
import { REGISTRATION_UNIT_OTHER } from "../src/lib/breederRegistrationUnits";

const messages = {
  registrationUnitRequired: "unit required",
  registrationUnitOtherRequired: "other required",
  registeredKennelNameRequired: "name required",
  registeredAtRequired: "year required",
};

test("validateRegisteredKennelFields skips non-registered kennel types", () => {
  assert.deepEqual(
    validateRegisteredKennelFields(
      {
        breederType: "home_breeder",
        registrationUnit: "",
        registrationUnitOther: "",
        registeredKennelName: "",
        registeredAt: "",
      },
      messages,
    ),
    {},
  );
});

test("validateRegisteredKennelFields requires unit, kennel name, and year", () => {
  const errors = validateRegisteredKennelFields(
    {
      breederType: "registered_kennel",
      registrationUnit: "",
      registrationUnitOther: "",
      registeredKennelName: "",
      registeredAt: "",
    },
    messages,
  );
  assert.equal(errors.registrationUnit, "unit required");
  assert.equal(errors.registeredKennelName, "name required");
  assert.equal(errors.registeredAt, "year required");
  assert.equal(hasRegisteredKennelFieldErrors(errors), true);
});

test("validateRegisteredKennelFields requires other text when Khác is selected", () => {
  const errors = validateRegisteredKennelFields(
    {
      breederType: "registered_kennel",
      registrationUnit: REGISTRATION_UNIT_OTHER,
      registrationUnitOther: "",
      registeredKennelName: "My Kennel",
      registeredAt: "2020",
    },
    messages,
  );
  assert.equal(errors.registrationUnitOther, "other required");
});
