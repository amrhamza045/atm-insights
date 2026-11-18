import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Plus, Truck } from "lucide-react";
import { toast } from "sonner";

export default function DeliveryCompanyPanel({ onClose }) {
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("direct");
  const [adding, setAdding] = useState(false);

  const { data: companies = [] } = useQuery({
    queryKey: ["deliveryCompanies"],
    queryFn: () => base44.entities.DeliveryCompany.list("name", 100),
  });

  const toggleActive = async (company) => {
    try {
      await base44.entities.DeliveryCompany.update(company.id, { is_active: !company.is_active });
      queryClient.invalidateQueries({ queryKey: ["deliveryCompanies"] });
      toast.success(`${company.name} ${company.is_active ? "disabled" : "enabled"}`);
    } catch (e) {
      toast.error("Failed to update company");
    }
  };

  const addCompany = async () => {
    if (!newName.trim()) return;
    setAdding(true);
    try {
      await base44.entities.DeliveryCompany.create({
        name: newName.trim(),
        delivery_type: newType,
        is_active: true,
        commission_percentage: 0,
        additional_fee_type: "none",
        additional_fee_value: 0,
        allow_manual_discount: false,
        is_subject_to_tax: true,
      });
      setNewName("");
      queryClient.invalidateQueries({ queryKey: ["deliveryCompanies"] });
      toast.success("Delivery company added");
    } catch (e) {
      toast.error("Failed to add company");
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-slate-900 flex items-center gap-2">
          <Truck className="w-4 h-4 text-amber-600" />
          Delivery Companies
        </h3>
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
        )}
      </div>

      <div className="space-y-2 mb-4">
        {companies.map(c => (
          <div key={c.id} className="flex items-center justify-between border border-slate-200 rounded-lg px-3 py-2">
            <div>
              <p className="text-sm font-medium text-slate-800">{c.name}</p>
              <p className="text-xs text-slate-500">
                {c.delivery_type === "direct" ? "Restaurant Delivery" : "Third-Party Platform"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs ${c.is_active ? "text-green-600" : "text-slate-400"}`}>
                {c.is_active ? "Active" : "Inactive"}
              </span>
              <Switch checked={!!c.is_active} onCheckedChange={() => toggleActive(c)} />
            </div>
          </div>
        ))}
        {companies.length === 0 && (
          <p className="text-sm text-slate-400 text-center py-4">No delivery companies yet</p>
        )}
      </div>

      <div className="flex gap-2">
        <Input
          value={newName}
          onChange={e => setNewName(e.target.value)}
          placeholder="New company name..."
          className="flex-1"
        />
        <select
          value={newType}
          onChange={e => setNewType(e.target.value)}
          className="border border-slate-200 rounded-md px-2 text-sm"
        >
          <option value="direct">Direct</option>
          <option value="indirect">Indirect</option>
        </select>
        <Button size="icon" onClick={addCompany} disabled={adding || !newName.trim()}>
          <Plus className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}