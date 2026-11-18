import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { fileLinkProps } from "@/lib/privateFiles";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertCircle, Check, X, FileText } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/components/utils/currencyFormatter";

export default function PendingCashierApprovals({ pendingExpenses, pendingPurchases, currentUser }) {
  const [reviewDialog, setReviewDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [itemType, setItemType] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [action, setAction] = useState(null);

  const queryClient = useQueryClient();

  const updateExpenseMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Expense.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["cashierSessions"] });
    }
  });

  const updatePurchaseMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CashierPurchase.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cashierPurchases"] });
      queryClient.invalidateQueries({ queryKey: ["cashierSessions"] });
    }
  });

  const handleReview = (item, type, reviewAction) => {
    setSelectedItem(item);
    setItemType(type);
    setAction(reviewAction);
    if (reviewAction === "approve") {
      handleApprove(item, type);
    } else {
      setReviewDialog(true);
    }
  };

  const handleApprove = async (item, type) => {
    try {
      if (type === "expense") {
        await updateExpenseMutation.mutateAsync({
          id: item.id,
          data: {
            status: "approved",
            approved_by: currentUser?.full_name || currentUser?.email
          }
        });
        toast.success("Expense approved");
      } else {
        await updatePurchaseMutation.mutateAsync({
          id: item.id,
          data: {
            status: "approved",
            approved_by: currentUser?.full_name || currentUser?.email
          }
        });
        toast.success("Purchase approved");
      }
    } catch (error) {
      toast.error("Failed to approve");
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast.error("Please provide a rejection reason");
      return;
    }

    try {
      if (itemType === "expense") {
        await updateExpenseMutation.mutateAsync({
          id: selectedItem.id,
          data: {
            status: "rejected",
            rejection_reason: rejectionReason,
            approved_by: currentUser?.full_name || currentUser?.email
          }
        });
        toast.success("Expense rejected - Investigation case opened");
      } else {
        await updatePurchaseMutation.mutateAsync({
          id: selectedItem.id,
          data: {
            status: "rejected",
            rejection_reason: rejectionReason,
            approved_by: currentUser?.full_name || currentUser?.email
          }
        });
        toast.success("Purchase rejected - Investigation case opened");
      }
      setReviewDialog(false);
      setRejectionReason("");
      setSelectedItem(null);
      setItemType(null);
    } catch (error) {
      toast.error("Failed to reject");
    }
  };

  const allPending = [
    ...pendingExpenses.map(e => ({ ...e, type: "expense" })),
    ...pendingPurchases.map(p => ({ ...p, type: "purchase" }))
  ].sort((a, b) => new Date(b.expense_date || b.purchase_date) - new Date(a.expense_date || a.purchase_date));

  return (
    <div className="space-y-4">
      {allPending.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center text-slate-500">
            No pending approvals
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 flex gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800">
              <p className="font-semibold mb-1">Review Required</p>
              <p>{allPending.length} transaction(s) pending approval. They will not reflect in session totals until approved.</p>
            </div>
          </div>

          {allPending.map(item => (
            <Card key={`${item.type}-${item.id}`} className="border-amber-200 bg-amber-50/30">
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className="bg-amber-500">
                          {item.type === "expense" ? "EXPENSE" : "PURCHASE"}
                        </Badge>
                        <Badge variant="secondary">PENDING</Badge>
                      </div>
                      <p className="font-semibold text-lg">
                        {item.type === "expense" ? item.description : item.supplier}
                      </p>
                      <div className="flex flex-wrap gap-3 mt-2 text-sm text-slate-600">
                        <span>{new Date(item.expense_date || item.purchase_date).toLocaleString()}</span>
                        {item.type === "expense" ? (
                          <>
                            <Badge variant="outline">{item.category}</Badge>
                            <span>To: {item.recipient}</span>
                          </>
                        ) : (
                          <>
                            {item.invoice_number && <span>Invoice: {item.invoice_number}</span>}
                          </>
                        )}
                        <Badge variant="outline">{item.payment_method}</Badge>
                      </div>
                      <p className="text-xs text-slate-500 mt-2">
                        Submitted by: {item.submitted_by}
                      </p>
                    </div>
                    <p className="text-2xl font-bold text-red-600">-{formatCurrency(item.amount || item.total_amount)}</p>
                  </div>

                  {item.receipt_url && (
                    <div className="border-t pt-3">
                      <a 
                        {...fileLinkProps(item.receipt_url)} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
                      >
                        <FileText className="w-4 h-4" />
                        View Receipt Scan
                      </a>
                    </div>
                  )}

                  <div className="border-t pt-3 flex gap-2">
                    <Button
                      onClick={() => handleReview(item, item.type, "approve")}
                      className="flex-1 bg-green-600 hover:bg-green-700 gap-2"
                      disabled={updateExpenseMutation.isPending || updatePurchaseMutation.isPending}
                    >
                      <Check className="w-4 h-4" />
                      Approve
                    </Button>
                    <Button
                      onClick={() => handleReview(item, item.type, "reject")}
                      variant="destructive"
                      className="flex-1 gap-2"
                      disabled={updateExpenseMutation.isPending || updatePurchaseMutation.isPending}
                    >
                      <X className="w-4 h-4" />
                      Reject
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </>
      )}

      {/* Rejection Dialog */}
      <Dialog open={reviewDialog} onOpenChange={setReviewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject {itemType === "expense" ? "Expense" : "Purchase"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-800">
                <span className="font-semibold">⚠️ Investigation Case:</span> Rejecting this transaction will open an investigation case for review.
              </p>
            </div>
            <div>
              <Label>Rejection Reason* <span className="text-red-500">(Required)</span></Label>
              <Input
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Explain why this is being rejected..."
              />
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setReviewDialog(false);
                  setRejectionReason("");
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleReject}
                variant="destructive"
                className="flex-1"
                disabled={updateExpenseMutation.isPending || updatePurchaseMutation.isPending}
              >
                Confirm Rejection
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}