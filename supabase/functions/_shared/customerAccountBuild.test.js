import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCustomerAccount, scopeAccount } from './customerAccountBuild.js';

const client = { id: 'c1', name: 'Nour', phone: '010' };
const quote = (id, event_id, total, extra = {}) => ({ id, event_id, total, status: 'accepted', customer_decision_date: '2026-10-01T10:00:00Z', ...extra });
const pay = (event_id, quote_id, type, amount, date, extra = {}) => ({ client_id: 'c1', event_id, quote_id, payment_type: type, amount, status: 'completed', payment_date: date, ...extra });

test('quotes count only with a deposit; cancelled events charge what was kept', () => {
  const account = buildCustomerAccount(client, {
    quotes: [quote('q1', 'e1', 1000), quote('q2', 'e2', 500), quote('q3', 'e3', 800), quote('q0', 'e1', 900, { status: 'superseded' })],
    events: [{ id: 'e1', active_quote_id: 'q1', branch_id: 'b1' }, { id: 'e2', branch_id: 'b1' }, { id: 'e3', status: 'cancelled', branch_id: 'b2' }],
    payments: [
      pay('e1', 'q0', 'deposit', 300, '2026-10-02'), pay('e1', 'q1', 'final_balance', 200, '2026-11-02'),
      pay('e2', 'q2', 'deposit', 100, '2026-10-05', { status: 'rejected' }),
      pay('e3', 'q3', 'deposit', 400, '2026-10-03'), pay('e3', 'q3', 'refund', 100, '2026-10-20'),
    ],
  });
  assert.equal(account.event_count, 2);
  assert.equal(account.total_quoted, 1300);
  assert.equal(account.total_paid, 800);
  assert.equal(account.balance, 500);
  const oct = scopeAccount(account, { branchIds: ['b1', 'b2'], from: '2026-10-01', to: '2026-10-31' });
  assert.equal(oct.total_paid, 600);
  assert.equal(scopeAccount(account, { branchIds: ['b1'], from: null, to: null }).balance, 500);
});

test('no qualifying deposit means no account', () => {
  assert.equal(buildCustomerAccount(client, { quotes: [quote('q1', 'e1', 1000)], events: [{ id: 'e1' }], payments: [] }), null);
});