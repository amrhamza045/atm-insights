import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Trophy, Target } from "lucide-react";
import { toast } from "sonner";

export default function MilestoneManagement() {
  const [showDialog, setShowDialog] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [milestoneToDelete, setMilestoneToDelete] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    required_referrals: "",
    bonus_amount: "",
    color: "#f59e0b",
    is_active: true
  });

  const queryClient = useQueryClient();

  const { data: milestones = [] } = useQuery({
    queryKey: ["milestones"],
    queryFn: () => base44.entities.ReferralMilestone.list("-required_referrals")
  });

  const { data: achievements = [] } = useQuery({
    queryKey: ["achievements"],
    queryFn: () => base44.entities.MilestoneAchievement.list("-created_date")
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ReferralMilestone.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["milestones"] });
      toast.success("Milestone created successfully");
      handleCloseDialog();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ReferralMilestone.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["milestones"] });
      toast.success("Milestone updated successfully");
      handleCloseDialog();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ReferralMilestone.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["milestones"] });
      toast.success("Milestone deleted");
    }
  });

  const handleOpenDialog = (milestone = null) => {
    if (milestone) {
      setEditingMilestone(milestone);
      setFormData({
        name: milestone.name,
        description: milestone.description || "",
        required_referrals: milestone.required_referrals,
        bonus_amount: milestone.bonus_amount,
        color: milestone.color || "#f59e0b",
        is_active: milestone.is_active
      });
    } else {
      setEditingMilestone(null);
      setFormData({
        name: "",
        description: "",
        required_referrals: "",
        bonus_amount: "",
        color: "#f59e0b",
        is_active: true
      });
    }
    setShowDialog(true);
  };

  const handleCloseDialog = () => {
    setShowDialog(false);
    setEditingMilestone(null);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.required_referrals || !formData.bonus_amount) {
      toast.error("Please fill in all required fields");
      return;
    }

    const data = {
      ...formData,
      required_referrals: Number(formData.required_referrals),
      bonus_amount: Number(formData.bonus_amount)
    };

    if (editingMilestone) {
      await updateMutation.mutateAsync({ id: editingMilestone.id, data });
    } else {
      await createMutation.mutateAsync(data);
    }
  };

  const handleDelete = (milestone) => {
    setMilestoneToDelete(milestone);
    setShowDeleteDialog(true);
  };

  const confirmDelete = () => {
    if (milestoneToDelete) {
      deleteMutation.mutate(milestoneToDelete.id);
      setShowDeleteDialog(false);
      setMilestoneToDelete(null);
    }
  };

  const getMilestoneAchievements = (milestoneId) => {
    return achievements.filter(a => a.milestone_id === milestoneId).length;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Referral Milestones</h3>
          <p className="text-sm text-slate-500">Configure bonus rewards for referral achievements</p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="bg-amber-500 hover:bg-amber-600">
          <Plus className="w-4 h-4 mr-2" />
          Add Milestone
        </Button>
      </div>

      {/* Milestones List */}
      {milestones.length === 0 ? (
        <Card className="p-12 text-center border-0 shadow-sm">
          <Trophy className="w-12 h-12 mx-auto text-slate-300 mb-4" />
          <h3 className="font-medium text-slate-900">No milestones yet</h3>
          <p className="text-sm text-slate-500 mt-1">Create your first referral milestone to reward top referrers</p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {milestones.map((milestone) => (
            <Card key={milestone.id} className="border-0 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div 
                      className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${milestone.color}20` }}
                    >
                      <Trophy className="w-7 h-7" style={{ color: milestone.color }} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-slate-900">{milestone.name}</h4>
                        {!milestone.is_active && (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </div>
                      <p className="text-sm text-slate-500 mb-3">{milestone.description}</p>
                      <div className="flex flex-wrap items-center gap-3">
                        <Badge variant="outline" className="flex items-center gap-1">
                          <Target className="w-3 h-3" />
                          {milestone.required_referrals} referrals
                        </Badge>
                        <Badge className="bg-emerald-100 text-emerald-700">
                          £{milestone.bonus_amount} bonus
                        </Badge>
                        <Badge variant="secondary">
                          {getMilestoneAchievements(milestone.id)} achieved
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleOpenDialog(milestone)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleDelete(milestone)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
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

      {/* Edit/Create Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingMilestone ? "Edit Milestone" : "Create New Milestone"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Milestone Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Silver Referrer"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe the milestone..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="required_referrals">Required Referrals *</Label>
                <Input
                  id="required_referrals"
                  type="number"
                  min="1"
                  placeholder="5"
                  value={formData.required_referrals}
                  onChange={(e) => setFormData({ ...formData, required_referrals: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="bonus_amount">Bonus Amount (£) *</Label>
                <Input
                  id="bonus_amount"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="50.00"
                  value={formData.bonus_amount}
                  onChange={(e) => setFormData({ ...formData, bonus_amount: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="color">Color</Label>
              <div className="flex gap-2">
                <Input
                  id="color"
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="w-20"
                />
                <Input
                  type="text"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="flex-1"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancel
            </Button>
            <Button 
              onClick={handleSave}
              disabled={createMutation.isPending || updateMutation.isPending}
              className="bg-amber-500 hover:bg-amber-600"
            >
              {editingMilestone ? "Update" : "Create"} Milestone
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{milestoneToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-red-500 hover:bg-red-600"
            >
              Delete Milestone
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}