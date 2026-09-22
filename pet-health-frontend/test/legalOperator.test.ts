import assert from 'node:assert/strict';
import test from 'node:test';
import {
  LEGAL_ENTERPRISE_CODE,
  LEGAL_OPERATOR_NAME_EN,
  LEGAL_OPERATOR_NAME_VI,
  legalOperatorName,
  legalRegisteredAddress,
} from '../src/constants/legalOperator.ts';

test('legalOperatorName follows language', () => {
  assert.equal(legalOperatorName('vi'), LEGAL_OPERATOR_NAME_VI);
  assert.equal(legalOperatorName('en'), LEGAL_OPERATOR_NAME_EN);
  assert.equal(legalOperatorName('en-US'), LEGAL_OPERATOR_NAME_EN);
});

test('legalRegisteredAddress follows language', () => {
  assert.match(legalRegisteredAddress('vi'), /Vĩnh Long/);
  assert.match(legalRegisteredAddress('en'), /Vinh Long/);
});

test('enterprise tax code matches GCN ĐKKD', () => {
  assert.equal(LEGAL_ENTERPRISE_CODE, '2100720164');
});
