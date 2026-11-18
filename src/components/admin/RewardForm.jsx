import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";

export default function RewardForm({ open, onOpenChange, reward, onSave, isSaving }) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    cashback_cost: "",
    category: "",
    is_redeemable: true,
    is_variable_cost: false,
    image_url: ""
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["rewardCategories"],
    queryFn: () => base44.entities.RewardCategory.list("-created_date")
  });

  useEffect(() => {
    if (reward) {
      setFormData(reward);
    } else {
      setFormData({
        name: "",
        description: "",
        cashback_cost: "",
        category: categories[0]?.name || "",
        is_redeemable: true,
        is_variable_cost: false,
        image_url: ""
      });
    }
  }, [reward, open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{reward ? "Edit Reward" : "Create New Reward"}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Reward Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="e.g., £10 Dining Voucher"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Describe what this reward offers..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cost">Cashback Cost *</Label>
                <Input
                  id="cost"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.cashback_cost}
                  onChange={(e) => setFormData({...formData, cashback_cost: parseFloat(e.target.value)})}
                  placeholder={formData.is_variable_cost ? "0 (ignored for variable cost)" : "0.00"}
                  required={!formData.is_variable_cost}
                  disabled={formData.is_variable_cost}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select 
                  value={formData.category} 
                  onValueChange={(value) => setFormData({...formData, category: value})}
                >
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat.id} value={cat.name}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="image">Image URL</Label>
              <Input
                id="image"
                type="url"
                value={formData.image_url}
                onChange={(e) => setFormData({...formData, image_url: e.target.value})}
                placeholder="https://example.com/image.jpg"
              />
            </div>

            <div className="flex items-center justify-between py-2">
              <Label htmlFor="variable">Variable Cost (Full Payment)</Label>
              <Switch
                id="variable"
                checked={formData.is_variable_cost}
                onCheckedChange={(checked) => setFormData({...formData, is_variable_cost: checked, cashback_cost: checked ? 0 : formData.cashback_cost})}
              />
            </div>

            <div className="flex items-center justify-between py-2">
              <Label htmlFor="redeemable">Available for redemption</Label>
              <Switch
                id="redeemable"
                checked={formData.is_redeemable}
                onCheckedChange={(checked) => setFormData({...formData, is_redeemable: checked})}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving} className="bg-amber-500 hover:bg-amber-600">
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {reward ? "Update" : "Create"} Reward
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}