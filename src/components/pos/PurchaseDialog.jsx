import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import ReceiptLink from "@/components/shared/ReceiptLink";
import { uploadPrivateReceipt, fileLinkProps } from "@/lib/privateFiles";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const emptyForm = {
  supplier: "",
  supplier_id: "",
  total_amount: "",
  payment_method: "cash",
  payment_status: "paid_now",
  invoice_number: "",
  notes: "",
  items: [{ description: "", quantity: 1, unit_price: 0, total: 0 }],
  receipt_url: ""
};

export default function PurchaseDialog({ open, onOpenChange, onSubmit, isSubmitting }) {
  const [purchaseData, setPurchaseData] = useState(emptyForm);
  const [uploading, setUploading] = useState(false);

  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers"],
    queryFn: () => base44.entities.Supplier.list()
  });

  const handleClose = (val) => {
    if (!val) setPurchaseData(emptyForm);
    onOpenChange(val);
  };

  const handleSubmit = () => {
    if (!purchaseData.supplier || !purchaseData.total_amount || !purchaseData.receipt_url) {
      toast.error("Please fill in all required fields including receipt");
      return;
    }
    onSubmit(purchaseData);
    setPurchaseData(emptyForm);
  };

  const handleSupplierChange = (supplierId) => {
    if (supplierId === "__manual__") {
      setPurchaseData({ ...purchaseData, supplier_id: "", supplier: "" });
      return;
    }
    const s = suppliers.find(s => s.id === supplierId);
    if (s) setPurchaseData({ ...purchaseData, supplier_id: s.id, supplier: s.name });
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>Record Purchase</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Supplier*</Label>
            <Select value={purchaseData.supplier_id || "__manual__"} onValueChange={handleSupplierChange}>
              <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__manual__">Enter manually</SelectItem>
                {suppliers.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!purchaseData.supplier_id && (
              <Input
                className="mt-2"
                placeholder="Supplier name"
                value={purchaseData.supplier}
                onChange={e => setPurchaseData({ ...purchaseData, supplier: e.target.value })}
              />
            )}
          </div>
          <div>
            <Label>Total Amount (EGP)*</Label>
            <Input
              type="number"
              value={purchaseData.total_amount}
              onChange={e => setPurchaseData({ ...purchaseData, total_amount: e.target.value })}
            />
          </div>
          <div>
            <Label>Invoice Number</Label>
            <Input
              value={purchaseData.invoice_number}
              onChange={e => setPurchaseData({ ...purchaseData, invoice_number: e.target.value })}
            />
          </div>
          <div>
            <Label>Payment Method</Label>
            <Select value={purchaseData.payment_method} onValueChange={v => setPurchaseData({ ...purchaseData, payment_method: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="card">Card</SelectItem>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                <SelectItem value="credit">Credit</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Payment Status</Label>
            <Select value={purchaseData.payment_status} onValueChange={v => setPurchaseData({ ...purchaseData, payment_status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="paid_now">✅ Paid Now (Cash Today)</SelectItem>
                <SelectItem value="pending_payment">🕐 Pay Later (Deferred to Supplier)</SelectItem>
              </SelectContent>
            </Select>
            {purchaseData.payment_status === "pending_payment" && (
              <p className="text-xs text-warning-600 mt-1">⚠️ This will be tracked as an outstanding balance with the supplier.</p>
            )}
          </div>
          <div>
            <Label>Notes</Label>
            <Input
              value={purchaseData.notes}
              onChange={e => setPurchaseData({ ...purchaseData, notes: e.target.value })}
            />
          </div>
          <div>
            <Label>Receipt Scan* <span className="text-red-500">(Required)</span></Label>
            <div className="flex gap-2">
              <Input
                value={purchaseData.receipt_url}
                onChange={e => setPurchaseData({ ...purchaseData, receipt_url: e.target.value })}
                placeholder="Receipt URL"
                className="flex-1"
                readOnly
              />
              <Button variant="outline" onClick={() => document.getElementById("purchase-receipt-upload-dlg").click()} disabled={uploading}>
                {uploading ? "Uploading..." : "Upload"}
              </Button>
              <input
                id="purchase-receipt-upload-dlg"
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setUploading(true);
                  try {
                    const file_url = await uploadPrivateReceipt(file);
                    setPurchaseData({ ...purchaseData, receipt_url: file_url });
                    toast.success("Receipt uploaded");
                  } catch {
                    toast.error("Failed to upload receipt");
                  } finally {
                    setUploading(false);
                  }
                }}
              />
            </div>
            {purchaseData.receipt_url && (
              <a {...fileLinkProps(purchaseData.receipt_url)} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline block mt-1">
                View uploaded receipt
              </a>
            )}
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
            <p className="font-semibold mb-1">⚠️ Approval Required</p>
            <p>This purchase will be submitted for admin approval before reflecting in the session.</p>
          </div>
          <Button onClick={handleSubmit} disabled={isSubmitting} className="w-full">
            Submit Purchase for Approval
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}