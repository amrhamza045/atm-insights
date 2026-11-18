import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import { formatCurrency } from "@/components/utils/currencyFormatter";
import RoleRateDialog from "./RoleRateDialog";

/** Per-role cost breakdown — live rows, or the frozen snapshot for confirmed events. */
export default function LaborCostRoleTable({ rows, snapshot, roles = [] }) {
  const [editRole, setEditRole] = useState(null);
  const list =
    rows ||
    (snapshot || []).map((s) => ({
      role_name: s.role_name,
      basis: s.pay_basis,
      default_rate: s.rate,
      required: s.required_count,
      filled_count: s.filled_count,
      unfilled: Math.max(0, (s.required_count || 0) - (s.filled_count || 0)),
      hours: s.hours,
      subtotal: s.subtotal,
    }));

  if (list.length === 0) {
    return (
      <Card className="p-8 text-center text-slate-500">
        No staffing plan yet — build one on the Staffing tab and its cost appears here.
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <h3 className="font-semibold text-slate-900 mb-2">Cost by role</h3>
      <div className="divide-y">
        {list.map((r) => (
          <div key={r.role_name} className="py-2 flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-900">
                {r.role_name}
                <span className="text-slate-500 font-normal"> · {r.filled_count}/{r.required} filled</span>
              </p>
              <p className="text-xs text-slate-500">
                {r.basis === "flat_event"
                  ? `${formatCurrency(r.default_rate)} flat per person`
                  : `${formatCurrency(r.default_rate)}/h × ${r.hours} h`}
                {r.unfilled > 0 &&
                  ` · ${r.unfilled} slot(s) unassigned${
                    r.estimated_cost ? ` (~${formatCurrency(r.estimated_cost)} if staffed, not charged)` : ""
                  }`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {r.basis === "flat_event" && <Badge variant="outline" className="text-xs">flat</Badge>}
              <p className="text-sm font-semibold text-slate-900">{formatCurrency(r.subtotal)}</p>
              {rows && roles.some((role) => role.name === r.role_name) && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setEditRole(roles.find((role) => role.name === r.role_name))}
                >
                  <Pencil className="w-3.5 h-3.5 text-slate-500" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      <RoleRateDialog open={!!editRole} onOpenChange={(v) => !v && setEditRole(null)} role={editRole} />
    </Card>
  );
}