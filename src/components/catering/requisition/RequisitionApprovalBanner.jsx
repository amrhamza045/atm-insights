import React from "react";
import { Lock, XCircle } from "lucide-react";
import ApprovalBasis from "./ApprovalBasis";

/** Pending-approval lock, or the approver's last rejection while it's back with the chef. */
export default function RequisitionApprovalBanner({ requisition: r }) {
  if (r.status === "pending_approval") {
    return (
      <div className="rounded-lg border border-warning-300 bg-warning-50 p-3 space-y-2">
        <p className="text-sm font-semibold text-warning-800 inline-flex items-center gap-1.5"><Lock className="w-4 h-4" /> Waiting for Approval Center</p>
        <p className="text-xs text-warning-800">
          {r.approval_reason || "Additional requisition requires Approval Center approval before Inventory negotiation begins."}
        </p>
        <ApprovalBasis values={r} />
      </div>
    );
  }
  if (r.approval_status === "rejected" && r.awaiting_side === "chef") {
    return (
      <div className="rounded-lg border border-danger-200 bg-danger-50 p-3 space-y-1">
        <p className="text-sm font-semibold text-danger-800 inline-flex items-center gap-1.5"><XCircle className="w-4 h-4" /> Rejected by {r.rejected_by || "the approver"}</p>
        <p className="text-xs text-danger-800">“{r.rejection_reason}” — adjust or remove items, then send again.</p>
      </div>
    );
  }
  return null;
}