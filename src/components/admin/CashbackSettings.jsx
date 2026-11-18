import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Trash2, Percent, Star, Save, PoundSterling, Users } from "lucide-react";
import { toast } from "sonner";
import CashbackTierMatrix from "./CashbackTierMatrix";

export default function CashbackSettings() {
  const [newTier, setNewTier] = useState({
    level_name: "",
    min_referrals: 0,
    cashback_percentage_level1: 10,
    cashback_percentage_level2: 5,
    cashback_percentage_level3: 2,
    self_cashback_percentage: 0,
    color: "#f59e0b"
  });
  const [editingTier, setEditingTier] = useState(null);
  const [pendingAction, setPendingAction] = useState(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [welcomeSettings, setWelcomeSettings] = useState({
    registration_fee: 0,
    welcome_cashback_percentage: 0,
    payout_percent: 0,
    rewards_discounts_percent: 0
  });
  const [savingWelcomeScope, setSavingWelcomeScope] = useState(null);
  const [newLevel, setNewLevel] = useState({
    level_name: "",
    registration_fee: 0,
    welcome_cashback_amount: 0,
    permanent_discount_percentage: 0,
    delivery_discount_percentage: 0,
    description: "",
    sort_order: 0
  });
  const [editingLevel, setEditingLevel] = useState(null);

  const queryClient = useQueryClient();

  const { data: tiers = [] } = useQuery({
    queryKey: ["cashbackTiers"],
    queryFn: () => base44.entities.CashbackTier.list("min_referrals")
  });

  const { data: systemSettings } = useQuery({
    queryKey: ["systemSettings"],
    queryFn: async () => {
      const settings = await base44.entities.SystemSettings.filter({ setting_key: "welcome_cashback" });
      return settings[0] || null;
    }
  });

  const { data: registrationLevels = [] } = useQuery({
    queryKey: ["registrationLevels"],
    queryFn: () => base44.entities.RegistrationLevel.list("sort_order")
  });

  // Initialize welcome settings when data loads
  useState(() => {
    if (systemSettings) {
      setWelcomeSettings({
        registration_fee: systemSettings.registration_fee || 0,
        welcome_cashback_percentage: systemSettings.welcome_cashback_percentage || 0,
        payout_percent: systemSettings.payout_percent || 0,
        rewards_discounts_percent: systemSettings.rewards_discounts_percent || 0
      });
    }
  }, [systemSettings]);
  
  // Always keep welcome settings values defined
  useState(() => {
    if (!welcomeSettings.registration_fee && !welcomeSettings.welcome_cashback_percentage) {
      // Keep current values, they're already initialized
    }
  }, []);

  const createTierMutation = useMutation({
    mutationFn: (data) => base44.entities.CashbackTier.create(data),
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ["cashbackTiers"] });
      await updateAllClientTiers();
      toast.success("Tier added and clients updated");
      setNewTier({ level_name: "", min_referrals: 0, cashback_percentage_level1: 10, cashback_percentage_level2: 5, cashback_percentage_level3: 2, self_cashback_percentage: 0, color: "#f59e0b" });
    }
  });

  const updateTierMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CashbackTier.update(id, data),
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ["cashbackTiers"] });
      await updateAllClientTiers();
      toast.success("Tier updated and clients refreshed");
      setEditingTier(null);
    }
  });

  const deleteTierMutation = useMutation({
    mutationFn: (id) => base44.entities.CashbackTier.delete(id),
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ["cashbackTiers"] });
      await updateAllClientTiers();
      toast.success("Tier deleted and clients updated");
    }
  });

  const saveWelcomeSettingsMutation = useMutation({
    mutationFn: async (data) => {
      if (systemSettings) {
        return base44.entities.SystemSettings.update(systemSettings.id, data);
      } else {
        return base44.entities.SystemSettings.create({ ...data, setting_key: "welcome_cashback" });
      }
    },
    onSuccess: async (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["systemSettings"] });
      
      // Apply to all clients if scope is "all"
      if (variables.scope === "all") {
        const clients = await base44.entities.Client.list();
        const welcomeAmount = (welcomeSettings.registration_fee * welcomeSettings.welcome_cashback_percentage) / 100;
        
        for (const client of clients) {
          await base44.entities.Client.update(client.id, {
            cashback_earned: (client.cashback_earned || 0) + welcomeAmount
          });
        }
        
        queryClient.invalidateQueries({ queryKey: ["clients"] });
        toast.success(`Settings saved and £${welcomeAmount.toFixed(2)} added to all clients`);
      } else {
        toast.success("Settings saved! Will apply to new clients upon approval");
      }
      setSavingWelcomeScope(null);
    }
  });

  const handleSaveWelcomeSettings = (scope) => {
    saveWelcomeSettingsMutation.mutate({ ...welcomeSettings, scope });
  };

  const updateAllClientTiers = async () => {
    const clients = await base44.entities.Client.list();
    const updatedTiers = await base44.entities.CashbackTier.list("min_referrals");
    
    for (const client of clients) {
      const directReferrals = clients.filter(c => c.referred_by === client.id);
      
      // Filter tiers by client's registration level
      let relevantTiers = updatedTiers;
      if (client.registration_level_id) {
        const tiersForLevel = updatedTiers.filter(t => t.registration_level_id === client.registration_level_id);
        if (tiersForLevel.length > 0) {
          relevantTiers = tiersForLevel;
        }
      }
      
      const sortedTiers = [...relevantTiers].sort((a, b) => b.min_referrals - a.min_referrals);
      const clientTier = sortedTiers.find(t => directReferrals.length >= t.min_referrals) || 
                        relevantTiers.find(t => t.is_default);
      
      if (clientTier && (client.current_tier_id !== clientTier.id)) {
        await base44.entities.Client.update(client.id, {
          current_tier_id: clientTier.id,
          current_tier_name: clientTier.level_name
        });
      }
    }
  };

  const handleAddTier = (e) => {
    e.preventDefault();
    setPendingAction({ type: 'add', data: newTier });
    setShowConfirmDialog(true);
  };

  const handleDeleteTier = (tierId) => {
    setPendingAction({ type: 'delete', data: tierId });
    setShowConfirmDialog(true);
  };

  const handleUpdateTier = (tier) => {
    setPendingAction({ type: 'update', data: tier });
    setShowConfirmDialog(true);
  };

  const executeAction = () => {
    if (pendingAction?.type === 'add') {
      createTierMutation.mutate(pendingAction.data);
    } else if (pendingAction?.type === 'update') {
      const { id, ...data } = pendingAction.data;
      updateTierMutation.mutate({ id, data });
    } else if (pendingAction?.type === 'delete') {
      deleteTierMutation.mutate(pendingAction.data);
    }
    setShowConfirmDialog(false);
    setPendingAction(null);
  };

  const welcomeCashbackAmount = (welcomeSettings.registration_fee * welcomeSettings.welcome_cashback_percentage) / 100;

  const createLevelMutation = useMutation({
    mutationFn: (data) => base44.entities.RegistrationLevel.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["registrationLevels"] });
      toast.success("Registration level added");
      setNewLevel({ level_name: "", registration_fee: 0, welcome_cashback_amount: 0, permanent_discount_percentage: 0, delivery_discount_percentage: 0, description: "", sort_order: 0 });
    }
  });

  const updateLevelMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.RegistrationLevel.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["registrationLevels"] });
      toast.success("Registration level updated");
      setEditingLevel(null);
    }
  });

  const deleteLevelMutation = useMutation({
    mutationFn: (id) => base44.entities.RegistrationLevel.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["registrationLevels"] });
      toast.success("Registration level deleted");
    }
  });

  return (
    <div className="space-y-6">
      {/* Registration Levels */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PoundSterling className="w-5 h-5" />
            Registration Levels
          </CardTitle>
          <CardDescription>
            Define multiple registration levels with different fees and welcome cashback
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Existing Levels */}
          <div className="space-y-3">
            <Label>Current Levels</Label>
            {registrationLevels.length === 0 ? (
              <p className="text-sm text-slate-500 py-4 text-center bg-slate-50 rounded-lg">
                No registration levels defined yet
              </p>
            ) : (
              <div className="space-y-2">
                {registrationLevels.map((level) => (
                  <div key={level.id} className="p-3 bg-slate-50 rounded-lg">
                    {editingLevel?.id === level.id ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label className="text-xs">Level Name</Label>
                            <Input
                              value={editingLevel.level_name}
                              onChange={(e) => setEditingLevel({...editingLevel, level_name: e.target.value})}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Registration Fee (£)</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={editingLevel.registration_fee}
                              onChange={(e) => setEditingLevel({...editingLevel, registration_fee: parseFloat(e.target.value) || 0})}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Welcome Cashback (£)</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={editingLevel.welcome_cashback_amount || 0}
                              onChange={(e) => setEditingLevel({...editingLevel, welcome_cashback_amount: parseFloat(e.target.value) || 0})}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Permanent Discount (%)</Label>
                            <Input
                              type="number"
                              step="0.1"
                              value={editingLevel.permanent_discount_percentage || 0}
                              onChange={(e) => setEditingLevel({...editingLevel, permanent_discount_percentage: parseFloat(e.target.value) || 0})}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Delivery Discount (%)</Label>
                            <Input
                              type="number"
                              step="0.1"
                              value={editingLevel.delivery_discount_percentage || 0}
                              onChange={(e) => setEditingLevel({...editingLevel, delivery_discount_percentage: parseFloat(e.target.value) || 0})}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Sort Order</Label>
                            <Input
                              type="number"
                              value={editingLevel.sort_order}
                              onChange={(e) => setEditingLevel({...editingLevel, sort_order: parseInt(e.target.value) || 0})}
                            />
                          </div>
                          <div className="space-y-1 col-span-2">
                            <Label className="text-xs">Description</Label>
                            <Input
                              value={editingLevel.description || ""}
                              onChange={(e) => setEditingLevel({...editingLevel, description: e.target.value})}
                              placeholder="Optional description"
                            />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => updateLevelMutation.mutate({ id: editingLevel.id, data: editingLevel })}
                            className="flex-1"
                          >
                            <Save className="w-3 h-3 mr-1" />
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingLevel(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{level.level_name}</div>
                          <p className="text-sm text-slate-500">
                            Fee: £{level.registration_fee} • Welcome: £{level.welcome_cashback_amount || 0} • Discount: {level.permanent_discount_percentage || 0}% • Delivery: {level.delivery_discount_percentage || 0}%
                          </p>
                          {level.description && (
                            <p className="text-xs text-slate-400 mt-1">{level.description}</p>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditingLevel(level)}
                            className="text-slate-500 hover:text-slate-700"
                          >
                            <Save className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteLevelMutation.mutate(level.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add New Level */}
          <form onSubmit={(e) => { e.preventDefault(); createLevelMutation.mutate(newLevel); }} className="space-y-4 pt-4 border-t">
            <Label>Add New Registration Level</Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs">Level Name</Label>
                <Input
                  placeholder="e.g., Basic, Premium"
                  value={newLevel.level_name}
                  onChange={(e) => setNewLevel({...newLevel, level_name: e.target.value})}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Registration Fee (£)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={newLevel.registration_fee}
                  onChange={(e) => setNewLevel({...newLevel, registration_fee: parseFloat(e.target.value) || 0})}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Welcome Cashback (£)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={newLevel.welcome_cashback_amount}
                  onChange={(e) => setNewLevel({...newLevel, welcome_cashback_amount: parseFloat(e.target.value) || 0})}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Permanent Discount (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={newLevel.permanent_discount_percentage}
                  onChange={(e) => setNewLevel({...newLevel, permanent_discount_percentage: parseFloat(e.target.value) || 0})}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Delivery Discount (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={newLevel.delivery_discount_percentage}
                  onChange={(e) => setNewLevel({...newLevel, delivery_discount_percentage: parseFloat(e.target.value) || 0})}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Sort Order</Label>
                <Input
                  type="number"
                  value={newLevel.sort_order}
                  onChange={(e) => setNewLevel({...newLevel, sort_order: parseInt(e.target.value) || 0})}
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label className="text-xs">Description (Optional)</Label>
                <Input
                  value={newLevel.description}
                  onChange={(e) => setNewLevel({...newLevel, description: e.target.value})}
                  placeholder="Describe the benefits of this level"
                />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={createLevelMutation.isPending}>
              <Plus className="w-4 h-4 mr-2" />
              Add Registration Level
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Welcome Cashback Settings */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PoundSterling className="w-5 h-5" />
            Welcome Cashback Settings
          </CardTitle>
          <CardDescription>
            Set registration fee and welcome cashback for new clients
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveWelcomeSettings} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Registration Fee (£)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={welcomeSettings.registration_fee}
                  onChange={(e) => setWelcomeSettings({...welcomeSettings, registration_fee: parseFloat(e.target.value) || 0})}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label>Welcome Cashback (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={welcomeSettings.welcome_cashback_percentage}
                  onChange={(e) => setWelcomeSettings({...welcomeSettings, welcome_cashback_percentage: parseFloat(e.target.value) || 0})}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label>Payout Percent (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={welcomeSettings.payout_percent}
                  onChange={(e) => setWelcomeSettings({...welcomeSettings, payout_percent: parseFloat(e.target.value) || 0})}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label>Rewards & Discounts (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={welcomeSettings.rewards_discounts_percent}
                  onChange={(e) => setWelcomeSettings({...welcomeSettings, rewards_discounts_percent: parseFloat(e.target.value) || 0})}
                  placeholder="0"
                />
              </div>
            </div>
            <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
              <p className="text-sm text-slate-700">
                <span className="font-semibold">Calculated Welcome Cashback:</span>{" "}
                <span className="text-lg font-bold text-amber-700">
                  £{welcomeCashbackAmount.toFixed(2)}
                </span>
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Choose whether to apply to new clients only or all existing clients as well
              </p>
            </div>
            <div className="flex gap-2">
              <Button 
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => handleSaveWelcomeSettings("new")}
                disabled={saveWelcomeSettingsMutation.isPending}
              >
                <Save className="w-4 h-4 mr-2" />
                {saveWelcomeSettingsMutation.isPending ? "Saving..." : "Save & Apply to New Clients"}
              </Button>
              <Button 
                type="button"
                className="flex-1"
                onClick={() => handleSaveWelcomeSettings("all")}
                disabled={saveWelcomeSettingsMutation.isPending}
              >
                <Users className="w-4 h-4 mr-2" />
                {saveWelcomeSettingsMutation.isPending ? "Saving..." : "Save & Apply to All Clients"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Cashback Tier Matrix */}
      <CashbackTierMatrix />

      {/* Legacy Cashback Tiers (kept for backward compatibility) */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Percent className="w-5 h-5" />
            Legacy Cashback Tiers
          </CardTitle>
          <CardDescription>
            Old tier system (use Matrix above for new settings)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
        {/* Existing Tiers */}
        <div className="space-y-3">
          <Label>Current Tiers</Label>
          {tiers.length === 0 ? (
            <p className="text-sm text-slate-500 py-4 text-center bg-slate-50 rounded-lg">
              No tiers defined yet
            </p>
          ) : (
            <div className="space-y-2">
              {tiers.map((tier) => (
                <div 
                  key={tier.id} 
                  className="p-3 bg-slate-50 rounded-lg"
                >
                  {editingTier?.id === tier.id ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-3 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs">Tier Name</Label>
                          <Input
                            value={editingTier.level_name}
                            onChange={(e) => setEditingTier({...editingTier, level_name: e.target.value})}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Min Referrals</Label>
                          <Input
                            type="number"
                            min="0"
                            value={editingTier.min_referrals}
                            onChange={(e) => setEditingTier({...editingTier, min_referrals: parseInt(e.target.value)})}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Color</Label>
                          <Input
                            type="color"
                            value={editingTier.color}
                            onChange={(e) => setEditingTier({...editingTier, color: e.target.value})}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Level 1 Cashback %</Label>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            value={editingTier.cashback_percentage_level1 || editingTier.cashback_percentage || 0}
                            onChange={(e) => setEditingTier({...editingTier, cashback_percentage_level1: parseFloat(e.target.value)})}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Level 2 Cashback %</Label>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            value={editingTier.cashback_percentage_level2 || 0}
                            onChange={(e) => setEditingTier({...editingTier, cashback_percentage_level2: parseFloat(e.target.value)})}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Level 3 Cashback %</Label>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            value={editingTier.cashback_percentage_level3 || 0}
                            onChange={(e) => setEditingTier({...editingTier, cashback_percentage_level3: parseFloat(e.target.value)})}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Self-Cashback %</Label>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            value={editingTier.self_cashback_percentage || 0}
                            onChange={(e) => setEditingTier({...editingTier, self_cashback_percentage: parseFloat(e.target.value)})}
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleUpdateTier(editingTier)}
                          className="flex-1"
                        >
                          <Save className="w-3 h-3 mr-1" />
                          Save Changes
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingTier(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: tier.color || "#f59e0b" }}
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{tier.level_name}</span>
                            {tier.is_default && (
                              <Badge variant="outline" className="text-xs">
                                <Star className="w-3 h-3 mr-1" />
                                Default
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-slate-500">
                            {tier.min_referrals}+ referrals • L1: {tier.cashback_percentage_level1 || tier.cashback_percentage || 0}% • L2: {tier.cashback_percentage_level2 || 0}% • L3: {tier.cashback_percentage_level3 || 0}% • Self: {tier.self_cashback_percentage || 0}%
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditingTier({
                            ...tier,
                            cashback_percentage_level1: tier.cashback_percentage_level1 || tier.cashback_percentage || 0,
                            cashback_percentage_level2: tier.cashback_percentage_level2 || 0,
                            cashback_percentage_level3: tier.cashback_percentage_level3 || 0
                          })}
                          className="text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                        >
                          <Save className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteTier(tier.id)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add New Tier */}
        <form onSubmit={handleAddTier} className="space-y-4 pt-4 border-t">
          <Label>Add New Tier</Label>
          <div className="grid grid-cols-3 gap-3">
             <div className="space-y-2">
               <Label className="text-xs">Tier Name</Label>
               <Input
                 placeholder="e.g., Bronze"
                 value={newTier.level_name}
                 onChange={(e) => setNewTier({...newTier, level_name: e.target.value})}
                 required
               />
             </div>
             <div className="space-y-2">
               <Label className="text-xs">Min Referrals</Label>
               <Input
                 type="number"
                 min="0"
                 value={newTier.min_referrals}
                 onChange={(e) => setNewTier({...newTier, min_referrals: parseInt(e.target.value)})}
                 required
               />
             </div>
             <div className="space-y-2">
               <Label className="text-xs">Level 1 Cashback % (Direct Referral)</Label>
               <Input
                 type="number"
                 min="0"
                 max="100"
                 step="0.1"
                 value={newTier.cashback_percentage_level1}
                 onChange={(e) => setNewTier({...newTier, cashback_percentage_level1: parseFloat(e.target.value)})}
                 required
               />
             </div>
             <div className="space-y-2">
               <Label className="text-xs">Level 2 Cashback % (2nd Up)</Label>
               <Input
                 type="number"
                 min="0"
                 max="100"
                 step="0.1"
                 value={newTier.cashback_percentage_level2}
                 onChange={(e) => setNewTier({...newTier, cashback_percentage_level2: parseFloat(e.target.value)})}
                 required
               />
             </div>
             <div className="space-y-2">
               <Label className="text-xs">Level 3 Cashback % (3rd Up)</Label>
               <Input
                 type="number"
                 min="0"
                 max="100"
                 step="0.1"
                 value={newTier.cashback_percentage_level3}
                 onChange={(e) => setNewTier({...newTier, cashback_percentage_level3: parseFloat(e.target.value)})}
                 required
               />
             </div>
             <div className="space-y-2">
               <Label className="text-xs">Self-Cashback %</Label>
               <Input
                 type="number"
                 min="0"
                 max="100"
                 step="0.1"
                 value={newTier.self_cashback_percentage}
                 onChange={(e) => setNewTier({...newTier, self_cashback_percentage: parseFloat(e.target.value)})}
                 required
               />
             </div>
             <div className="space-y-2">
               <Label className="text-xs">Color</Label>
               <Input
                 type="color"
                 value={newTier.color}
                 onChange={(e) => setNewTier({...newTier, color: e.target.value})}
               />
             </div>
           </div>
          <Button 
            type="submit" 
            className="w-full"
            disabled={createTierMutation.isPending}
          >
            <Save className="w-4 h-4 mr-2" />
            Save New Tier
          </Button>
        </form>
      </CardContent>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Changes</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingAction?.type === 'add' 
                ? `This will add the "${pendingAction.data?.level_name}" tier and automatically update all clients' tier assignments based on their referral counts.`
                : pendingAction?.type === 'update'
                ? `This will update the "${pendingAction.data?.level_name}" tier and automatically refresh all clients' tier assignments.`
                : 'This will delete the tier and automatically reassign all clients to appropriate tiers.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={executeAction}
              className="bg-amber-500 hover:bg-amber-600"
            >
              Confirm & Update All Clients
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </Card>
    </div>
  );
}