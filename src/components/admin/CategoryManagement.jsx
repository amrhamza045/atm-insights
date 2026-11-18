import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Trash2, Tag, Save } from "lucide-react";
import { toast } from "sonner";

export default function CategoryManagement() {
  const [newCategory, setNewCategory] = useState({
    name: "",
    description: "",
    icon: "Gift"
  });
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);

  const queryClient = useQueryClient();

  const { data: categories = [] } = useQuery({
    queryKey: ["rewardCategories"],
    queryFn: () => base44.entities.RewardCategory.list("-created_date")
  });

  const createCategoryMutation = useMutation({
    mutationFn: (data) => base44.entities.RewardCategory.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rewardCategories"] });
      toast.success("Category added successfully");
      setNewCategory({ name: "", description: "", icon: "Gift" });
    }
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: (id) => base44.entities.RewardCategory.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rewardCategories"] });
      toast.success("Category deleted");
    }
  });

  const handleAddCategory = (e) => {
    e.preventDefault();
    setPendingAction({ type: 'add', data: newCategory });
    setShowConfirmDialog(true);
  };

  const handleDeleteCategory = (categoryId) => {
    setPendingAction({ type: 'delete', data: categoryId });
    setShowConfirmDialog(true);
  };

  const executeAction = () => {
    if (pendingAction?.type === 'add') {
      createCategoryMutation.mutate(pendingAction.data);
    } else if (pendingAction?.type === 'delete') {
      deleteCategoryMutation.mutate(pendingAction.data);
    }
    setShowConfirmDialog(false);
    setPendingAction(null);
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Tag className="w-5 h-5" />
          Reward Categories
        </CardTitle>
        <CardDescription>
          Define custom categories for organizing rewards
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Existing Categories */}
        <div className="space-y-3">
          <Label>Current Categories</Label>
          {categories.length === 0 ? (
            <p className="text-sm text-slate-500 py-4 text-center bg-slate-50 rounded-lg">
              No categories defined yet
            </p>
          ) : (
            <div className="space-y-2">
              {categories.map((category) => (
                <div 
                  key={category.id} 
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                >
                  <div>
                    <span className="font-medium">{category.name}</span>
                    {category.description && (
                      <p className="text-sm text-slate-500">{category.description}</p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteCategory(category.id)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add New Category */}
        <form onSubmit={handleAddCategory} className="space-y-4 pt-4 border-t">
          <Label>Add New Category</Label>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label className="text-xs">Category Name</Label>
              <Input
                placeholder="e.g., Premium Experiences"
                value={newCategory.name}
                onChange={(e) => setNewCategory({...newCategory, name: e.target.value})}
                required
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Description (Optional)</Label>
              <Input
                placeholder="Brief description of this category"
                value={newCategory.description}
                onChange={(e) => setNewCategory({...newCategory, description: e.target.value})}
              />
            </div>
          </div>
          <Button 
            type="submit" 
            className="w-full"
            disabled={createCategoryMutation.isPending}
          >
            <Save className="w-4 h-4 mr-2" />
            Save New Category
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
                ? `This will add the "${pendingAction.data?.name}" category. You'll be able to use it when creating or editing rewards.`
                : 'This will delete the category. Existing rewards using this category will keep their category name, but you won\'t be able to select it for new rewards.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={executeAction}
              className="bg-amber-500 hover:bg-amber-600"
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}