import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import AddClientDialog from "@/components/clients/AddClientDialog";

export default function QuickAddCustomerDialog({ open, onOpenChange }) {
  const queryClient = useQueryClient();
  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: () => base44.entities.Client.list(),
    enabled: open,
  });

  const handleSave = async (data) => {
    if (data.referred_by === "none") data.referred_by = "";
    await base44.entities.Client.create(data);
    queryClient.invalidateQueries({ queryKey: ["clients"] });
    toast.success("Customer added");
  };

  return <AddClientDialog open={open} onOpenChange={onOpenChange} onSave={handleSave} clients={clients} editingClient={null} />;
}