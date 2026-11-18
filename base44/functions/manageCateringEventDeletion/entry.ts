import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import { EVENT_RELATIONS, buildDeletionCensus, loadEventRelations } from "../../shared/cateringEventRelations.js";
import { getEffectivePermissions } from "../../shared/resolveEffectivePermissions.js";
import { isCentralAdmin } from "../../shared/platformRole.js";

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json();
    if (!body.eventId || !["preview", "delete"].includes(body.action)) return Response.json({ error: "eventId and a valid action are required" }, { status: 400 });

    const svc = base44.asServiceRole;
    const event = await svc.entities.CateringEvent.get(body.eventId).catch(() => null);
    if (!event) return Response.json({ error: "Event not found" }, { status: 404 });
    const permissions = await getEffectivePermissions(base44, user);
    const allowed = !permissions?.access_denied && permissions?.catering_edit === true && (isCentralAdmin(user, permissions) || !permissions.branch_id || permissions.branch_id === event.branch_id);
    if (!allowed) return Response.json({ error: "You do not have permission to delete catering events" }, { status: 403 });

    const children = await loadEventRelations(svc, event.id);
    const census = buildDeletionCensus(children);
    if (body.action === "preview") return Response.json({ event: { id: event.id, name: event.event_name }, ...census });
    if (!census.canDelete) return Response.json({ error: census.blockers[0], ...census }, { status: 409 });

    await svc.entities.AuditLog.create({
      admin_id: user.id,
      admin_email: user.email,
      action_type: "delete",
      entity_type: "CateringEvent",
      entity_id: event.id,
      entity_name: event.event_name,
      action_description: `Cascade-deleted a clean catering event and ${census.totalChildren} linked record(s).`,
      changes: { event: { id: event.id, name: event.event_name, client_id: event.client_id }, children: census.items },
      status: "success",
    });
    for (const relation of EVENT_RELATIONS.filter((item) => item.cascade !== false)) {
      const ids = children[relation.entity].map((row) => row.id);
      if (ids.length) await svc.entities[relation.entity].deleteMany({ id: { $in: ids } });
    }
    await svc.entities.CateringEvent.delete(event.id);
    return Response.json({ success: true, deletedEventId: event.id, deletedChildren: census.items, totalDeletedChildren: census.totalChildren });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}