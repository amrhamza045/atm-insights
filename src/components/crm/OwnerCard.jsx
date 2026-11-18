import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserCheck } from "lucide-react";
import { toast } from "sonner";

/** Relationship owner — optional for everyone, recommended for corporate clients. */
export default function OwnerCard({ client, canEdit }) {
  const [owner, setOwner] = useState({ id: client.owner_employee_id || "", name: client.owner_name || "" });
  const [saving, setSaving] = useState(false);

  const { data: employees = [] } = useQuery({
    queryKey: ["crm-owner-employees"],
    queryFn: () => base44.entities.Employee.filter({ status: "active" }, "name", 500),
    enabled: canEdit,
  });

  const assign = async (value) => {
    const emp = value === "__none__" ? null : employees.find((e) => e.id === value);
    setSaving(true);
    try {
      await base44.entities.Client.update(client.id, {
        owner_employee_id: emp ? emp.id : "",
        owner_name: emp ? emp.name : "",
      });
      setOwner({ id: emp ? emp.id : "", name: emp ? emp.name : "" });
      toast.success(emp ? `Owner set to ${emp.name}` : "Owner cleared");
    } catch {
      toast.error("Could not update owner");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-slate-500" /> Relationship owner
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {canEdit ? (
          <Select value={owner.id || "__none__"} onValueChange={assign} disabled={saving}>
            <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Unassigned</SelectItem>
              {employees.map((e) => (
                <SelectItem key={e.id} value={e.id}>{e.name}{e.position ? ` — ${e.position}` : ""}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <p className="text-sm text-slate-900">{owner.name || "Unassigned"}</p>
        )}
        {!owner.id && client.client_type === "corporate" && (
          <p className="text-xs text-amber-600">Corporate client without an owner — assigning one is recommended.</p>
        )}
      </CardContent>
    </Card>
  );
}