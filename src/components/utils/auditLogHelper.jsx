import { base44 } from "@/api/base44Client";

/**
 * Log an admin action to the audit trail
 */
export const logAdminAction = async (
  actionType,
  entityType,
  actionDescription,
  { entityId = null, entityName = null, changes = null, status = "success", errorMessage = null } = {}
) => {
  try {
    const admin = await base44.auth.me();
    
    if (!admin) return;

    await base44.entities.AuditLog.create({
      admin_id: admin.id,
      admin_email: admin.email,
      action_type: actionType,
      entity_type: entityType,
      entity_id: entityId,
      entity_name: entityName,
      action_description: actionDescription,
      changes: changes,
      status: status,
      error_message: errorMessage
    });
  } catch (error) {
    console.error("Failed to log audit action:", error);
  }
};

/**
 * Log a successful action
 */
export const logSuccess = (actionType, entityType, description, details = {}) => {
  return logAdminAction(actionType, entityType, description, details);
};

/**
 * Log a failed action
 */
export const logFailure = (actionType, entityType, description, errorMessage, details = {}) => {
  return logAdminAction(actionType, entityType, description, {
    ...details,
    status: "failed",
    errorMessage
  });
};

/**
 * Log a cashier system action (orders, sessions, payments, returns, etc.)
 */
export const logCashierAction = async (actionType, description, details = {}) => {
  return logAdminAction(actionType, "CashierOrder", description, {
    ...details,
    entityType: "CashierSession"
  });
};