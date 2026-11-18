import { corsHeaders } from '../_shared/cors.ts';
import {  createClientFromRequest  } from '../_shared/base44Client.ts';
import { checkPermission } from '../_shared/requirePermission.js';

// Every place a client is referenced. Merging re-points these onto the surviving record.
const LINKS = [
  { entity: 'Order', idField: 'customer_id', nameField: 'customer_name' },
  { entity: 'CateringEvent', idField: 'client_id', nameField: 'client_name' },
  { entity: 'CateringQuote', idField: 'client_id', nameField: 'client_name' },
  { entity: 'CateringPayment', idField: 'client_id', nameField: 'client_name' },
  { entity: 'CashbackTransaction', idField: 'client_id', nameField: 'client_name' },
  { entity: 'CashbackTransaction', idField: 'source_client_id', nameField: 'source_client_name' },
  { entity: 'Purchase', idField: 'client_id', nameField: 'client_name' },
  { entity: 'PurchaseSubmission', idField: 'client_id', nameField: 'client_name' },
  { entity: 'Redemption', idField: 'client_id', nameField: null },
  { entity: 'Payout', idField: 'client_id', nameField: 'client_name' },
  { entity: 'BalanceRecharge', idField: 'client_id', nameField: 'client_name' },
  { entity: 'CampaignRecipient', idField: 'client_id', nameField: 'client_name' },
  { entity: 'ClientInteraction', idField: 'client_id', nameField: 'client_name' },
  { entity: 'Lead', idField: 'converted_client_id', nameField: 'converted_client_name' },
  { entity: 'Client', idField: 'referred_by', nameField: null },
  // Customer portal access is keyed on the client record. Without this, a merge would
  // leave the portal login stamped with an archived client and the customer would see
  // "no events" even though their events moved onto the survivor.
  { entity: 'CateringPortalAccess', idField: 'client_id', nameField: 'client_name' }
];

async function handler(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Stricter than a normal client edit: merging re-points financial history.
    const gate = await checkPermission(base44, user, 'clients_merge');
    if (!gate.allowed) return Response.json({ error: 'Merging clients requires the clients_merge permission' }, { status: 403 });

    const body = await req.json();
    const { survivorId, mergedId, survivorFields } = body || {};
    if (!survivorId || !mergedId || survivorId === mergedId) {
      return Response.json({ error: 'Two different client records are required' }, { status: 400 });
    }

    const survivor = await base44.asServiceRole.entities.Client.get(survivorId);
    const merged = await base44.asServiceRole.entities.Client.get(mergedId);
    if (!survivor || !merged) return Response.json({ error: 'Client record not found' }, { status: 404 });
    if (merged.is_merged) return Response.json({ error: 'That record was already merged' }, { status: 400 });
    if (survivor.is_merged) return Response.json({ error: 'The surviving record was itself merged away' }, { status: 400 });

    // 1. Apply the field choices staff made on the surviving record
    const cleanFields = {};
    for (const [k, v] of Object.entries(survivorFields || {})) {
      if (v !== undefined && v !== null && v !== '') cleanFields[k] = v;
    }
    if (Object.keys(cleanFields).length) {
      await base44.asServiceRole.entities.Client.update(survivorId, cleanFields);
    }
    const survivorName = cleanFields.name || survivor.name;

    // 2. Re-point every related record
    const repointed = {};
    for (const link of LINKS) {
      try {
        const set = { [link.idField]: survivorId };
        if (link.nameField) set[link.nameField] = survivorName;
        const res = await base44.asServiceRole.entities[link.entity].updateMany(
          { [link.idField]: mergedId },
          { $set: set }
        );
        const count = res?.modified_count ?? res?.matched_count ?? 0;
        if (count) repointed[`${link.entity}.${link.idField}`] = count;
      } catch (e) {
        repointed[`${link.entity}.${link.idField}`] = `error: ${e.message}`;
      }
    }

    // 2b. Move any portal logins stamped with the archived client onto the survivor,
    //     so the customer keeps seeing their events after the merge.
    try {
      const portalUsers = await base44.asServiceRole.entities.User.filter({ portal_client_id: mergedId });
      for (const account of portalUsers) {
        await base44.asServiceRole.entities.User.update(account.id, {
          portal_client_id: survivorId,
          portal_client_name: survivorName
        });
      }
      if (portalUsers.length) repointed['User.portal_client_id'] = portalUsers.length;
    } catch (e) {
      repointed['User.portal_client_id'] = `error: ${e.message}`;
    }

    // 3. Archive the merged-away record — never deleted, always recoverable
    await base44.asServiceRole.entities.Client.update(mergedId, {
      is_merged: true,
      merged_into_id: survivorId,
      merged_into_name: survivorName,
      merged_at: new Date().toISOString(),
      merged_by_email: user.email,
      status: 'inactive'
    });

    // 4. Audit trail
    await base44.asServiceRole.entities.AuditLog.create({
      admin_id: user.id,
      admin_email: user.email,
      action_type: 'update',
      entity_type: 'Client',
      entity_id: survivorId,
      entity_name: survivorName,
      action_description: `Merged duplicate client "${merged.name}" (${mergedId}) into "${survivorName}" (${survivorId})`,
      changes: {
        survivor_before: survivor,
        merged_record: merged,
        survivor_fields_applied: cleanFields,
        repointed
      },
      status: 'success'
    });

    return Response.json({ success: true, survivorId, mergedId, repointed });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  try {
    const res = await handler(req);
    const newHeaders = new Headers(res.headers);
    for (const [k, v] of Object.entries(corsHeaders)) {
      newHeaders.set(k, v);
    }
    return new Response(res.body, {
      status: res.status,
      statusText: res.statusText,
      headers: newHeaders,
    });
  } catch (err: any) {
    return Response.json({ error: err.message || String(err) }, {
      status: 500,
      headers: corsHeaders,
    });
  }
});
