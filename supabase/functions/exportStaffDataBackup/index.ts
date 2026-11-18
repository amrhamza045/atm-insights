import { corsHeaders } from '../_shared/cors.ts';
import {  createClientFromRequest  } from '../_shared/base44Client.ts';
import { denyUnlessPermitted } from '../_shared/requirePermission.js';

function escapeCSVValue(value) {
  if (value === null || value === undefined) return '';
  let str;
  if (value instanceof Date) {
    str = value.toISOString();
  } else if (typeof value === 'object') {
    str = JSON.stringify(value);
  } else {
    str = String(value);
  }
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

function convertToCSV(records) {
  if (!records || records.length === 0) return '';
  const keySet = new Set();
  records.forEach(r => {
    if (r && typeof r === 'object') {
      Object.keys(r).forEach(k => keySet.add(k));
    }
  });
  const headers = Array.from(keySet);
  const lines = [headers.map(escapeCSVValue).join(',')];
  records.forEach(r => {
    const row = headers.map(h => escapeCSVValue(r ? r[h] : ''));
    lines.push(row.join(','));
  });
  return lines.join('\n');
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    const denied = await denyUnlessPermitted(base44, user, 'admin_systems');
    if (denied) return denied;

    // READ-ONLY: only list() calls, no create/update/delete anywhere
    const entityNames = ['User', 'UserPermissions', 'Employee', 'Attendance', 'SalaryRecord'];
    const result = {};

    for (const entityName of entityNames) {
      const records = await base44.asServiceRole.entities[entityName].list();
      const csv = convertToCSV(records);
      result[entityName] = { count: records.length, csv };
    }

    return Response.json({
      export_date: new Date().toISOString(),
      exported_by: user.email,
      entities: result
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
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
