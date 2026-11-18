import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency } from "@/components/utils/currencyFormatter";
import { toast } from "sonner";
import { AlertCircle, CheckCircle2, Clock, Plus, Building2, CreditCard, History } from "lucide-react";
import SupplierAccountsWorkspace from '@/components/purchasing/supplierAccounts/SupplierAccountsWorkspace';

export default function SupplierPaymentManagement() {
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [addSupplierDialog, setAddSupplierDialog] = useState(false);
  const [markPaidDialog, setMarkPaidDialog] = useState(null); // purchase to mark paid
  const [supplierForm, setSupplierForm] = useState({ name: "", contact_person: "", phone: "", email: "", payment_terms: "", notes: "" });

  const queryClient = useQueryClient();

  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers"],
    queryFn: () => base44.entities.Supplier.list("-created_date")
  });

  const { data: allPurchases = [] } = useQuery({
    queryKey: ["cashierPurchases"],
    queryFn: () => base44.entities.CashierPurchase.list("-purchase_date")
  });

  const createSupplierMutation = useMutation({
    mutationFn: (data) => base44.entities.Supplier.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      toast.success("Supplier added");
      setAddSupplierDialog(false);
      setSupplierForm({ name: "", contact_person: "", phone: "", email: "", payment_terms: "", notes: "" });
    }
  });

  const updatePurchaseMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CashierPurchase.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cashierPurchases"] });
      toast.success("Payment marked as settled");
      setMarkPaidDialog(null);
    }
  });

  const updateSupplierMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Supplier.update(id, data),
  });

  const handleMarkPaid = async (purchase) => {
    const now = new Date().toISOString();
    await updatePurchaseMutation.mutateAsync({ id: purchase.id, data: { payment_status: "paid_now", paid_date: now } });

    // Update supplier outstanding balance
    const supplier = suppliers.find(s => s.id === purchase.supplier_id);
    if (supplier) {
      await updateSupplierMutation.mutateAsync({
        id: supplier.id,
        data: { total_outstanding: Math.max(0, (supplier.total_outstanding || 0) - purchase.total_amount) }
      });
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
    }
  };

  // Group purchases by supplier_id
  const supplierPurchases = selectedSupplier
    ? allPurchases.filter(p => p.supplier_id === selectedSupplier.id || p.supplier === selectedSupplier.name)
    : [];

  const pendingPayments = allPurchases.filter(p => p.payment_status === "pending_payment" && p.status === "approved");
  const totalOutstanding = pendingPayments.reduce((sum, p) => sum + (p.total_amount || 0), 0);

  // Group outstanding by supplier name
  const outstandingBySupplier = pendingPayments.reduce((acc, p) => {
    const key = p.supplier_id || p.supplier;
    if (!acc[key]) acc[key] = { name: p.supplier, supplier_id: p.supplier_id, total: 0, purchases: [] };
    acc[key].total += p.total_amount || 0;
    acc[key].purchases.push(p);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <SupplierAccountsWorkspace />
      <h3 className="text-lg font-semibold">Cashier purchase settlements (legacy)</h3>
      {/* Summary Cards */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-700">Total Outstanding</p>
                <p className="text-2xl font-bold text-red-900">{formatCurrency(totalOutstanding)}</p>
                <p className="text-xs text-red-600">{pendingPayments.length} pending payments</p>
              </div>
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Active Suppliers</p>
                <p className="text-2xl font-bold">{suppliers.filter(s => s.is_active).length}</p>
              </div>
              <Building2 className="w-8 h-8 text-slate-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Total Purchases</p>
                <p className="text-2xl font-bold">{formatCurrency(allPurchases.filter(p => p.status === "approved").reduce((s, p) => s + (p.total_amount || 0), 0))}</p>
              </div>
              <CreditCard className="w-8 h-8 text-slate-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Outstanding Payments */}
      {Object.keys(outstandingBySupplier).length > 0 && (
        <Card className="border-warning-200">
          <CardHeader>
            <CardTitle className="text-warning-900 flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Outstanding Payments (Pending Settlement)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.values(outstandingBySupplier).map((group, idx) => (
              <div key={idx} className="border border-warning-200 rounded-lg p-4 bg-warning-50">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-semibold text-warning-900">{group.name}</p>
                    <p className="text-sm text-warning-700">{group.purchases.length} unpaid purchase(s)</p>
                  </div>
                  <p className="text-xl font-bold text-warning-900">{formatCurrency(group.total)}</p>
                </div>
                <div className="space-y-2">
                  {group.purchases.map(p => (
                    <div key={p.id} className="flex items-center justify-between bg-white rounded p-2 text-sm">
                      <div>
                        <span className="font-medium">{p.invoice_number || "No invoice"}</span>
                        <span className="text-slate-500 ml-2">{new Date(p.purchase_date).toLocaleDateString()}</span>
                        {p.notes && <span className="text-slate-400 ml-2 text-xs">({p.notes})</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{formatCurrency(p.total_amount)}</span>
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 h-7 text-xs"
                          onClick={() => setMarkPaidDialog(p)}
                        >
                          Mark Paid
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Supplier List */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Suppliers</h3>
        <Button onClick={() => setAddSupplierDialog(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Add Supplier
        </Button>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {suppliers.map(supplier => {
          const supplierPurchaseList = allPurchases.filter(p => p.supplier_id === supplier.id || p.supplier === supplier.name);
          const outstanding = supplierPurchaseList.filter(p => p.payment_status === "pending_payment" && p.status === "approved").reduce((s, p) => s + (p.total_amount || 0), 0);
          const totalPaid = supplierPurchaseList.filter(p => p.payment_status !== "pending_payment" && p.status === "approved").reduce((s, p) => s + (p.total_amount || 0), 0);
          return (
            <Card
              key={supplier.id}
              className={`cursor-pointer hover:shadow-md transition-shadow ${outstanding > 0 ? "border-warning-300" : ""}`}
              onClick={() => setSelectedSupplier(selectedSupplier?.id === supplier.id ? null : supplier)}
            >
              <CardContent className="pt-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-semibold">{supplier.name}</p>
                    {supplier.phone && <p className="text-xs text-slate-500">{supplier.phone}</p>}
                    {supplier.payment_terms && <p className="text-xs text-slate-500">{supplier.payment_terms}</p>}
                  </div>
                  <Badge variant={supplier.is_active ? "default" : "secondary"} className="text-xs">
                    {supplier.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <div className="bg-slate-50 rounded p-2">
                    <p className="text-xs text-slate-500">Total Paid</p>
                    <p className="text-sm font-bold text-green-700">{formatCurrency(totalPaid)}</p>
                  </div>
                  <div className={`rounded p-2 ${outstanding > 0 ? "bg-warning-50" : "bg-slate-50"}`}>
                    <p className="text-xs text-slate-500">Outstanding</p>
                    <p className={`text-sm font-bold ${outstanding > 0 ? "text-warning-700" : "text-slate-500"}`}>{formatCurrency(outstanding)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {suppliers.length === 0 && (
          <div className="col-span-3 text-center py-8 text-slate-400">
            No suppliers added yet. Add a supplier to start tracking payments.
          </div>
        )}
      </div>

      {/* Supplier History */}
      {selectedSupplier && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              Purchase History — {selectedSupplier.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {supplierPurchases.length === 0 ? (
              <p className="text-slate-500 text-sm">No purchases linked to this supplier yet.</p>
            ) : (
              <div className="space-y-2">
                {supplierPurchases.map(p => (
                  <div key={p.id} className="flex items-center justify-between border rounded p-3 text-sm">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{p.invoice_number || "No invoice"}</span>
                        <Badge variant="outline" className="text-xs">{p.payment_method}</Badge>
                        <Badge
                          className={`text-xs ${p.payment_status === "pending_payment" ? "bg-warning-100 text-warning-700" : "bg-green-100 text-green-700"}`}
                          variant="outline"
                        >
                          {p.payment_status === "pending_payment" ? "Pending Payment" : "Paid"}
                        </Badge>
                        {p.status !== "approved" && (
                          <Badge variant="secondary" className="text-xs">{p.status}</Badge>
                        )}
                      </div>
                      <p className="text-slate-500 mt-1">
                        {new Date(p.purchase_date).toLocaleDateString()} · {p.submitted_by}
                        {p.paid_date && ` · Settled: ${new Date(p.paid_date).toLocaleDateString()}`}
                      </p>
                      {p.notes && <p className="text-slate-400 text-xs">{p.notes}</p>}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold">{formatCurrency(p.total_amount)}</span>
                      {p.payment_status === "pending_payment" && p.status === "approved" && (
                        <Button size="sm" className="bg-green-600 hover:bg-green-700 h-7 text-xs" onClick={() => setMarkPaidDialog(p)}>
                          Mark Paid
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
                <div className="border-t pt-3 flex justify-between font-semibold">
                  <span>Total with {selectedSupplier.name}:</span>
                  <span>{formatCurrency(supplierPurchases.filter(p => p.status === "approved").reduce((s, p) => s + (p.total_amount || 0), 0))}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Add Supplier Dialog */}
      <Dialog open={addSupplierDialog} onOpenChange={setAddSupplierDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Supplier</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name*</Label><Input value={supplierForm.name} onChange={e => setSupplierForm({...supplierForm, name: e.target.value})} /></div>
            <div><Label>Contact Person</Label><Input value={supplierForm.contact_person} onChange={e => setSupplierForm({...supplierForm, contact_person: e.target.value})} /></div>
            <div><Label>Phone</Label><Input value={supplierForm.phone} onChange={e => setSupplierForm({...supplierForm, phone: e.target.value})} /></div>
            <div><Label>Payment Terms</Label><Input value={supplierForm.payment_terms} placeholder="e.g. COD, Net 7, Weekly" onChange={e => setSupplierForm({...supplierForm, payment_terms: e.target.value})} /></div>
            <div><Label>Notes</Label><Input value={supplierForm.notes} onChange={e => setSupplierForm({...supplierForm, notes: e.target.value})} /></div>
            <Button
              className="w-full"
              disabled={!supplierForm.name}
              onClick={() => createSupplierMutation.mutate({ ...supplierForm, is_active: true })}
            >
              Add Supplier
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Mark Paid Confirmation */}
      <Dialog open={!!markPaidDialog} onOpenChange={() => setMarkPaidDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Confirm Payment Settlement</DialogTitle></DialogHeader>
          {markPaidDialog && (
            <div className="space-y-4">
              <div className="bg-slate-50 rounded p-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-slate-600">Supplier:</span><span className="font-semibold">{markPaidDialog.supplier}</span></div>
                <div className="flex justify-between"><span className="text-slate-600">Invoice:</span><span>{markPaidDialog.invoice_number || "N/A"}</span></div>
                <div className="flex justify-between"><span className="text-slate-600">Purchase Date:</span><span>{new Date(markPaidDialog.purchase_date).toLocaleDateString()}</span></div>
                <div className="flex justify-between text-base font-bold border-t pt-2"><span>Amount:</span><span className="text-green-700">{formatCurrency(markPaidDialog.total_amount)}</span></div>
              </div>
              <p className="text-sm text-slate-600">Mark this purchase as paid/settled today?</p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setMarkPaidDialog(null)} className="flex-1">Cancel</Button>
                <Button
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  onClick={() => handleMarkPaid(markPaidDialog)}
                  disabled={updatePurchaseMutation.isPending}
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Confirm Paid
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}