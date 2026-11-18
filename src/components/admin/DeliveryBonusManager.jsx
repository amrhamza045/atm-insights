import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trophy, Plus, Pencil, Trash2, Gift, TrendingUp, PoundSterling, CheckCircle, Clock } from "lucide-react";
import { toast } from "sonner";

export default function DeliveryBonusManager() {
  const [showTierForm, setShowTierForm] = useState(false);
  const [editingTier, setEditingTier] = useState(null);
  const [tierData, setTierData] = useState({ name: "", milestone_count: 50, bonus_amount: 100, description: "", recurrence_type: "one_time", is_active: true });
  const queryClient = useQueryClient();

  const { data: tiers = [] } = useQuery({
    queryKey: ["deliveryBonusTiers"],
    queryFn: () => base44.entities.DeliveryBonusTier.list("-milestone_count")
  });

  const { data: persons = [] } = useQuery({
    queryKey: ["deliveryPersons"],
    queryFn: () => base44.entities.DeliveryPerson.list("-total_deliveries")
  });

  const { data: bonusRecords = [] } = useQuery({
    queryKey: ["deliveryBonusRecords"],
    queryFn: () => base44.entities.DeliveryBonusRecord.list("-earned_date", 100)
  });

  const createTierMutation = useMutation({
    mutationFn: (data) => base44.entities.DeliveryBonusTier.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deliveryBonusTiers"] });
      toast.success("Bonus tier created");
      setShowTierForm(false);
    }
  });

  const updateTierMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.DeliveryBonusTier.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deliveryBonusTiers"] });
      toast.success("Bonus tier updated");
      setShowTierForm(false);
      setEditingTier(null);
    }
  });

  const deleteTierMutation = useMutation({
    mutationFn: (id) => base44.entities.DeliveryBonusTier.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deliveryBonusTiers"] });
      toast.success("Bonus tier deleted");
    }
  });

  const markPaidMutation = useMutation({
    mutationFn: ({ id }) => base44.entities.DeliveryBonusRecord.update(id, { status: "paid", paid_date: new Date().toISOString() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deliveryBonusRecords"] });
      toast.success("Bonus marked as paid");
    }
  });

  const handleSaveTier = () => {
    if (!tierData.name || !tierData.milestone_count || !tierData.bonus_amount) {
      toast.error("Please fill in all required fields");
      return;
    }
    if (editingTier) {
      updateTierMutation.mutate({ id: editingTier.id, data: tierData });
    } else {
      createTierMutation.mutate(tierData);
    }
  };

  const openEditTier = (tier) => {
    setEditingTier(tier);
    setTierData({
      name: tier.name,
      milestone_count: tier.milestone_count,
      bonus_amount: tier.bonus_amount,
      description: tier.description || "",
      recurrence_type: tier.recurrence_type || "one_time",
      is_active: tier.is_active !== false
    });
    setShowTierForm(true);
  };

  const openNewTier = () => {
    setEditingTier(null);
    setTierData({ name: "", milestone_count: 50, bonus_amount: 100, description: "", recurrence_type: "one_time", is_active: true });
    setShowTierForm(true);
  };

  // Compute per-person bonus stats
  const personStats = persons.map(person => {
    const personBonuses = bonusRecords.filter(r => r.delivery_person_id === person.id);
    const totalEarned = personBonuses.reduce((sum, r) => sum + (r.bonus_amount || 0), 0);
    const pendingBonuses = personBonuses.filter(r => r.status === "pending");
    const pendingAmount = pendingBonuses.reduce((sum, r) => sum + (r.bonus_amount || 0), 0);

    // Find next milestone
    const activeTiers = tiers.filter(t => t.is_active !== false).sort((a, b) => a.milestone_count - b.milestone_count);
    let nextTier = null;
    for (const tier of activeTiers) {
      const earnedForThisTier = personBonuses.filter(r => r.bonus_tier_id === tier.id);
      if (tier.recurrence_type === "recurring") {
        const timesEarned = earnedForThisTier.length;
        const nextMilestone = (timesEarned + 1) * tier.milestone_count;
        if (person.total_deliveries < nextMilestone) {
          nextTier = { tier, target: nextMilestone, remaining: nextMilestone - (person.total_deliveries || 0) };
          break;
        }
      } else {
        if (earnedForThisTier.length === 0 && (person.total_deliveries || 0) < tier.milestone_count) {
          nextTier = { tier, target: tier.milestone_count, remaining: tier.milestone_count - (person.total_deliveries || 0) };
          break;
        }
      }
    }

    return { person, totalEarned, pendingCount: pendingBonuses.length, pendingAmount, nextTier };
  });

  const totalPending = bonusRecords.filter(r => r.status === "pending").reduce((sum, r) => sum + (r.bonus_amount || 0), 0);
  const totalPaid = bonusRecords.filter(r => r.status === "paid").reduce((sum, r) => sum + (r.bonus_amount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Bonus Tiers</p>
              <p className="text-lg font-bold text-slate-900">{tiers.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Pending Payout</p>
              <p className="text-lg font-bold text-slate-900">{totalPending.toFixed(0)} EGP</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Total Paid</p>
              <p className="text-lg font-bold text-slate-900">{totalPaid.toFixed(0)} EGP</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-violet-100 flex items-center justify-center">
              <PoundSterling className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Total Awarded</p>
              <p className="text-lg font-bold text-slate-900">{(totalPending + totalPaid).toFixed(0)} EGP</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bonus Tiers */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5" />
              Delivery Bonus Milestones
            </CardTitle>
            <Button onClick={openNewTier} size="sm" className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Milestone
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {tiers.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Trophy className="w-12 h-12 mx-auto mb-2 text-slate-300" />
              <p>No bonus milestones yet</p>
              <p className="text-sm mt-1">Create milestones to incentivize delivery drivers</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
              {tiers.sort((a, b) => a.milestone_count - b.milestone_count).map(tier => (
                <div key={tier.id} className={`border rounded-lg p-4 ${tier.is_active === false ? "opacity-50" : ""}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                        <Trophy className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{tier.name}</p>
                        <p className="text-xs text-slate-500">{tier.milestone_count} deliveries</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditTier(tier)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600" onClick={() => deleteTierMutation.mutate(tier.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <p className="text-2xl font-bold text-green-600">{tier.bonus_amount} EGP</p>
                    <Badge variant={tier.is_active === false ? "secondary" : "default"}>
                      {tier.is_active === false ? "Inactive" : "Active"}
                    </Badge>
                  </div>
                  {tier.recurrence_type === "recurring" && (
                    <Badge variant="outline" className="mt-2 text-xs">Recurring (every {tier.milestone_count} deliveries)</Badge>
                  )}
                  {tier.description && <p className="text-xs text-slate-500 mt-2">{tier.description}</p>}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Driver Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Driver Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          {personStats.length === 0 ? (
            <div className="text-center py-6 text-slate-500">
              <p>No delivery persons yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {personStats.map(({ person, totalEarned, pendingCount, pendingAmount, nextTier }) => (
                <div key={person.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center font-semibold text-blue-700">
                        {person.name?.charAt(0)?.toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{person.name}</p>
                        <p className="text-xs text-slate-500">{person.total_deliveries || 0} total deliveries</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-green-600">{totalEarned.toFixed(0)} EGP earned</p>
                      {pendingCount > 0 && (
                        <p className="text-xs text-warning-600">{pendingAmount.toFixed(0)} EGP pending ({pendingCount})</p>
                      )}
                    </div>
                  </div>
                  {nextTier ? (
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
                        <span>Next: {nextTier.tier.name} ({nextTier.target} deliveries)</span>
                        <span>{nextTier.remaining} to go</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{ width: `${Math.min(100, ((person.total_deliveries || 0) / nextTier.target) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-green-600 font-medium mt-1">All milestones achieved!</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bonus History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="w-5 h-5" />
            Bonus History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {bonusRecords.length === 0 ? (
            <div className="text-center py-6 text-slate-500">
              <Gift className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              <p>No bonuses earned yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {bonusRecords.map(record => (
                <div key={record.id} className="flex items-center justify-between border rounded-lg p-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center">
                      <Trophy className="w-4 h-4 text-amber-600" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{record.delivery_person_name}</p>
                      <p className="text-xs text-slate-500">
                        {record.bonus_tier_name} · {record.milestone_count} deliveries ·{" "}
                        {record.earned_date ? new Date(record.earned_date).toLocaleDateString() : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="font-semibold text-green-600">{record.bonus_amount} EGP</p>
                    {record.status === "pending" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => markPaidMutation.mutate({ id: record.id })}
                        disabled={markPaidMutation.isPending}
                      >
                        Mark Paid
                      </Button>
                    ) : (
                      <Badge className="bg-green-100 text-green-800">Paid</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tier Form Dialog */}
      <Dialog open={showTierForm} onOpenChange={(open) => {
        setShowTierForm(open);
        if (!open) setEditingTier(null);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTier ? "Edit" : "Add"} Bonus Milestone</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Milestone Name *</Label>
              <Input
                value={tierData.name}
                onChange={(e) => setTierData({ ...tierData, name: e.target.value })}
                placeholder="e.g., 50 Deliveries Bonus"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Deliveries Required *</Label>
                <Input
                  type="number"
                  value={tierData.milestone_count}
                  onChange={(e) => setTierData({ ...tierData, milestone_count: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label>Bonus Amount (EGP) *</Label>
                <Input
                  type="number"
                  value={tierData.bonus_amount}
                  onChange={(e) => setTierData({ ...tierData, bonus_amount: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div>
              <Label>Recurrence Type</Label>
              <Select
                value={tierData.recurrence_type}
                onValueChange={(value) => setTierData({ ...tierData, recurrence_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="one_time">One-time (earned once when milestone reached)</SelectItem>
                  <SelectItem value="recurring">Recurring (earned every N deliveries)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Description</Label>
              <Input
                value={tierData.description}
                onChange={(e) => setTierData({ ...tierData, description: e.target.value })}
                placeholder="Optional description"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowTierForm(false)} className="flex-1">Cancel</Button>
              <Button onClick={handleSaveTier} disabled={createTierMutation.isPending || updateTierMutation.isPending} className="flex-1 bg-blue-600 hover:bg-blue-700">
                {editingTier ? "Update" : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}