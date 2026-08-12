import test from 'node:test';
import assert from 'node:assert/strict';
import { validateRegisteredKennelFields } from '../src/utils/breederRegisteredKennelValidation.ts';
import { REGISTRATION_UNIT_OTHER } from '../src/utils/breederRegistrationUnits.ts';

const messages = {
  registrationUnitRequired: 'unit required',
  registrationUnitOtherRequired: 'other required',
  registeredKennelNameRequired: 'name required',
  registeredAtRequired: 'year required',
};

test('validateRegisteredKennelFields requires registered kennel details', () => {
  assert.deepEqual(
    validateRegisteredKennelFields(
      {
        breederType: 'registered_kennel',
        registrationUnit: REGISTRATION_UNIT_OTHER,
        registrationUnitOther: '',
        registeredKennelName: 'Kennel',
        registeredAt: '2021',
      },
      messages,
    ),
    { registrationUnitOther: 'other required' },
  );
});
