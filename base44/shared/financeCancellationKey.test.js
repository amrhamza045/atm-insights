import test from 'node:test';
import assert from 'node:assert/strict';
import { BLUEPRINT_KEYS, BLUEPRINT_DRIVERS } from './financeBlueprint.js';
import { mappingDefinition } from './financeMappingValidation.js';
import { resolveAccountBinding } from './financeBindingResolver.js';

const company = { branch_ids: ['branch'], currency: 'EGP' };
const definition = {
  event_type: 'P11', name: 'Retained cancellation advance',
  effective_from: '2026-11-01', priority: 100, conditions: {},
  required_dimensions: ['branch_id'], policy_reference: 'Retain existing advance; no cash movement',
  lines: [
    { side: 'debit', account_key: 'CUSTOMER_ADVANCE_ACC', basis: 'gross', negative_behavior: 'reject' },
    { side: 'credit', account_key: 'Cancellation_Customer', basis: 'gross', negative_behavior: 'reject' },
  ],
};
test('advertises Cancellation_Customer exactly in routing keys and drivers', () => {
  assert.ok(BLUEPRINT_KEYS.includes('Cancellation_Customer'));
  assert.ok(BLUEPRINT_DRIVERS.some(driver => driver.keys.includes('Cancellation_Customer')));
});
test('accepts the exact cancellation key without changing its case', () => {
  assert.equal(mappingDefinition(company, definition).lines[1].account_key, 'Cancellation_Customer');
});
test('continues rejecting unrelated mixed-case keys', () => {
  const lines = definition.lines.map(line => ({ ...line, account_key: 'Invalid_Mixed_Key' }));
  assert.throws(() => mappingDefinition(company, { ...definition, lines }), /semantic account key/);
});
test('routes the cancellation key by priority and context; missing mappings block', () => {
  const sample = { date: '2026-11-05', dimensions: { branch_id: 'branch' } };
  const base = { mapping_key: 'Cancellation_Customer', effective_from: '2026-11-01', priority: 100, account_id: 'general', conditions: {} };
  const branch = { ...base, priority: 200, account_id: 'branch-revenue', conditions: { branch_id: 'branch' } };
  assert.equal(resolveAccountBinding([base, branch], 'Cancellation_Customer', sample).account_id, 'branch-revenue');
  assert.throws(() => resolveAccountBinding([], 'Cancellation_Customer', sample), /Missing account mapping/);
});