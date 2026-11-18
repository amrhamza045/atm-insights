import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { denyUnlessPermitted } from '../../shared/requirePermission.js';

/**
 * Bumps an employee's catering experience counters after they are staffed on an event.
 *
 * Why this is server-side: the Employee entity is written here with the service
 * role, so catering staff never need direct client-side write access to Employee.
 *
 * Gate: the same `catering_view` entitlement the Catering page uses, so the two
 * are in exact lockstep and cannot drift apart again.
 */
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const denied = await denyUnlessPermitted(base44, user, 'catering_view');
    if (denied) return denied;

    const { employeeId, eventGuests } = await req.json();
    if (!employeeId) return Response.json({ error: 'employeeId is required' }, { status: 400 });

    const employee = await base44.asServiceRole.entities.Employee.get(employeeId).catch(() => null);
    if (!employee) return Response.json({ error: 'Employee not found' }, { status: 404 });

    const worked = (Number(employee.catering_events_worked) || 0) + 1;
    const largest = Math.max(Number(employee.largest_event_guests) || 0, Number(eventGuests) || 0);

    await base44.asServiceRole.entities.Employee.update(employeeId, {
      catering_events_worked: worked,
      largest_event_guests: largest,
    });

    return Response.json({ ok: true, catering_events_worked: worked, largest_event_guests: largest });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}