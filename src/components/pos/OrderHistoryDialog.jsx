import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { formatCairoDate } from "@/components/utils/timezoneHelper";
import { Clock, Plus, Minus, Trash2, Send } from "lucide-react";

export default function OrderHistoryDialog({ open, onClose, orderHistory, tableName }) {
  const getChangeIcon = (changeType) => {
    switch (changeType) {
      case "item_added":
        return <Plus className="w-4 h-4 text-green-600" />;
      case "item_removed":
        return <Trash2 className="w-4 h-4 text-red-600" />;
      case "quantity_increased":
        return <Plus className="w-4 h-4 text-blue-600" />;
      case "quantity_decreased":
        return <Minus className="w-4 h-4 text-orange-600" />;
      case "order_prepared":
        return <Send className="w-4 h-4 text-amber-600" />;
      case "order_modified":
        return <Clock className="w-4 h-4 text-purple-600" />;
      default:
        return <Clock className="w-4 h-4 text-slate-600" />;
    }
  };

  const getChangeColor = (changeType) => {
    switch (changeType) {
      case "item_added":
        return "bg-green-50 border-green-200";
      case "item_removed":
        return "bg-red-50 border-red-200";
      case "quantity_increased":
        return "bg-blue-50 border-blue-200";
      case "quantity_decreased":
        return "bg-orange-50 border-orange-200";
      case "order_prepared":
        return "bg-amber-50 border-amber-200";
      case "order_modified":
        return "bg-purple-50 border-purple-200";
      default:
        return "bg-slate-50 border-slate-200";
    }
  };

  const formatChangeDescription = (change) => {
    switch (change.change_type) {
      case "item_added":
        return `Added ${change.item_name}`;
      case "item_removed":
        return `Removed ${change.item_name}`;
      case "quantity_increased":
        return `${change.item_name}: ${change.previous_quantity} → ${change.new_quantity}`;
      case "quantity_decreased":
        return `${change.item_name}: ${change.previous_quantity} → ${change.new_quantity}`;
      case "order_prepared":
        return change.details || "Order sent to kitchen/bar";
      case "order_modified":
        return change.details || "Order modified";
      default:
        return change.details || "Change made";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Order History - {tableName}</DialogTitle>
        </DialogHeader>

        {!orderHistory || orderHistory.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <Clock className="w-12 h-12 mx-auto mb-3 text-slate-400" />
            <p>No changes recorded yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {orderHistory.map((change, idx) => (
              <div
                key={change.id || idx}
                className={`p-4 rounded-lg border ${getChangeColor(change.change_type)}`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">{getChangeIcon(change.change_type)}</div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-medium text-sm">
                        {formatChangeDescription(change)}
                      </p>
                      <Badge variant="outline" className="text-xs">
                        {change.change_type.replace(/_/g, " ")}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-600">
                      <span>{formatCairoDate(change.created_date)}</span>
                      {change.cashier_name && (
                        <>
                          <span>•</span>
                          <span>{change.cashier_name}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}