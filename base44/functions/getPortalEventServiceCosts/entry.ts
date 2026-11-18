import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

/**
 * Customer portal: staffing and logistics breakdown (with costs) for one of the
 * customer's own events. Staffing/logistics records stay closed to customers, so
 * this function reads them with the service role after checking the calling
 * account is linked to the event's client. Read-only.
 */
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { event_id: eventId } = await req.json();
    if (!eventId) return Response.json({ error: 'event_id is required' }, { status: 400 });

    const clientId = user.portal_client_id;
    if (!clientId) return Response.json({ error: 'Your account is not linked to a catering client.' }, { status: 403 });

    const event = await base44.asServiceRole.entities.CateringEvent.get(eventId).catch(() => null);
    if (!event) return Response.json({ error: 'Event not found.' }, { status: 404 });
    if (event.client_id !== clientId)
      return Response.json({ error: 'This event belongs to another client.' }, { status: 403 });

    const [assignments, trips] = await Promise.all([
      base44.asServiceRole.entities.CateringAssignment.filter({ event_id: eventId }),
      base44.asServiceRole.entities.CateringTrip.filter({ event_id: eventId }),
    ]);

    // Clients see people and hours per role plus ONE staffing total — never a
    // per-role amount, since amount ÷ hours would reveal staff pay.
    const roleMap = {};
    let staffingTotal = 0;
    for (const a of assignments) {
      if (a.status === 'released') continue;
      const key = a.role_name || 'Staff';
      if (!roleMap[key]) roleMap[key] = { role_name: key, people: 0, hours: 0 };
      roleMap[key].people += 1;
      roleMap[key].hours += a.expected_hours || 0;
      staffingTotal += a.estimated_cost || 0;
    }
    const staffing = Object.values(roleMap);

    const logistics = trips
      .filter((t) => t.stage !== 'cancelled')
      .map((t) => ({
        label: t.trip_label || 'Transport',
        subtotal: t.estimated_transport_cost || 0,
      }));
    const logisticsTotal = logistics.reduce((s, t) => s + t.subtotal, 0);

    return Response.json({
      staffing,
      staffing_total: staffingTotal,
      logistics,
      logistics_total: logisticsTotal,
      grand_total: staffingTotal + logisticsTotal,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}