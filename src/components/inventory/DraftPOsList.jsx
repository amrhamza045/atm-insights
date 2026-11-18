import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { FileText, Eye, Trash2, Send, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '@/components/utils/currencyFormatter';
import { useBranch } from '@/components/branches/BranchContext';

export default function DraftPOsList() {
  const queryClient = useQueryClient();
  const [selectedPO, setSelectedPO] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const { selectedBranchId } = useBranch();

  // Draft purchase orders of the branch picked in the header
  const { data: purchaseOrders = [], isLoading } = useQuery({
    queryKey: ['purchaseOrders', 'drafts', selectedBranchId],
    queryFn: () => base44.entities.PurchaseOrder.filter(
      { status: 'pending_approval', ...(selectedBranchId ? { branch_id: selectedBranchId } : {}) },
      '-created_date'
    )
  });

  const deleteMutation = useMutation({
    mutationFn: (poId) => base44.entities.PurchaseOrder.delete(poId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
      toast.success('Draft PO deleted');
    },
    onError: () => toast.error('Failed to delete draft PO')
  });

  const approveMutation = useMutation({
    mutationFn: (poId) => base44.entities.PurchaseOrder.update(poId, { status: 'confirmed' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
      setShowDetails(false);
      toast.success('PO approved and ready to send to supplier');
    },
    onError: () => toast.error('Failed to approve PO')
  });

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin mx-auto"></div>
      </div>
    );
  }

  if (purchaseOrders.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500">
        <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
        <p>No draft purchase orders yet</p>
        <p className="text-sm mt-1">Use the Forecasting tool to generate recommendations and create draft POs</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {purchaseOrders.map((po) => (
        <Card key={po.id} className="border-blue-200 hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-start">
              {/* PO Info */}
              <div>
                <h3 className="font-semibold text-sm text-slate-900">{po.order_number}</h3>
                <p className="text-xs text-slate-500 mt-1">{po.supplier}</p>
                <Badge variant="outline" className="mt-2 border-blue-200 text-blue-700 bg-blue-50">
                  <Clock className="w-3 h-3 mr-1" />
                  Pending Approval
                </Badge>
              </div>

              {/* Items Count */}
              <div>
                <p className="text-xs text-slate-500 mb-1">Items</p>
                <p className="font-semibold text-slate-900">{po.items?.length || 0} items</p>
                <p className="text-xs text-slate-500 mt-2">
                  Delivery: {new Date(po.expected_delivery_date).toLocaleDateString()}
                </p>
              </div>

              {/* Total Amount */}
              <div>
                <p className="text-xs text-slate-500 mb-1">Total</p>
                <p className="font-semibold text-slate-900">{formatCurrency(po.total_amount)}</p>
              </div>

              {/* Status */}
              <div>
                <p className="text-xs text-slate-500 mb-1">Created</p>
                <p className="text-xs text-slate-600">
                  {new Date(po.created_date).toLocaleDateString()}
                </p>
                {po.notes && (
                  <p className="text-xs text-slate-500 mt-2 line-clamp-2">{po.notes}</p>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 justify-end">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSelectedPO(po);
                    setShowDetails(true);
                  }}
                >
                  <Eye className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => approveMutation.mutate(po.id)}
                  disabled={approveMutation.isPending}
                >
                  <Send className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (confirm('Delete this draft PO?')) {
                      deleteMutation.mutate(po.id);
                    }
                  }}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Details Dialog */}
      {selectedPO && (
        <Dialog open={showDetails} onOpenChange={setShowDetails}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{selectedPO.order_number}</DialogTitle>
              <DialogDescription>{selectedPO.supplier}</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-slate-50 p-3 rounded">
                  <p className="text-xs text-slate-500 mb-1">Total Amount</p>
                  <p className="font-semibold text-slate-900">{formatCurrency(selectedPO.total_amount)}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded">
                  <p className="text-xs text-slate-500 mb-1">Items</p>
                  <p className="font-semibold text-slate-900">{selectedPO.items?.length || 0}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded">
                  <p className="text-xs text-slate-500 mb-1">Expected Delivery</p>
                  <p className="font-semibold text-slate-900 text-sm">
                    {new Date(selectedPO.expected_delivery_date).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Items Table */}
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="text-left px-3 py-2 font-semibold">Item</th>
                      <th className="text-right px-3 py-2 font-semibold">Qty</th>
                      <th className="text-right px-3 py-2 font-semibold">Unit Price</th>
                      <th className="text-right px-3 py-2 font-semibold">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {selectedPO.items?.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="px-3 py-2 text-slate-900 font-medium">{item.inventory_item_name}</td>
                        <td className="px-3 py-2 text-right text-slate-700">
                          {Math.round(item.quantity_ordered)} {item.purchase_unit_label}
                        </td>
                        <td className="px-3 py-2 text-right text-slate-700">
                          {formatCurrency(item.unit_price)}
                        </td>
                        <td className="px-3 py-2 text-right font-semibold text-slate-900">
                          {formatCurrency(item.total_price)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Notes */}
              {selectedPO.notes && (
                <div className="bg-slate-50 p-3 rounded text-sm">
                  <p className="text-slate-500 font-medium mb-1">Notes:</p>
                  <p className="text-slate-700">{selectedPO.notes}</p>
                </div>
              )}

              {/* Contact Info */}
              {selectedPO.supplier_contact && (
                <div className="bg-blue-50 border border-blue-200 p-3 rounded text-sm">
                  <p className="text-blue-700 font-medium mb-1">Supplier Contact:</p>
                  <p className="text-blue-600">{selectedPO.supplier_contact}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 justify-end pt-2 border-t">
                <Button variant="outline" onClick={() => setShowDetails(false)}>
                  Close
                </Button>
                <Button
                  className="bg-green-600 hover:bg-green-700 gap-2"
                  onClick={() => approveMutation.mutate(selectedPO.id)}
                  disabled={approveMutation.isPending}
                >
                  <Send className="w-4 h-4" />
                  Approve & Send to Supplier
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}