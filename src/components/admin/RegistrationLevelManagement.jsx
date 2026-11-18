import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, PoundSterling, Gift, Percent, Truck } from "lucide-react";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export default function RegistrationLevelManagement() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLevel, setEditingLevel] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [levelToDelete, setLevelToDelete] = useState(null);
  const [formData, setFormData] = useState({
    level_name: "",
    registration_fee: "",
    welcome_cashback_amount: "",
    permanent_discount_percentage: "",
    delivery_discount_percentage: "",
    self_cashback_percentage: "",
    description: "",
    sort_order: "",
    is_active: true
  });

  const queryClient = useQueryClient();

  const { data: levels = [] } = useQuery({
    queryKey: ["registrationLevels"],
    queryFn: () => base44.entities.RegistrationLevel.list("sort_order")
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.RegistrationLevel.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["registrationLevels"] });
      toast.success("Registration level created");
      handleClose();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.RegistrationLevel.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["registrationLevels"] });
      toast.success("Registration level updated");
      handleClose();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.RegistrationLevel.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["registrationLevels"] });
      toast.success("Registration level deleted");
    }
  });

  const handleOpen = (level = null) => {
    if (level) {
      setEditingLevel(level);
      setFormData({
        level_name: level.level_name || "",
        registration_fee: level.registration_fee || "",
        welcome_cashback_amount: level.welcome_cashback_amount || "",
        permanent_discount_percentage: level.permanent_discount_percentage || "",
        delivery_discount_percentage: level.delivery_discount_percentage || "",
        self_cashback_percentage: level.self_cashback_percentage || "",
        description: level.description || "",
        sort_order: level.sort_order || "",
        is_active: level.is_active !== false,
        is_default: level.is_default === true
      });
    } else {
      setEditingLevel(null);
      setFormData({
        level_name: "",
        registration_fee: "",
        welcome_cashback_amount: "",
        permanent_discount_percentage: "",
        delivery_discount_percentage: "",
        self_cashback_percentage: "",
        description: "",
        sort_order: levels.length,
        is_active: true,
        is_default: false
      });
    }
    setDialogOpen(true);
  };

  const handleClose = () => {
    setDialogOpen(false);
    setEditingLevel(null);
  };

  const handleSave = async () => {
    const data = {
      ...formData,
      registration_fee: parseFloat(formData.registration_fee) || 0,
      welcome_cashback_amount: parseFloat(formData.welcome_cashback_amount) || 0,
      permanent_discount_percentage: parseFloat(formData.permanent_discount_percentage) || 0,
      delivery_discount_percentage: parseFloat(formData.delivery_discount_percentage) || 0,
      self_cashback_percentage: parseFloat(formData.self_cashback_percentage) || 0,
      sort_order: parseInt(formData.sort_order) || 0
    };

    // Only one level can be the default: clear the flag on the others first.
    if (data.is_default) {
      await Promise.all(levels.filter((l) => l.is_default && l.id !== editingLevel?.id)
        .map((l) => base44.entities.RegistrationLevel.update(l.id, { is_default: false })));
    }

    if (editingLevel) {
      updateMutation.mutate({ id: editingLevel.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Registration Levels</h2>
          <p className="text-sm text-slate-500 mt-1">
            Configure different membership levels with unique benefits and welcome bonuses
          </p>
        </div>
        <Button onClick={() => handleOpen()} className="bg-amber-500 hover:bg-amber-600">
          <Plus className="w-4 h-4 mr-2" />
          Add Level
        </Button>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {levels.map((level) => (
          <Card key={level.id} className={!level.is_active ? "opacity-60" : ""}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <CardTitle className="text-lg">
                  {level.level_name}
                  {level.is_default && <Badge variant="outline" className="ml-2 text-xs">Default</Badge>}
                </CardTitle>
                <Badge variant={level.is_active ? "default" : "secondary"}>
                  {level.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>
              {level.description && (
                <CardDescription className="mt-2">{level.description}</CardDescription>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600 flex items-center gap-1">
                    <PoundSterling className="w-3 h-3" />
                    Registration Fee
                  </span>
                  <span className="font-semibold">£{(level.registration_fee || 0).toFixed(2)}</span>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600 flex items-center gap-1">
                    <Gift className="w-3 h-3" />
                    Welcome Cashback
                  </span>
                  <span className="font-semibold text-green-600">£{(level.welcome_cashback_amount || 0).toFixed(2)}</span>
                </div>

                {(level.permanent_discount_percentage || 0) > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600 flex items-center gap-1">
                      <Percent className="w-3 h-3" />
                      Purchase Discount
                    </span>
                    <span className="font-semibold">{level.permanent_discount_percentage}%</span>
                  </div>
                )}

                {(level.delivery_discount_percentage || 0) > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600 flex items-center gap-1">
                      <Truck className="w-3 h-3" />
                      Delivery Discount
                    </span>
                    <span className="font-semibold">{level.delivery_discount_percentage}%</span>
                  </div>
                )}

                {(level.self_cashback_percentage || 0) > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600 flex items-center gap-1">
                      <PoundSterling className="w-3 h-3" />
                      Self Cashback
                    </span>
                    <span className="font-semibold">{level.self_cashback_percentage}%</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <Button 
                  size="sm" 
                  variant="outline"
                  className="flex-1"
                  onClick={() => handleOpen(level)}
                >
                  <Pencil className="w-3 h-3 mr-1" />
                  Edit
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => {
                    setLevelToDelete(level);
                    setShowDeleteDialog(true);
                  }}
                  className="text-red-500 hover:text-red-700"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {levels.length === 0 && (
        <Card className="p-12 text-center">
          <h3 className="font-medium text-slate-900">No registration levels yet</h3>
          <p className="text-sm text-slate-500 mt-1">Create your first level to define membership tiers</p>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingLevel ? "Edit Registration Level" : "Create Registration Level"}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Level Name *</Label>
                <Input
                  value={formData.level_name}
                  onChange={(e) => setFormData({...formData, level_name: e.target.value})}
                  placeholder="e.g., Basic, Premium, VIP"
                />
              </div>
              <div className="space-y-2">
                <Label>Sort Order</Label>
                <Input
                  type="number"
                  value={formData.sort_order}
                  onChange={(e) => setFormData({...formData, sort_order: e.target.value})}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Describe the benefits of this level..."
                rows={2}
              />
            </div>

            <div className="border-t pt-4">
              <h3 className="font-semibold mb-3">Pricing & Welcome Bonus</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Registration Fee *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.registration_fee}
                    onChange={(e) => setFormData({...formData, registration_fee: e.target.value})}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Welcome Cashback Amount</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.welcome_cashback_amount}
                    onChange={(e) => setFormData({...formData, welcome_cashback_amount: e.target.value})}
                    placeholder="0.00"
                  />
                  <p className="text-xs text-slate-500">Fixed bonus given upon registration approval</p>
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="font-semibold mb-3">Member Benefits</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Permanent Discount %</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.permanent_discount_percentage}
                    onChange={(e) => setFormData({...formData, permanent_discount_percentage: e.target.value})}
                    placeholder="0"
                  />
                  <p className="text-xs text-slate-500">Discount on all purchases</p>
                </div>
                <div className="space-y-2">
                  <Label>Delivery Discount %</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.delivery_discount_percentage}
                    onChange={(e) => setFormData({...formData, delivery_discount_percentage: e.target.value})}
                    placeholder="0"
                  />
                  <p className="text-xs text-slate-500">Discount on delivery fees</p>
                </div>
                <div className="space-y-2">
                  <Label>Self Cashback %</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.self_cashback_percentage}
                    onChange={(e) => setFormData({...formData, self_cashback_percentage: e.target.value})}
                    placeholder="0"
                  />
                  <p className="text-xs text-slate-500">Cashback on own purchases</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <Label>Active</Label>
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({...formData, is_active: checked})}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Default level</Label>
                <p className="text-xs text-slate-500">Clients without a level are treated as this level</p>
              </div>
              <Switch
                checked={!!formData.is_default}
                onCheckedChange={(checked) => setFormData({...formData, is_default: checked})}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} className="bg-amber-500 hover:bg-amber-600">
              {editingLevel ? "Update" : "Create"} Level
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete registration level "{levelToDelete?.level_name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                deleteMutation.mutate(levelToDelete.id);
                setShowDeleteDialog(false);
                setLevelToDelete(null);
              }}
              className="bg-red-500 hover:bg-red-600"
            >
              Delete Level
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}