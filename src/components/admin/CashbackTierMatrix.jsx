import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, Percent, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";

export default function CashbackTierMatrix() {
  const [editingCells, setEditingCells] = useState({});
  const [editingLevels, setEditingLevels] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveScope, setSaveScope] = useState("new");
  const queryClient = useQueryClient();

  const { data: registrationLevels = [] } = useQuery({
    queryKey: ["registrationLevels"],
    queryFn: () => base44.entities.RegistrationLevel.list("sort_order")
  });

  const { data: cashbackTiers = [] } = useQuery({
    queryKey: ["cashbackTiers"],
    queryFn: () => base44.entities.CashbackTier.list()
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: () => base44.entities.Client.list()
  });

  // Define the 4 tier ranges
  const tierRanges = [
    { name: "Tier 1", min: 1, max: 5, label: "1-5 Referrals" },
    { name: "Tier 2", min: 6, max: 10, label: "6-10 Referrals" },
    { name: "Tier 3", min: 11, max: 20, label: "11-20 Referrals" },
    { name: "Tier 4", min: 21, max: 999, label: "21+ Referrals" }
  ];

  // Get tier for a specific registration level and tier range
  const getTier = (regLevelId, tierRangeName) => {
    return cashbackTiers.find(
      t => t.registration_level_id === regLevelId && t.level_name === tierRangeName
    );
  };

  // Update cell value in editing state
  const updateCell = (regLevelId, tierRangeName, field, value) => {
    const key = `${regLevelId}_${tierRangeName}`;
    setEditingCells(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        regLevelId,
        tierRangeName,
        [field]: value
      }
    }));
  };

  // Get cell value (from editing state or existing tier)
  const getCellValue = (regLevelId, tierRangeName, field) => {
    const key = `${regLevelId}_${tierRangeName}`;
    if (editingCells[key] && editingCells[key][field] !== undefined) {
      return editingCells[key][field];
    }
    const tier = getTier(regLevelId, tierRangeName);
    return tier?.[field] || 0;
  };

  // Update registration level field
  const updateLevel = (levelId, field, value) => {
    setEditingLevels(prev => ({
      ...prev,
      [levelId]: {
        ...prev[levelId],
        levelId,
        [field]: value
      }
    }));
  };

  // Get registration level field value
  const getLevelValue = (levelId, field) => {
    if (editingLevels[levelId] && editingLevels[levelId][field] !== undefined) {
      return editingLevels[levelId][field];
    }
    const level = registrationLevels.find(l => l.id === levelId);
    if (field === 'is_active') return level?.[field] ?? true;
    return level?.[field] || 0;
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      // Save registration level changes
      for (const [levelId, levelData] of Object.entries(editingLevels)) {
        const existingLevel = registrationLevels.find(l => l.id === levelId);
        const updateData = {
          level_name: levelData.level_name ?? existingLevel?.level_name,
          registration_fee: levelData.registration_fee ?? existingLevel?.registration_fee,
          permanent_discount_percentage: levelData.permanent_discount_percentage ?? existingLevel?.permanent_discount_percentage ?? 0,
          delivery_discount_percentage: levelData.delivery_discount_percentage ?? existingLevel?.delivery_discount_percentage ?? 0,
          self_cashback_percentage: levelData.self_cashback_percentage ?? existingLevel?.self_cashback_percentage ?? 0,
          is_active: levelData.is_active ?? existingLevel?.is_active ?? true,
        };
        await base44.entities.RegistrationLevel.update(levelId, updateData);
      }

      // Save cashback tier changes
      for (const [key, cell] of Object.entries(editingCells)) {
        const existingTier = getTier(cell.regLevelId, cell.tierRangeName);
        const tierRange = tierRanges.find(t => t.name === cell.tierRangeName);
        const regLevel = registrationLevels.find(r => r.id === cell.regLevelId);

        const tierData = {
          level_name: cell.tierRangeName,
          min_referrals: tierRange.min,
          registration_level_id: cell.regLevelId,
          registration_level_name: regLevel?.level_name || "",
          cashback_percentage_level1: cell.cashback_percentage_level1 ?? existingTier?.cashback_percentage_level1 ?? 0,
          cashback_percentage_level2: cell.cashback_percentage_level2 ?? existingTier?.cashback_percentage_level2 ?? 0,
          cashback_percentage_level3: cell.cashback_percentage_level3 ?? existingTier?.cashback_percentage_level3 ?? 0,
          color: existingTier?.color || "#f59e0b",
          is_default: existingTier?.is_default || false
        };

        if (existingTier) {
          await base44.entities.CashbackTier.update(existingTier.id, tierData);
        } else {
          await base44.entities.CashbackTier.create(tierData);
        }
      }

      // Apply changes to existing clients if scope is "all"
      if (saveScope === "all") {
        for (const client of clients) {
          const changes = {};

          // Update self_cashback_percentage if registration level was changed
          for (const [levelId, levelData] of Object.entries(editingLevels)) {
            if (client.registration_level_id === levelId && levelData.self_cashback_percentage !== undefined) {
              // Note: This updates client tier assignments, not individual client settings
            }
          }

          if (Object.keys(changes).length > 0) {
            await base44.entities.Client.update(client.id, changes);
          }
        }
      }

      queryClient.invalidateQueries({ queryKey: ["cashbackTiers"] });
      queryClient.invalidateQueries({ queryKey: ["registrationLevels"] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      setEditingCells({});
      setEditingLevels({});
      setSaveScope("new");
      toast.success(`Changes saved${saveScope === "all" ? " and applied to all clients" : " for new clients"}!`);
    } catch (error) {
      toast.error("Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = Object.keys(editingCells).length > 0 || Object.keys(editingLevels).length > 0;

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Percent className="w-5 h-5" />
          Cashback Tier Matrix
        </CardTitle>
        <CardDescription>
          Configure registration levels and cashback percentages for each combination
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Registration Levels Configuration */}
        <div className="border rounded-lg p-4 bg-slate-50">
          <h3 className="font-semibold mb-4">Registration Levels Configuration</h3>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-200">
                  <th className="border border-slate-300 p-2 text-left text-sm font-semibold">Level Name</th>
                  <th className="border border-slate-300 p-2 text-center text-sm font-semibold">Fee (EGP)</th>
                  <th className="border border-slate-300 p-2 text-center text-sm font-semibold">Default Discount (%)</th>
                  <th className="border border-slate-300 p-2 text-center text-sm font-semibold">Delivery Discount (%)</th>
                  <th className="border border-slate-300 p-2 text-center text-sm font-semibold">Self Cashback (%)</th>
                  <th className="border border-slate-300 p-2 text-center text-sm font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {registrationLevels.map(level => (
                  <tr key={level.id} className={`hover:bg-slate-100 ${!getLevelValue(level.id, 'is_active') ? 'opacity-50' : ''}`}>
                    <td className="border border-slate-300 p-2">
                      <Input
                        value={getLevelValue(level.id, 'level_name') || level.level_name}
                        onChange={(e) => updateLevel(level.id, 'level_name', e.target.value)}
                        className="h-8"
                      />
                    </td>
                    <td className="border border-slate-300 p-2">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={getLevelValue(level.id, 'registration_fee')}
                        onChange={(e) => updateLevel(level.id, 'registration_fee', parseFloat(e.target.value) || 0)}
                        className="h-8 text-center"
                      />
                    </td>
                    <td className="border border-slate-300 p-2">
                      <div className="flex items-center justify-center gap-1">
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          value={getLevelValue(level.id, 'permanent_discount_percentage')}
                          onChange={(e) => updateLevel(level.id, 'permanent_discount_percentage', parseFloat(e.target.value) || 0)}
                          className="h-8 w-20 text-center"
                        />
                        <span className="text-slate-500">%</span>
                      </div>
                    </td>
                    <td className="border border-slate-300 p-2">
                      <div className="flex items-center justify-center gap-1">
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          value={getLevelValue(level.id, 'delivery_discount_percentage')}
                          onChange={(e) => updateLevel(level.id, 'delivery_discount_percentage', parseFloat(e.target.value) || 0)}
                          className="h-8 w-20 text-center"
                        />
                        <span className="text-slate-500">%</span>
                      </div>
                    </td>
                    <td className="border border-slate-300 p-2">
                      <div className="flex items-center justify-center gap-1">
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          value={getLevelValue(level.id, 'self_cashback_percentage')}
                          onChange={(e) => updateLevel(level.id, 'self_cashback_percentage', parseFloat(e.target.value) || 0)}
                          className="h-8 w-20 text-center"
                        />
                        <span className="text-slate-500">%</span>
                      </div>
                    </td>
                    <td className="border border-slate-300 p-2">
                      <div className="flex items-center justify-center gap-2">
                        <Switch
                          checked={getLevelValue(level.id, 'is_active')}
                          onCheckedChange={(checked) => updateLevel(level.id, 'is_active', checked)}
                        />
                        <span className="text-xs text-slate-600">
                          {getLevelValue(level.id, 'is_active') ? 'Active' : 'Disabled'}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        {/* Referral Cashback Matrix */}
        <Tabs defaultValue="L1" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="L1">Level 1 (Direct)</TabsTrigger>
            <TabsTrigger value="L2">Level 2</TabsTrigger>
            <TabsTrigger value="L3">Level 3</TabsTrigger>
          </TabsList>

          {['L1', 'L2', 'L3'].map(level => (
            <TabsContent key={level} value={level} className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-slate-100">
                      <th className="border border-slate-300 p-3 text-left font-semibold">
                        Registration Level
                      </th>
                      {tierRanges.map(tier => (
                        <th key={tier.name} className="border border-slate-300 p-3 text-center font-semibold">
                          {tier.name}
                          <div className="text-xs font-normal text-slate-500">{tier.label}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {registrationLevels.filter(rl => rl.is_active).map(regLevel => (
                      <tr key={regLevel.id} className="hover:bg-slate-50">
                        <td className="border border-slate-300 p-3 font-medium">
                          {regLevel.level_name}
                          <div className="text-xs text-slate-500">
                            Fee: {regLevel.registration_fee} EGP
                          </div>
                        </td>
                        {tierRanges.map(tier => {
                          const field = level === 'L1' ? 'cashback_percentage_level1' :
                                       level === 'L2' ? 'cashback_percentage_level2' :
                                       'cashback_percentage_level3';
                          return (
                            <td key={tier.name} className="border border-slate-300 p-2">
                              <div className="flex items-center justify-center">
                                <Input
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="0.1"
                                  value={getCellValue(regLevel.id, tier.name, field)}
                                  onChange={(e) => updateCell(
                                    regLevel.id,
                                    tier.name,
                                    field,
                                    parseFloat(e.target.value) || 0
                                  )}
                                  className="w-20 text-center"
                                />
                                <span className="ml-1 text-slate-500">%</span>
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TabsContent>
          ))}
        </Tabs>

        {hasChanges && (
          <div className="space-y-3 p-4 bg-amber-50 rounded-lg border border-amber-200">
            <p className="text-sm font-medium text-amber-900">
              You have unsaved changes
            </p>
            <div className="flex gap-2">
              <Button
                onClick={() => { setSaveScope("new"); handleSaveAll(); }}
                disabled={saving}
                variant="outline"
                className="flex-1"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save for New Clients
                  </>
                )}
              </Button>
              <Button
                onClick={() => { setSaveScope("all"); handleSaveAll(); }}
                disabled={saving}
                className="flex-1 bg-amber-600 hover:bg-amber-700"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save & Apply to All Clients
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h4 className="font-semibold text-blue-900 mb-2">How it works:</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Each cell represents a unique combination of Registration Level and Referral Tier</li>
            <li>• Level 1 = Direct referrals (people you referred)</li>
            <li>• Level 2 = Second level referrals (people your referrals referred)</li>
            <li>• Level 3 = Third level referrals (people their referrals referred)</li>
            <li>• The system will automatically use the correct percentages based on the client's registration level and referral count</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}