import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { GitMerge, Split, Users } from "lucide-react";
import { toast } from "sonner";

export default function TableActions({ currentTable, cart, onMerge, onSeparate }) {
  const [showMergeDialog, setShowMergeDialog] = useState(false);
  const [showSeparateDialog, setShowSeparateDialog] = useState(false);
  const [selectedTableToMerge, setSelectedTableToMerge] = useState(null);
  const [itemsToSeparate, setItemsToSeparate] = useState([]);

  const queryClient = useQueryClient();

  const { data: tables = [] } = useQuery({
    queryKey: ["tables"],
    queryFn: () => base44.entities.Table.filter({ is_active: true }, "table_number"),
    enabled: showMergeDialog
  });

  const { data: orders = [] } = useQuery({
    queryKey: ["orders", "pending"],
    queryFn: () => base44.entities.Order.filter({ status: "pending" }),
    enabled: showMergeDialog
  });

  const availableTablesForMerge = tables.filter(t => 
    t.id !== currentTable?.id && 
    t.status === "occupied" &&
    orders.some(o => o.table_id === t.id)
  );

  const handleMergeConfirm = () => {
    if (selectedTableToMerge) {
      const sourceOrder = orders.find(o => o.table_id === selectedTableToMerge.id);
      if (sourceOrder) {
        onMerge(selectedTableToMerge, sourceOrder.items);
        setShowMergeDialog(false);
        setSelectedTableToMerge(null);
        toast.success(`Merged Table ${selectedTableToMerge.table_number} items`);
      }
    }
  };

  const handleSeparateConfirm = () => {
    if (itemsToSeparate.length > 0) {
      onSeparate(itemsToSeparate);
      setShowSeparateDialog(false);
      setItemsToSeparate([]);
    }
  };

  const toggleItemForSeparation = (item) => {
    setItemsToSeparate(prev => {
      const exists = prev.find(i => i.menu_item_id === item.menu_item_id);
      if (exists) {
        return prev.filter(i => i.menu_item_id !== item.menu_item_id);
      } else {
        return [...prev, item];
      }
    });
  };

  if (!currentTable) return null;

  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowMergeDialog(true)}
        className="gap-2"
      >
        <GitMerge className="w-4 h-4" />
        Merge Tables
      </Button>
      
      {cart.length > 1 && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowSeparateDialog(true)}
          className="gap-2"
        >
          <Split className="w-4 h-4" />
          Separate Items
        </Button>
      )}

      {/* Merge Dialog */}
      <Dialog open={showMergeDialog} onOpenChange={setShowMergeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Merge Tables</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-slate-500">Select a table to merge with Table {currentTable.table_number}</p>
            <div className="space-y-2">
              {availableTablesForMerge.map(table => (
                <button
                  key={table.id}
                  onClick={() => setSelectedTableToMerge(table)}
                  className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
                    selectedTableToMerge?.id === table.id 
                      ? "border-blue-500 bg-blue-50" 
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Table {table.table_number}</span>
                    <Badge>Occupied</Badge>
                  </div>
                </button>
              ))}
            </div>
            {availableTablesForMerge.length === 0 && (
              <p className="text-sm text-slate-500 text-center py-4">No other occupied tables available</p>
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowMergeDialog(false)} className="flex-1">
                Cancel
              </Button>
              <Button 
                onClick={handleMergeConfirm} 
                disabled={!selectedTableToMerge}
                className="flex-1"
              >
                Merge
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Separate Dialog */}
      <Dialog open={showSeparateDialog} onOpenChange={setShowSeparateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Separate Items to New Table</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-slate-500">Select items to move to a separate table</p>
            <div className="space-y-2">
              {cart.map((item, index) => (
                <button
                  key={index}
                  onClick={() => toggleItemForSeparation(item)}
                  className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
                    itemsToSeparate.find(i => i.menu_item_id === item.menu_item_id)
                      ? "border-blue-500 bg-blue-50" 
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{item.name}</span>
                    <span className="text-sm text-slate-500">x{item.quantity}</span>
                  </div>
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowSeparateDialog(false)} className="flex-1">
                Cancel
              </Button>
              <Button 
                onClick={handleSeparateConfirm} 
                disabled={itemsToSeparate.length === 0}
                className="flex-1"
              >
                Separate ({itemsToSeparate.length})
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}