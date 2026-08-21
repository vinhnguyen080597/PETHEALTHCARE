import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  applyOtpDigitAt,
  isOtpComplete,
  maskEmailForDisplay,
  normalizeOtpDigits,
  otpDigitsArray,
  provisionalDisplayNameFromEmail,
  resendCountdownSeconds,
} from '../src/utils/otpPin.ts';

describe('otpPin', () => {
  it('normalizes and splits digits', () => {
    assert.equal(normalizeOtpDigits('12ab34'), '1234');
    assert.deepEqual(otpDigitsArray('12', 4), ['1', '2', '', '']);
  });

  it('applies single digits and paste autofill', () => {
    assert.equal(applyOtpDigitAt('', 0, '9'), '9');
    assert.equal(applyOtpDigitAt('12', 1, ''), '1');
    assert.equal(applyOtpDigitAt('', 0, '12345678'), '12345678');
    assert.equal(applyOtpDigitAt('00000000', 3, '99'), '99');
  });

  it('detects complete OTP and masks email', () => {
    assert.equal(isOtpComplete('12345678'), true);
    assert.equal(isOtpComplete('123'), false);
    assert.equal(maskEmailForDisplay('meo080597@gmail.com'), 'meo0...97@gmail.com');
    assert.equal(maskEmailForDisplay('ab@x.com'), 'a***@x.com');
  });

  it('builds provisional display name and countdown', () => {
    assert.equal(provisionalDisplayNameFromEmail('luna.parent@example.com'), 'luna.parent');
    assert.equal(resendCountdownSeconds(1_000, 500), 1);
    assert.equal(resendCountdownSeconds(500, 1_000), 0);
  });
});
