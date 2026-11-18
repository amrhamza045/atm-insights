import { readAll, linked } from './executiveCateringCommon.js';
import { buildCustomerAccount } from './customerAccountBuild.js';

// Keeps the saved customer accounts current: only customers whose quotes,
// payments or events changed since the last sync are rebuilt (all of them on
// the first run or a full rebuild). Saved rows are updated in place, new
// customers added and customers that no longer qualify removed.
const KEY = 'catering';
const maxDate = (rows, start) => rows.reduce((m, r) => (r.updated_date && r.updated_date > (m || '') ? r.updated_date : m), start);

async function changedClients(svc, since) {
  const after = { updated_date: { $gt: since } };
  const [payments, quotes, events] = await Promise.all([
    readAll(svc.entities.CateringPayment, after), readAll(svc.entities.CateringQuote, after), readAll(svc.entities.CateringEvent, after),
  ]);
  const eventIds = [...quotes.map((q) => q.event_id), ...events.map((e) => e.id)].filter(Boolean);
  const onEvents = eventIds.length ? await linked(svc.entities.CateringPayment, 'event_id', eventIds) : [];
  const ids = [...payments, ...onEvents].map((p) => p.client_id);
  for (const r of [...quotes, ...events]) if (r.client_id) ids.push(r.client_id);
  return { ids: [...new Set(ids.filter(Boolean))], through: maxDate([...payments, ...quotes, ...events], since) };
}

async function sourcesFor(svc, clientIds) {
  const payments = clientIds ? await linked(svc.entities.CateringPayment, 'client_id', clientIds) : await readAll(svc.entities.CateringPayment, {});
  const eventIds = [...new Set(payments.map((p) => p.event_id).filter(Boolean))];
  const [quotes, events, reconciliations] = await Promise.all([linked(svc.entities.CateringQuote, 'event_id', eventIds), linked(svc.entities.CateringEvent, 'id', eventIds), linked(svc.entities.CateringReconciliation, 'event_id', eventIds)]);
  const ids = clientIds || [...new Set(payments.map((p) => p.client_id).filter(Boolean))];
  const clients = await linked(svc.entities.Client, 'id', ids);
  return { ids, payments, quotes, events, reconciliations, clients, through: maxDate([...payments, ...quotes, ...events], null) };
}

async function save(svc, built, existing, removeIds) {
  const now = new Date().toISOString();
  const byClient = new Map();
  for (const row of existing) {
    if (byClient.has(row.client_id)) await svc.entities.CustomerAccount.delete(row.id); // duplicate from an overlapping sync
    else byClient.set(row.client_id, row);
  }
  const creates = [], updates = [];
  for (const account of built) {
    const row = byClient.get(account.client_id);
    if (row) updates.push({ id: row.id, ...account, synced_at: now }); else creates.push({ ...account, synced_at: now });
  }
  for (let i = 0; i < creates.length; i += 100) await svc.entities.CustomerAccount.bulkCreate(creates.slice(i, i + 100));
  for (let i = 0; i < updates.length; i += 100) await svc.entities.CustomerAccount.bulkUpdate(updates.slice(i, i + 100));
  for (const id of removeIds) { const row = byClient.get(id); if (row) await svc.entities.CustomerAccount.delete(row.id); }
}

export async function syncCustomerAccounts(svc, { full = false } = {}) {
  const marker = (await svc.entities.CustomerAccountSync.filter({ key: KEY }))[0];
  const rebuildAll = full || !marker?.synced_through;
  let ids = null, through = marker?.synced_through;
  if (!rebuildAll) {
    const changed = await changedClients(svc, marker.synced_through);
    if (!changed.ids.length) return { rebuilt: 0 };
    ({ ids, through } = changed);
  }
  const src = await sourcesFor(svc, ids);
  const clientById = new Map(src.clients.map((c) => [c.id, c]));
  const eventsOf = new Map(), quotesOf = new Map();
  for (const e of src.events) eventsOf.set(e.id, e);
  for (const q of src.quotes) quotesOf.set(q.event_id, [...(quotesOf.get(q.event_id) || []), q]);
  const paysOf = new Map();
  for (const p of src.payments) paysOf.set(p.client_id, [...(paysOf.get(p.client_id) || []), p]);
  const built = [], gone = [];
  for (const id of src.ids) {
    const payments = paysOf.get(id) || [];
    const evIds = [...new Set(payments.map((p) => p.event_id))];
    const account = buildCustomerAccount(clientById.get(id), { payments, quotes: evIds.flatMap((e) => quotesOf.get(e) || []), events: evIds.map((e) => eventsOf.get(e)).filter(Boolean), reconciliations: src.reconciliations.filter((r) => evIds.includes(r.event_id)) });
    if (account) built.push(account); else gone.push(id);
  }
  const existing = rebuildAll ? await readAll(svc.entities.CustomerAccount, {}) : await linked(svc.entities.CustomerAccount, 'client_id', src.ids);
  if (rebuildAll) { const keep = new Set(built.map((a) => a.client_id)); gone.push(...existing.map((r) => r.client_id).filter((c) => !keep.has(c))); }
  await save(svc, built, existing, [...new Set(gone)]);
  const next = { key: KEY, synced_through: rebuildAll ? src.through || new Date().toISOString() : through, ...(rebuildAll ? { last_full_rebuild: new Date().toISOString() } : {}) };
  if (marker) await svc.entities.CustomerAccountSync.update(marker.id, next); else await svc.entities.CustomerAccountSync.create(next);
  return { rebuilt: built.length, removed: gone.length };
}