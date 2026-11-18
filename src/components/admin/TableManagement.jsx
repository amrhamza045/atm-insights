import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Trash2, Users } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useBranch } from "@/components/branches/BranchContext";

export default function TableManagement() {
  const [showDialog, setShowDialog] = useState(false);
  const [editingTable, setEditingTable] = useState(null);
  const [formData, setFormData] = useState({
    table_number: "",
    capacity: 4,
    is_active: true
  });

  const queryClient = useQueryClient();
  const { selectedBranch, selectedBranchId } = useBranch();

  const { data: tables = [] } = useQuery({
    queryKey: ["tables", selectedBranchId],
    queryFn: () => base44.asServiceRole.entities.Table.filter({ ...(!selectedBranchId ? {} : { branch_id: selectedBranchId }) }, "table_number")
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Table.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tables"] });
      toast.success("Table created");
      setShowDialog(false);
      resetForm();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Table.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tables"] });
      toast.success("Table updated");
      setShowDialog(false);
      resetForm();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Table.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tables"] });
      toast.success("Table deleted");
    }
  });

  const resetForm = () => {
    setFormData({ table_number: "", capacity: 4, is_active: true });
    setEditingTable(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingTable) {
      updateMutation.mutate({ id: editingTable.id, data: formData });
    } else {
      createMutation.mutate({ ...formData, branch_id: selectedBranchId, branch_name: selectedBranch?.name });
    }
  };

  const handleEdit = (table) => {
    setEditingTable(table);
    setFormData({
      table_number: table.table_number,
      capacity: table.capacity || 4,
      is_active: table.is_active ?? true
    });
    setShowDialog(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Table Management</h2>
          <p className="text-sm text-slate-500">Configure restaurant tables for dine-in orders</p>
        </div>
        <Button onClick={() => setShowDialog(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Add Table
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {tables.map((table) => (
          <Card key={table.id} className="p-4">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-lg">Table {table.table_number}</span>
                <Badge variant={table.is_active ? "default" : "secondary"}>
                  {table.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>
              <div className="flex items-center gap-1 text-sm text-slate-500">
                <Users className="w-3 h-3" />
                <span>{table.capacity || 4} seats</span>
              </div>
              <div className="flex gap-1 mt-2">
                <Button size="sm" variant="outline" onClick={() => handleEdit(table)} className="flex-1">
                  <Pencil className="w-3 h-3" />
                </Button>
                <Button size="sm" variant="outline" onClick={() => deleteMutation.mutate(table.id)} className="flex-1 text-red-600 hover:text-red-700">
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={showDialog} onOpenChange={(open) => { setShowDialog(open); if (!open) resetForm(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTable ? "Edit Table" : "Add New Table"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Table Number</Label>
              <Input
                value={formData.table_number}
                onChange={(e) => setFormData({ ...formData, table_number: e.target.value })}
                placeholder="e.g., 1, A1, VIP-1"
                required
              />
            </div>
            <div>
              <Label>Capacity (seats)</Label>
              <Input
                type="number"
                value={formData.capacity}
                onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) })}
                min="1"
                required
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Active</Label>
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => { setShowDialog(false); resetForm(); }} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" className="flex-1">
                {editingTable ? "Update" : "Create"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}