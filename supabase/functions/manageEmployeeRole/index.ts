import { corsHeaders } from '../_shared/cors.ts';
import {  createClientFromRequest  } from '../_shared/base44Client.ts';
import { audit } from '../_shared/auditLog.js';
import { loadCaller, assignRole, removeAccess, deleteEmployee, listAccess, reassignBranch } from '../_shared/roleAssignment.js';

/**
 * HR role assignment endpoint.
 *  action "list"   { employee_ids }           -> role/registration per employee
 *  action "assign" { employee_id, role_key }  -> set role (rules in shared/roleAssignment.js)
 *  action "remove" { employee_id }            -> remove access (sign-in account deleted, ex-employee, HR record terminated)
 *  action "delete" { employee_id }            -> sign-in account deleted, access revoked, record moved to Ex-Employees
 */
async function handler(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const caller = await loadCaller(base44, user);
    const svc = base44.asServiceRole.entities;

    let result;
    if (body.action === 'list') result = await listAccess(svc, caller, body.employee_ids || []);
    else if (body.action === 'assign') result = await assignRole(svc, caller, user, body);
    else if (body.action === 'remove') result = await removeAccess(svc, caller, user, body);
    else if (body.action === 'delete') result = await deleteEmployee(svc, caller, user, body);
    else if (body.action === 'reassign_branch') result = await reassignBranch(svc, caller, user, body);
    else return Response.json({ error: 'Invalid action' }, { status: 400 });

    if (result.error) return Response.json({ error: result.error }, { status: result.status || 400 });
    if (body.action === 'assign') {
      await audit(base44, user, 'update', 'UserRole', `Assigned role "${body.role_key}" to employee`, { entityId: body.employee_id });
    } else if (body.action === 'reassign_branch') {
      await audit(base44, user, 'update', 'Employee', `Moved employee from "${result.previous_branch || 'none'}" to branch "${result.branch_name}"`, { entityId: body.employee_id });
    } else if (body.action === 'remove') {
      await audit(base44, user, 'delete', 'UserRole', `Removed system access from employee${result.account_deleted ? ' and deleted their sign-in account' : ''}`, { entityId: body.employee_id });
    } else if (body.action === 'delete') {
      await audit(base44, user, 'delete', 'Employee', `Moved ${result.name} to ex-employees${result.account_deleted ? ' and deleted their sign-in account' : ''}`, { entityId: body.employee_id, entityName: result.name });
    }
    return Response.json(result);
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
