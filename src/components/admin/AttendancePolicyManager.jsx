import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Save, Clock, Settings, FileDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { DEFAULT_SHIFT_PRESETS, DEFAULT_LATE_TIERS, DEFAULT_EARLY_TIERS, to12h } from "@/components/utils/attendanceCalculator";

export default function AttendancePolicyManager() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(null);

  const { data: policies = [], isLoading } = useQuery({
    queryKey: ["attendancePolicies"],
    queryFn: () => base44.entities.AttendancePolicy.list("-created_date"),
  });

  const activePolicy = policies.find(p => p.is_active) || policies[0];

  const saveMutation = useMutation({
    mutationFn: (data) => {
      if (data.id) {
        return base44.entities.AttendancePolicy.update(data.id, data);
      }
      return base44.entities.AttendancePolicy.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendancePolicies"] });
      toast.success("Policy saved");
      setEditing(null);
    },
    onError: (e) => toast.error("Failed to save: " + e.message),
  });

  const activateMutation = useMutation({
    mutationFn: async (policyId) => {
      // Deactivate all others
      for (const p of policies) {
        if (p.id !== policyId && p.is_active) {
          await base44.entities.AttendancePolicy.update(p.id, { is_active: false });
        }
      }
      await base44.entities.AttendancePolicy.update(policyId, { is_active: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendancePolicies"] });
      toast.success("Policy activated");
    },
  });

  const [exportingId, setExportingId] = useState(null);

  const handleExportPDF = async (policy) => {
    setExportingId(policy.id);
    try {
      const response = await base44.functions.invoke('exportAttendancePolicy', {
        policy_id: policy.id,
      });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Attendance_Policy_${policy.policy_name.replace(/\s/g, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Policy PDF exported (Arabic + English)");
    } catch (e) {
      toast.error("Failed to export PDF: " + (e.message || 'Unknown error'));
    } finally {
      setExportingId(null);
    }
  };

  const handleNew = () => {
    setEditing({
      policy_name: "New Policy",
      is_active: true,
      overtime_rate_multiplier: 1.5,
      late_grace_minutes: 10,
      late_deduction_mode: "gradual_tiers",
      late_deduction_per_hour: 0,
      late_deduction_tiers: DEFAULT_LATE_TIERS,
      early_leave_deduction_mode: "gradual_tiers",
      early_leave_deduction_per_hour: 0,
      early_leave_deduction_tiers: DEFAULT_EARLY_TIERS,
      absence_penalty_amount: 0,
      shift_presets: DEFAULT_SHIFT_PRESETS,
      require_approval_for_payroll: true,
    });
  };

  const handleEdit = (policy) => {
    setEditing(JSON.parse(JSON.stringify(policy)));
  };

  const handleSave = () => {
    saveMutation.mutate(editing);
  };

  const updateField = (field, value) => {
    setEditing(prev => ({ ...prev, [field]: value }));
  };

  const updateTier = (field, index, key, value) => {
    const tiers = [...(editing[field] || [])];
    tiers[index] = { ...tiers[index], [key]: value };
    setEditing(prev => ({ ...prev, [field]: tiers }));
  };

  const addTier = (field) => {
    const tiers = [...(editing[field] || [])];
    tiers.push({ max_minutes: 30, deduction_amount: 50, label: "" });
    setEditing(prev => ({ ...prev, [field]: tiers }));
  };

  const removeTier = (field, index) => {
    const tiers = [...(editing[field] || [])];
    tiers.splice(index, 1);
    setEditing(prev => ({ ...prev, [field]: tiers }));
  };

  const updatePreset = (index, key, value) => {
    const presets = [...(editing.shift_presets || [])];
    presets[index] = { ...presets[index], [key]: value };
    setEditing(prev => ({ ...prev, shift_presets: presets }));
  };

  const addPreset = () => {
    const presets = [...(editing.shift_presets || [])];
    presets.push({ label: "", start_time: "09:00", end_time: "17:00" });
    setEditing(prev => ({ ...prev, shift_presets: presets }));
  };

  const removePreset = (index) => {
    const presets = [...(editing.shift_presets || [])];
    presets.splice(index, 1);
    setEditing(prev => ({ ...prev, shift_presets: presets }));
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 mb-1">Attendance Policies</h2>
          <p className="text-sm text-slate-500">Configure overtime, deductions, and shift presets for attendance approval</p>
        </div>
        <Button onClick={handleNew} className="gap-2">
          <Plus className="w-4 h-4" /> New Policy
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
        </div>
      ) : policies.length === 0 ? (
        <Card className="p-8 text-center">
          <Settings className="w-10 h-10 mx-auto text-slate-300 mb-3" />
          <p className="text-sm text-slate-500 mb-4">No attendance policies yet. Create one to get started.</p>
          <Button onClick={handleNew} className="gap-2">
            <Plus className="w-4 h-4" /> Create First Policy
          </Button>
        </Card>
      ) : (
        <div className="grid gap-3">
          {policies.map(policy => (
            <Card key={policy.id} className={policy.is_active ? "border-green-300 bg-green-50/30" : ""}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{policy.policy_name}</h3>
                      {policy.is_active && <Badge className="bg-green-600">Active</Badge>}
                    </div>
                    <div className="flex gap-4 mt-2 text-xs text-slate-600 flex-wrap">
                      <span>Overtime: {policy.overtime_rate_multiplier}x</span>
                      <span>Late grace: {policy.late_grace_minutes} min</span>
                      <span>Late mode: {policy.late_deduction_mode}</span>
                      <span>Shifts: {policy.shift_presets?.length || 0}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {!policy.is_active && (
                      <Button size="sm" variant="outline" onClick={() => activateMutation.mutate(policy.id)}>
                        Activate
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => handleEdit(policy)}>Edit</Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleExportPDF(policy)}
                      disabled={exportingId === policy.id}
                      className="gap-1.5"
                    >
                      {exportingId === policy.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <FileDown className="w-3.5 h-3.5" />
                      )}
                      Export PDF
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {editing && (
        <Card className="border-2 border-slate-300">
          <CardHeader>
            <CardTitle className="text-base">{editing.id ? "Edit Policy" : "New Policy"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Basic */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label>Policy Name</Label>
                <Input value={editing.policy_name} onChange={e => updateField("policy_name", e.target.value)} />
              </div>
              <div>
                <Label>Overtime Rate Multiplier</Label>
                <Input type="number" step="0.1" value={editing.overtime_rate_multiplier} onChange={e => updateField("overtime_rate_multiplier", parseFloat(e.target.value) || 1.5)} />
                <p className="text-xs text-slate-500 mt-1">e.g., 1.5 = 1.5x hourly rate for overtime hours</p>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label>Late Grace Period (minutes)</Label>
                <Input type="number" value={editing.late_grace_minutes} onChange={e => updateField("late_grace_minutes", parseInt(e.target.value) || 0)} />
                <p className="text-xs text-slate-500 mt-1">No penalty if late within this window</p>
              </div>
              <div>
                <Label>Absence Penalty (EGP)</Label>
                <Input type="number" value={editing.absence_penalty_amount} onChange={e => updateField("absence_penalty_amount", parseFloat(e.target.value) || 0)} />
                <p className="text-xs text-slate-500 mt-1">Fixed deduction for a full no-show day</p>
              </div>
            </div>

            <div>
              <Label>Require Approval for Payroll</Label>
              <Select
                value={editing.require_approval_for_payroll ? "true" : "false"}
                onValueChange={v => updateField("require_approval_for_payroll", v === "true")}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Yes - only approved records count</SelectItem>
                  <SelectItem value="false">No - all attendance records count</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Shift Presets */}
            <div className="border rounded-lg p-4 bg-slate-50">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-sm flex items-center gap-2"><Clock className="w-4 h-4" /> Shift Presets</h4>
                <Button size="sm" variant="outline" onClick={() => addPreset()} className="gap-1">
                  <Plus className="w-3 h-3" /> Add
                </Button>
              </div>
              <p className="text-xs text-slate-500 mb-3">
                These appear in the dropdown when approving attendance. Use 24h format (e.g., 18:00 for 6 PM).
                For overnight shifts, end time can be earlier than start (e.g., 18:00-02:00).
              </p>
              <div className="space-y-2">
                {(editing.shift_presets || []).map((preset, i) => (
                  <div key={i} className="grid grid-cols-[1fr_auto_auto_auto] gap-2 items-center">
                    <Input
                      placeholder="Label (e.g., 10:00 AM - 06:00 PM)"
                      value={preset.label}
                      onChange={e => updatePreset(i, "label", e.target.value)}
                    />
                    <Input
                      type="time"
                      value={preset.start_time}
                      onChange={e => updatePreset(i, "start_time", e.target.value)}
                      className="w-32"
                    />
                    <Input
                      type="time"
                      value={preset.end_time}
                      onChange={e => updatePreset(i, "end_time", e.target.value)}
                      className="w-32"
                    />
                    <Button size="icon" variant="ghost" onClick={() => removePreset(i)} className="text-red-500">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Late Deduction Tiers */}
            <div className="border rounded-lg p-4 bg-amber-50/50">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-sm">Late Arrival Deductions</h4>
                <Select value={editing.late_deduction_mode} onValueChange={v => updateField("late_deduction_mode", v)}>
                  <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gradual_tiers">Gradual Tiers</SelectItem>
                    <SelectItem value="fixed_hourly">Fixed per Hour</SelectItem>
                    <SelectItem value="no_penalty">No Penalty</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {editing.late_deduction_mode === "fixed_hourly" && (
                <div>
                  <Label>EGP per hour of lateness</Label>
                  <Input type="number" step="0.01" value={editing.late_deduction_per_hour} onChange={e => updateField("late_deduction_per_hour", parseFloat(e.target.value) || 0)} />
                </div>
              )}

              {editing.late_deduction_mode === "gradual_tiers" && (
                <div className="space-y-2">
                  <p className="text-xs text-slate-500">Tiers evaluated in order. First tier whose max minutes ≥ actual late minutes applies.</p>
                  {(editing.late_deduction_tiers || []).map((tier, i) => (
                    <div key={i} className="grid grid-cols-[1fr_120px_120px_auto] gap-2 items-center">
                      <Input placeholder="Label (e.g., 11-20 min)" value={tier.label || ""} onChange={e => updateTier("late_deduction_tiers", i, "label", e.target.value)} />
                      <Input type="number" placeholder="Max min" value={tier.max_minutes} onChange={e => updateTier("late_deduction_tiers", i, "max_minutes", parseInt(e.target.value) || 0)} />
                      <Input type="number" step="0.01" placeholder="EGP" value={tier.deduction_amount} onChange={e => updateTier("late_deduction_tiers", i, "deduction_amount", parseFloat(e.target.value) || 0)} />
                      <Button size="icon" variant="ghost" onClick={() => removeTier("late_deduction_tiers", i)} className="text-red-500">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  <Button size="sm" variant="outline" onClick={() => addTier("late_deduction_tiers")} className="gap-1">
                    <Plus className="w-3 h-3" /> Add Tier
                  </Button>
                </div>
              )}
            </div>

            {/* Early Leave Tiers */}
            <div className="border rounded-lg p-4 bg-blue-50/50">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-sm">Early Leave Deductions</h4>
                <Select value={editing.early_leave_deduction_mode} onValueChange={v => updateField("early_leave_deduction_mode", v)}>
                  <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gradual_tiers">Gradual Tiers</SelectItem>
                    <SelectItem value="fixed_hourly">Fixed per Hour</SelectItem>
                    <SelectItem value="no_penalty">No Penalty</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {editing.early_leave_deduction_mode === "fixed_hourly" && (
                <div>
                  <Label>EGP per hour of early leave</Label>
                  <Input type="number" step="0.01" value={editing.early_leave_deduction_per_hour} onChange={e => updateField("early_leave_deduction_per_hour", parseFloat(e.target.value) || 0)} />
                </div>
              )}

              {editing.early_leave_deduction_mode === "gradual_tiers" && (
                <div className="space-y-2">
                  <p className="text-xs text-slate-500">Tiers evaluated in order.</p>
                  {(editing.early_leave_deduction_tiers || []).map((tier, i) => (
                    <div key={i} className="grid grid-cols-[1fr_120px_120px_auto] gap-2 items-center">
                      <Input placeholder="Label" value={tier.label || ""} onChange={e => updateTier("early_leave_deduction_tiers", i, "label", e.target.value)} />
                      <Input type="number" placeholder="Max min" value={tier.max_minutes} onChange={e => updateTier("early_leave_deduction_tiers", i, "max_minutes", parseInt(e.target.value) || 0)} />
                      <Input type="number" step="0.01" placeholder="EGP" value={tier.deduction_amount} onChange={e => updateTier("early_leave_deduction_tiers", i, "deduction_amount", parseFloat(e.target.value) || 0)} />
                      <Button size="icon" variant="ghost" onClick={() => removeTier("early_leave_deduction_tiers", i)} className="text-red-500">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  <Button size="sm" variant="outline" onClick={() => addTier("early_leave_deduction_tiers")} className="gap-1">
                    <Plus className="w-3 h-3" /> Add Tier
                  </Button>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 justify-end pt-2 border-t">
              <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saveMutation.isPending} className="gap-2">
                <Save className="w-4 h-4" /> {saveMutation.isPending ? "Saving..." : "Save Policy"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}