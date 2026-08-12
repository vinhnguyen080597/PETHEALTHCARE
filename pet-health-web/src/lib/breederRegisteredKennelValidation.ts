import { REGISTRATION_UNIT_OTHER } from "./breederRegistrationUnits";

export type RegisteredKennelFieldErrors = {
  registrationUnit?: string;
  registrationUnitOther?: string;
  registeredKennelName?: string;
  registeredAt?: string;
};

export function validateRegisteredKennelFields(
  input: {
    breederType: string;
    registrationUnit: string;
    registrationUnitOther: string;
    registeredKennelName: string;
    registeredAt: string;
  },
  messages: {
    registrationUnitRequired: string;
    registrationUnitOtherRequired: string;
    registeredKennelNameRequired: string;
    registeredAtRequired: string;
  },
): RegisteredKennelFieldErrors {
  if (input.breederType !== "registered_kennel") return {};

  const errors: RegisteredKennelFieldErrors = {};
  const unit = String(input.registrationUnit || "").trim();

  if (!unit) {
    errors.registrationUnit = messages.registrationUnitRequired;
  } else if (
    unit === REGISTRATION_UNIT_OTHER &&
    !String(input.registrationUnitOther || "").trim()
  ) {
    errors.registrationUnitOther = messages.registrationUnitOtherRequired;
  }

  if (!String(input.registeredKennelName || "").trim()) {
    errors.registeredKennelName = messages.registeredKennelNameRequired;
  }
  if (!String(input.registeredAt || "").trim()) {
    errors.registeredAt = messages.registeredAtRequired;
  }

  return errors;
}

export function hasRegisteredKennelFieldErrors(
  errors: RegisteredKennelFieldErrors,
): boolean {
  return Object.keys(errors).length > 0;
}
