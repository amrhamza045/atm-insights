// Server-side audit trail. Written with the service role so it works for any
// permitted caller; never throws — an audit failure must not undo the action.
export async function audit(base44, user, actionType, entityType, description, extra = {}) {
  try {
    await base44.asServiceRole.entities.AuditLog.create({
      admin_id: user?.id || 'system',
      admin_email: user?.email || 'system',
      action_type: actionType,
      entity_type: entityType,
      entity_id: extra.entityId || null,
      entity_name: extra.entityName || null,
      action_description: description,
      changes: extra.changes || null,
      status: 'success',
    });
  } catch (e) {
    console.error('audit log failed', e?.message);
  }
}