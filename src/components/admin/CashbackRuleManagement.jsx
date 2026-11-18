import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Calendar } from "lucide-react";
import { toast } from "sonner";

export default function CashbackRuleManagement() {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    rule_type: "order_type",
    order_type: "all",
    customer_tier: "",
    promotional_period_name: "",
    start_date: "",
    end_date: "",
    self_cashback_percentage: 0,
    level1_cashback_percentage: 0,
    level2_cashback_percentage: 0,
    level3_cashback_percentage: 0,
    payout_percentage: 0,
    is_active: true,
    priority: 0,
    notes: ""
  });

  const { data: rules = [] } = useQuery({
    queryKey: ["cashbackRules"],
    queryFn: () => base44.entities.CashbackRule.list("-priority")
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.CashbackRule.create({
      ...data,
      created_by: null
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cashbackRules"] });
      toast.success("Rule created");
      resetForm();
      setShowDialog(false);
    },
    onError: (error) => toast.error(`Error: ${error.message}`)
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CashbackRule.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cashbackRules"] });
      toast.success("Rule updated");
      resetForm();
      setShowDialog(false);
    },
    onError: (error) => toast.error(`Error: ${error.message}`)
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.CashbackRule.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cashbackRules"] });
      toast.success("Rule deleted");
      setDeleteConfirm(null);
    },
    onError: (error) => toast.error(`Error: ${error.message}`)
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      rule_type: "order_type",
      order_type: "all",
      customer_tier: "",
      promotional_period_name: "",
      start_date: "",
      end_date: "",
      self_cashback_percentage: 0,
      level1_cashback_percentage: 0,
      level2_cashback_percentage: 0,
      level3_cashback_percentage: 0,
      payout_percentage: 0,
      is_active: true,
      priority: 0,
      notes: ""
    });
    setEditingRule(null);
  };

  const handleOpenDialog = (rule = null) => {
    if (rule) {
      setEditingRule(rule);
      setFormData(rule);
    } else {
      resetForm();
    }
    setShowDialog(true);
  };

  const handleSave = () => {
    if (!formData.name.trim()) {
      toast.error("Rule name is required");
      return;
    }

    if (editingRule) {
      updateMutation.mutate({ id: editingRule.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-semibold">Cashback Rules ({rules.length})</h3>
          <p className="text-sm text-slate-500 mt-1">Define cashback rates by order type, customer tier, or promotional periods</p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="gap-2">
          <Plus className="w-4 h-4" />
          Add Rule
        </Button>
      </div>

      <div className="space-y-3">
        {rules.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-slate-500">No rules created yet. Create your first rule to get started.</p>
          </Card>
        ) : (
          rules.map((rule) => (
            <Card key={rule.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-semibold">{rule.name}</h4>
                    <Badge variant={rule.is_active ? "default" : "secondary"} className="text-xs">
                      {rule.is_active ? "Active" : "Inactive"}
                    </Badge>
                    <Badge variant="outline" className="text-xs capitalize">{rule.rule_type}</Badge>
                  </div>
                  
                  {rule.description && (
                    <p className="text-sm text-slate-600 mb-2">{rule.description}</p>
                  )}

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs mb-2">
                    {rule.order_type !== "all" && (
                      <div>
                        <p className="text-slate-500">Order Type</p>
                        <p className="font-medium capitalize">{rule.order_type}</p>
                      </div>
                    )}
                    {rule.customer_tier && (
                      <div>
                        <p className="text-slate-500">Tier</p>
                        <p className="font-medium">{rule.customer_tier}</p>
                      </div>
                    )}
                    {rule.promotional_period_name && (
                      <div>
                        <p className="text-slate-500">Period</p>
                        <p className="font-medium">{rule.promotional_period_name}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-slate-500">Priority</p>
                      <p className="font-medium">{rule.priority}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs bg-slate-50 p-2 rounded mb-2">
                    <div>
                      <p className="text-slate-500">Self</p>
                      <p className="font-semibold">{rule.self_cashback_percentage}%</p>
                    </div>
                    <div>
                      <p className="text-slate-500">L1</p>
                      <p className="font-semibold">{rule.level1_cashback_percentage}%</p>
                    </div>
                    <div>
                      <p className="text-slate-500">L2</p>
                      <p className="font-semibold">{rule.level2_cashback_percentage}%</p>
                    </div>
                    <div>
                      <p className="text-slate-500">L3</p>
                      <p className="font-semibold">{rule.level3_cashback_percentage}%</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Payout %</p>
                      <p className="font-semibold">{rule.payout_percentage}%</p>
                    </div>
                  </div>

                  {rule.start_date && rule.end_date && (
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Calendar className="w-3 h-3" />
                      {new Date(rule.start_date).toLocaleDateString()} - {new Date(rule.end_date).toLocaleDateString()}
                    </div>
                  )}
                </div>

                <div className="flex gap-2 ml-4">
                  <Button
                    onClick={() => handleOpenDialog(rule)}
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={() => setDeleteConfirm(rule)}
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRule ? "Edit Rule" : "Create Rule"}</DialogTitle>
            <DialogDescription>Configure cashback percentages and conditions</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Rule Name *</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Summer Promotion 2026"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="What is this rule for?"
                className="h-20"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Rule Type *</label>
                <select
                  value={formData.rule_type}
                  onChange={(e) => setFormData({ ...formData, rule_type: e.target.value })}
                  className="w-full border rounded px-3 py-2 text-sm"
                >
                  <option value="order_type">Order Type</option>
                  <option value="customer_tier">Customer Tier</option>
                  <option value="promotional">Promotional Period</option>
                </select>
              </div>

              {formData.rule_type === "order_type" && (
                <div>
                  <label className="text-sm font-medium">Order Type</label>
                  <select
                    value={formData.order_type}
                    onChange={(e) => setFormData({ ...formData, order_type: e.target.value })}
                    className="w-full border rounded px-3 py-2 text-sm"
                  >
                    <option value="all">All Types</option>
                    <option value="dine_in">Dine In</option>
                    <option value="takeaway">Takeaway</option>
                    <option value="delivery">Delivery</option>
                  </select>
                </div>
              )}

              {formData.rule_type === "customer_tier" && (
                <div>
                  <label className="text-sm font-medium">Customer Tier</label>
                  <Input
                    value={formData.customer_tier}
                    onChange={(e) => setFormData({ ...formData, customer_tier: e.target.value })}
                    placeholder="e.g., Gold, Silver, Bronze"
                  />
                </div>
              )}

              {formData.rule_type === "promotional" && (
                <div>
                  <label className="text-sm font-medium">Period Name</label>
                  <Input
                    value={formData.promotional_period_name}
                    onChange={(e) => setFormData({ ...formData, promotional_period_name: e.target.value })}
                    placeholder="e.g., Black Friday 2026"
                  />
                </div>
              )}
            </div>

            {formData.rule_type === "promotional" && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Start Date</label>
                  <Input
                    type="datetime-local"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">End Date</label>
                  <Input
                    type="datetime-local"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  />
                </div>
              </div>
            )}

            <div className="border-t pt-4">
              <h4 className="font-semibold text-sm mb-3">Cashback Percentages</h4>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div>
                  <label className="text-xs font-medium">Self %</label>
                  <Input
                    type="number"
                    value={formData.self_cashback_percentage}
                    onChange={(e) => setFormData({ ...formData, self_cashback_percentage: parseFloat(e.target.value) || 0 })}
                    min="0"
                    step="0.1"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium">Level 1 %</label>
                  <Input
                    type="number"
                    value={formData.level1_cashback_percentage}
                    onChange={(e) => setFormData({ ...formData, level1_cashback_percentage: parseFloat(e.target.value) || 0 })}
                    min="0"
                    step="0.1"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium">Level 2 %</label>
                  <Input
                    type="number"
                    value={formData.level2_cashback_percentage}
                    onChange={(e) => setFormData({ ...formData, level2_cashback_percentage: parseFloat(e.target.value) || 0 })}
                    min="0"
                    step="0.1"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium">Level 3 %</label>
                  <Input
                    type="number"
                    value={formData.level3_cashback_percentage}
                    onChange={(e) => setFormData({ ...formData, level3_cashback_percentage: parseFloat(e.target.value) || 0 })}
                    min="0"
                    step="0.1"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium">Payout %</label>
                  <Input
                    type="number"
                    value={formData.payout_percentage}
                    onChange={(e) => setFormData({ ...formData, payout_percentage: parseFloat(e.target.value) || 0 })}
                    min="0"
                    step="0.1"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Priority</label>
                <Input
                  type="number"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                  placeholder="Higher = higher priority"
                />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  />
                  <span className="text-sm font-medium">Active</span>
                </label>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Notes</label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Internal notes..."
                className="h-16"
              />
            </div>

            <div className="flex gap-2 justify-end border-t pt-4">
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {editingRule ? "Update Rule" : "Create Rule"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Rule</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteConfirm?.name}"? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate(deleteConfirm.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}