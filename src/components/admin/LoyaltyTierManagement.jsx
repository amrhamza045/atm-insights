import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Award, Plus, Edit, Trash2, Crown, Star } from "lucide-react";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export default function LoyaltyTierManagement() {
  const [editingTier, setEditingTier] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [tierToDelete, setTierToDelete] = useState(null);
  const queryClient = useQueryClient();

  const { data: tiers = [] } = useQuery({
    queryKey: ["loyaltyTiers"],
    queryFn: () => base44.entities.LoyaltyTier.list()
  });

  const sortedTiers = [...tiers].sort((a, b) => a.tier_level - b.tier_level);

  const saveTierMutation = useMutation({
    mutationFn: async (tierData) => {
      if (editingTier?.id) {
        await base44.entities.LoyaltyTier.update(editingTier.id, tierData);
      } else {
        await base44.entities.LoyaltyTier.create(tierData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loyaltyTiers"] });
      setEditingTier(null);
      setIsCreating(false);
      toast.success("Loyalty tier saved successfully");
    }
  });

  const deleteTierMutation = useMutation({
    mutationFn: (tierId) => base44.entities.LoyaltyTier.delete(tierId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loyaltyTiers"] });
      toast.success("Tier deleted");
    }
  });

  const TierForm = ({ tier, onClose }) => {
    const [formData, setFormData] = useState(tier || {
      tier_name: "",
      tier_level: tiers.length + 1,
      min_cashback_earned: 0,
      min_successful_payouts: 0,
      payout_percentage_bonus: 0,
      min_payout_reduction: 0,
      priority_support: false,
      exclusive_promotions: false,
      color: "#94a3b8",
      icon: "award",
      description: ""
    });

    return (
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{tier ? "Edit Tier" : "Create New Tier"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tier Name *</Label>
                <Input
                  value={formData.tier_name}
                  onChange={(e) => setFormData({ ...formData, tier_name: e.target.value })}
                  placeholder="e.g., Gold"
                />
              </div>
              <div>
                <Label>Tier Level *</Label>
                <Input
                  type="number"
                  value={formData.tier_level}
                  onChange={(e) => setFormData({ ...formData, tier_level: parseInt(e.target.value) })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Min. Total Cashback Earned (£)</Label>
                <Input
                  type="number"
                  value={formData.min_cashback_earned}
                  onChange={(e) => setFormData({ ...formData, min_cashback_earned: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label>Min. Successful Payouts</Label>
                <Input
                  type="number"
                  value={formData.min_successful_payouts}
                  onChange={(e) => setFormData({ ...formData, min_successful_payouts: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-semibold mb-3">Tier Benefits</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Payout % Bonus</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.payout_percentage_bonus}
                    onChange={(e) => setFormData({ ...formData, payout_percentage_bonus: parseFloat(e.target.value) || 0 })}
                    placeholder="e.g., 5 for +5%"
                  />
                </div>
                <div>
                  <Label>Min. Payout Reduction (£)</Label>
                  <Input
                    type="number"
                    value={formData.min_payout_reduction}
                    onChange={(e) => setFormData({ ...formData, min_payout_reduction: parseFloat(e.target.value) || 0 })}
                    placeholder="e.g., 10 for -£10"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="flex items-center justify-between">
                  <Label>Priority Support</Label>
                  <Switch
                    checked={formData.priority_support}
                    onCheckedChange={(checked) => setFormData({ ...formData, priority_support: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Exclusive Promotions</Label>
                  <Switch
                    checked={formData.exclusive_promotions}
                    onCheckedChange={(checked) => setFormData({ ...formData, exclusive_promotions: checked })}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Color (Hex)</Label>
                <Input
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  placeholder="#94a3b8"
                />
              </div>
              <div>
                <Label>Icon Name</Label>
                <Input
                  value={formData.icon}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  placeholder="award, star, crown"
                />
              </div>
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe the benefits of this tier..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={() => saveTierMutation.mutate(formData)} disabled={saveTierMutation.isPending}>
              {saveTierMutation.isPending ? "Saving..." : "Save Tier"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Loyalty Tier Management</h3>
          <p className="text-sm text-slate-500">Define tier levels and benefits based on client activity</p>
        </div>
        <Button onClick={() => setIsCreating(true)} className="bg-amber-500 hover:bg-amber-600">
          <Plus className="w-4 h-4 mr-2" />
          Add Tier
        </Button>
      </div>

      {sortedTiers.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-slate-500">
            No loyalty tiers defined. Create your first tier to get started.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {sortedTiers.map((tier) => (
            <Card key={tier.id} className="border-2" style={{ borderColor: tier.color }}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div 
                        className="w-10 h-10 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: tier.color + "20" }}
                      >
                        {tier.icon === "crown" ? <Crown className="w-5 h-5" style={{ color: tier.color }} /> :
                         tier.icon === "star" ? <Star className="w-5 h-5" style={{ color: tier.color }} /> :
                         <Award className="w-5 h-5" style={{ color: tier.color }} />}
                      </div>
                      <div>
                        <h4 className="font-bold text-lg">{tier.tier_name}</h4>
                        <Badge variant="outline" className="mt-1">Level {tier.tier_level}</Badge>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-3">
                      <div className="text-sm">
                        <span className="text-slate-500">Requirements:</span>
                        <p className="font-medium">£{tier.min_cashback_earned}+ earned</p>
                        <p className="font-medium">{tier.min_successful_payouts}+ payouts</p>
                      </div>
                      <div className="text-sm">
                        <span className="text-slate-500">Benefits:</span>
                        {tier.payout_percentage_bonus > 0 && (
                          <p className="font-medium">+{tier.payout_percentage_bonus}% payout</p>
                        )}
                        {tier.min_payout_reduction > 0 && (
                          <p className="font-medium">-£{tier.min_payout_reduction} min payout</p>
                        )}
                        {tier.priority_support && <p className="font-medium">Priority Support</p>}
                        {tier.exclusive_promotions && <p className="font-medium">Exclusive Promotions</p>}
                      </div>
                    </div>

                    {tier.description && (
                      <p className="text-sm text-slate-600">{tier.description}</p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setEditingTier(tier)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => {
                        setTierToDelete(tier);
                        setShowDeleteDialog(true);
                      }}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {(isCreating || editingTier) && (
        <TierForm 
          tier={editingTier} 
          onClose={() => {
            setIsCreating(false);
            setEditingTier(null);
          }} 
        />
      )}

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete loyalty tier "{tierToDelete?.tier_name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                deleteTierMutation.mutate(tierToDelete.id);
                setShowDeleteDialog(false);
                setTierToDelete(null);
              }}
              className="bg-red-500 hover:bg-red-600"
            >
              Delete Tier
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}