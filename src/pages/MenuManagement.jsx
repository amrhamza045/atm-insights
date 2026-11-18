import { useState } from "react";
import { brandName } from "@/lib/brandName";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import useScreenTabs from "@/hooks/useScreenTabs";
import ClosedTabsNotice from "@/components/modules/ClosedTabsNotice";
import { Plus, Pencil, Trash2, Upload, Tag, Check, ChevronUp, ChevronDown, ChefHat, Coffee, Search, PoundSterling } from "lucide-react";
import { toast } from "sonner";
import MenuItemRecipeDialog from "@/components/admin/MenuItemRecipeDialog";
import AIMenuInsights from "@/components/admin/AIMenuInsights";
import { formatCurrency } from "@/components/utils/currencyFormatter";
import MenuItemsTab from "@/components/admin/MenuItemsTab";
import FoodCostAnalysis from "@/components/admin/FoodCostAnalysis";
import { usePreparationAreas } from "@/components/hooks/usePreparationAreas";
import BranchInventoryTransferCard from "@/components/admin/BranchInventoryTransferCard";
import { ArrowRightLeft } from "lucide-react";
import { useBranch } from "@/components/branches/BranchContext";

export default function MenuManagement() {
  const { selectedBranch, selectedBranchId } = useBranch();
  const [showBranchTransfer, setShowBranchTransfer] = useState(false);
  // Tabs closed in Admin › Modules (Food Cost Analysis also follows its module) are left out.
  const screenTabs = useScreenTabs("MenuManagement");
  const firstTab = screenTabs.pick("items", ["items", "missing-recipe", "food-cost", "ai-insights", "sections", "categories", "options"]);
  const { data: prepAreas = [] } = usePreparationAreas();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [optionDialogOpen, setOptionDialogOpen] = useState(false);
  const [itemOptionsDialogOpen, setItemOptionsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingOption, setEditingOption] = useState(null);
  const [selectedItemForOptions, setSelectedItemForOptions] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    category: "",
    image_url: "",
    available: true,
    visible_website: true,
    visible_pos: true,
    sizes: [],
    tax_exempt: false,
    service_exempt: false
  });
  const [newSize, setNewSize] = useState({ name: "", price: "", indirect_price: "" });
  const [categoryFormData, setCategoryFormData] = useState({
    name: "",
    description: "",
    section_id: "",
    section_name: "",
    image_url: "",
    sort_order: 0,
    is_active: true,
    visible_website: true,
    visible_pos: true,
    tax_exempt: false,
    service_exempt: false
  });
  const [sectionDialogOpen, setSectionDialogOpen] = useState(false);
  const [editingSection, setEditingSection] = useState(null);
  const [sectionFormData, setSectionFormData] = useState({
    name: "",
    description: "",
    sort_order: 0,
    is_default: false,
    is_active: true,
    visible_website: true,
    visible_pos: true,
    tax_exempt: false,
    service_exempt: false
  });
  const [optionFormData, setOptionFormData] = useState({
    name: "",
    description: "",
    option_type: "single_select",
    max_selections: "",
    is_mandatory: true,
    values: [],
    required_for_order: false,
    is_active: true
  });
  const [newOptionValue, setNewOptionValue] = useState({ label: "", price_modifier: 0 });
  const [selectedOptionsForItem, setSelectedOptionsForItem] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [showRecipeManager, setShowRecipeManager] = useState(false);
  const [selectedItemForRecipe, setSelectedItemForRecipe] = useState(null);
  const [stationDialogOpen, setStationDialogOpen] = useState(false);
  const [selectedCategoryForStation, setSelectedCategoryForStation] = useState(null);
  const [categoryStation, setCategoryStation] = useState("kitchen");
  const [bulkPriceDialogOpen, setBulkPriceDialogOpen] = useState(false);
  const [missingRecipeCategoryFilter, setMissingRecipeCategoryFilter] = useState("all");
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedSections, setSelectedSections] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [selectedOptions, setSelectedOptions] = useState([]);

  const queryClient = useQueryClient();

  const { data: allMenuItems = [] } = useQuery({
    queryKey: ["menuItems"],
    queryFn: () => base44.entities.MenuItem.list("-created_date", 1000)
  });

  // Scope MenuItems to the active branch; if shared (branch_id = null) records still exist, show them only when no branch copy with the same name exists yet.
  const menuItems = (() => {
    if (!selectedBranchId) return allMenuItems;
    const branchOwned = allMenuItems.filter((m) => m.branch_id === selectedBranchId);
    const branchOwnedNames = new Set(branchOwned.map((m) => String(m.name || "").trim().toLowerCase()));
    const fallbackShared = allMenuItems.filter(
      (m) => !m.branch_id && !branchOwnedNames.has(String(m.name || "").trim().toLowerCase())
    );
    return [...branchOwned, ...fallbackShared];
  })();

  const { data: categories = [] } = useQuery({
    queryKey: ["menuCategories"],
    queryFn: () => base44.entities.MenuCategory.list("sort_order")
  });

  const { data: menuSections = [] } = useQuery({
    queryKey: ["menuSections"],
    queryFn: () => base44.entities.MenuSection.list("sort_order")
  });

  const { data: menuOptions = [] } = useQuery({
    queryKey: ["menuOptions"],
    queryFn: () => base44.entities.MenuOption.list("sort_order")
  });

  const { data: menuItemOptions = [] } = useQuery({
    queryKey: ["menuItemOptions"],
    queryFn: () => base44.entities.MenuItemOption.list()
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const payload = {
        ...data,
        branch_id: data.branch_id || selectedBranchId || undefined,
        branch_name: data.branch_name || selectedBranch?.name || undefined,
      };
      const created = await base44.entities.MenuItem.create(payload);
      if (created?.id) {
        await base44.functions
          .invoke("branchIsolationManager", {
            action: "mirror_menu_item",
            menu_item_id: created.id,
          })
          .catch(() => {});
      }
      return created;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menuItems"] });
      toast.success("Menu item created and mirrored across branches");
      handleClose();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.MenuItem.update(id, data),
    onSuccess: async (_, variables) => {
      if (variables?.id) {
        await base44.functions.invoke("syncMenuItemRecipe", { menu_item_id: variables.id }).catch(() => {});
      }
      queryClient.invalidateQueries({ queryKey: ["menuItems"] });
      queryClient.invalidateQueries({ queryKey: ["recipes"] });
      toast.success("Menu item updated");
      handleClose();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.MenuItem.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menuItems"] });
      toast.success("Menu item deleted");
    }
  });

  const createCategoryMutation = useMutation({
    mutationFn: (data) => base44.entities.MenuCategory.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menuCategories"] });
      toast.success("Category created");
      handleCloseCategoryDialog();
    }
  });

  const updateCategoryMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.MenuCategory.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menuCategories"] });
      toast.success("Category updated");
      handleCloseCategoryDialog();
    }
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: (id) => base44.entities.MenuCategory.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menuCategories"] });
      toast.success("Category deleted");
    }
  });

  const createSectionMutation = useMutation({
    mutationFn: (data) => base44.entities.MenuSection.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menuSections"] });
      toast.success("Section created");
      handleCloseSectionDialog();
    }
  });

  const updateSectionMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.MenuSection.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menuSections"] });
      toast.success("Section updated");
      handleCloseSectionDialog();
    }
  });

  const deleteSectionMutation = useMutation({
    mutationFn: (id) => base44.entities.MenuSection.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menuSections"] });
      toast.success("Section deleted");
    }
  });

  const createOptionMutation = useMutation({
    mutationFn: (data) => base44.entities.MenuOption.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menuOptions"] });
      toast.success("Option created");
      handleCloseOptionDialog();
    }
  });

  const updateOptionMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.MenuOption.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menuOptions"] });
      toast.success("Option updated");
      handleCloseOptionDialog();
    }
  });

  const deleteOptionMutation = useMutation({
    mutationFn: (id) => base44.entities.MenuOption.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menuOptions"] });
      queryClient.invalidateQueries({ queryKey: ["menuItemOptions"] });
      toast.success("Option deleted");
    }
  });

  const createItemOptionMutation = useMutation({
    mutationFn: (data) => base44.entities.MenuItemOption.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menuItemOptions"] });
    }
  });

  const deleteItemOptionMutation = useMutation({
    mutationFn: (id) => base44.entities.MenuItemOption.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menuItemOptions"] });
    }
  });

  const handleOpen = (item = null) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        name: item.name || "",
        description: item.description || "",
        price: item.price?.toString() || "",
        indirect_price: item.indirect_price?.toString() || "",
        category: item.category || "",
        image_url: item.image_url || "",
        available: item.available ?? true,
        visible_website: item.visible_website ?? true,
        visible_pos: item.visible_pos ?? true,
        preparation_station: item.preparation_station || "kitchen",
        sizes: item.sizes || [],
        tax_exempt: item.tax_exempt || false,
        service_exempt: item.service_exempt || false
      });
    } else {
      setEditingItem(null);
      setFormData({
        name: "",
        description: "",
        price: "",
        indirect_price: "",
        category: "",
        image_url: "",
        available: true,
        visible_website: true,
        visible_pos: true,
        preparation_station: "kitchen",
        sizes: [],
        tax_exempt: false,
        service_exempt: false
      });
    }
    setNewSize({ name: "", price: "", indirect_price: "" });
    setDialogOpen(true);
  };

  const handleClose = () => {
    setDialogOpen(false);
    setEditingItem(null);
  };

  const handleOpenCategoryDialog = (category = null) => {
    if (category) {
      setEditingCategory(category);
      setCategoryFormData({
        name: category.name || "",
        description: category.description || "",
        section_id: category.section_id || "",
        section_name: category.section_name || "",
        image_url: category.image_url || "",
        sort_order: category.sort_order || 0,
        is_active: category.is_active !== false,
        visible_website: category.visible_website ?? true,
        visible_pos: category.visible_pos ?? true,
        tax_exempt: category.tax_exempt || false,
        service_exempt: category.service_exempt || false
      });
    } else {
      setEditingCategory(null);
      setCategoryFormData({
        name: "",
        description: "",
        section_id: "",
        section_name: "",
        image_url: "",
        sort_order: 0,
        is_active: true,
        visible_website: true,
        visible_pos: true,
        tax_exempt: false,
        service_exempt: false
      });
    }
    setCategoryDialogOpen(true);
  };

  const handleOpenSectionDialog = (section = null) => {
    if (section) {
      setEditingSection(section);
      setSectionFormData({
        name: section.name || "",
        description: section.description || "",
        sort_order: section.sort_order || 0,
        is_default: section.is_default || false,
        is_active: section.is_active !== false,
        visible_website: section.visible_website ?? true,
        visible_pos: section.visible_pos ?? true,
        tax_exempt: section.tax_exempt || false,
        service_exempt: section.service_exempt || false
      });
    } else {
      setEditingSection(null);
      setSectionFormData({
        name: "",
        description: "",
        sort_order: 0,
        is_default: false,
        is_active: true,
        visible_website: true,
        visible_pos: true,
        tax_exempt: false,
        service_exempt: false
      });
    }
    setSectionDialogOpen(true);
  };

  const handleCloseSectionDialog = () => {
    setSectionDialogOpen(false);
    setEditingSection(null);
  };

  const handleCloseCategoryDialog = () => {
    setCategoryDialogOpen(false);
    setEditingCategory(null);
  };

  const handleOpenOptionDialog = (option = null) => {
    if (option) {
      setEditingOption(option);
      setOptionFormData({
        name: option.name || "",
        description: option.description || "",
        option_type: option.option_type || "single_select",
        max_selections: option.max_selections || "",
        is_mandatory: option.is_mandatory !== false,
        values: option.values || [],
        required_for_order: option.required_for_order || false,
        is_active: option.is_active !== false
      });
    } else {
      setEditingOption(null);
      setOptionFormData({
        name: "",
        description: "",
        option_type: "single_select",
        max_selections: "",
        is_mandatory: true,
        values: [],
        required_for_order: false,
        is_active: true
      });
    }
    setNewOptionValue({ label: "", price_modifier: 0 });
    setOptionDialogOpen(true);
  };

  const handleCloseOptionDialog = () => {
    setOptionDialogOpen(false);
    setEditingOption(null);
  };

  const handleOpenItemOptionsDialog = (item) => {
    setSelectedItemForOptions(item);
    const itemOptions = menuItemOptions.filter(io => io.menu_item_id === item.id);
    setSelectedOptionsForItem(itemOptions.map(io => io.option_id));
    setItemOptionsDialogOpen(true);
  };

  const handleCloseItemOptionsDialog = () => {
    setItemOptionsDialogOpen(false);
    setSelectedItemForOptions(null);
    setSelectedOptionsForItem([]);
  };

  const handleSaveOptionDialog = () => {
    const data = {
      ...optionFormData,
      values: optionFormData.values || [],
      max_selections: optionFormData.max_selections ? parseInt(optionFormData.max_selections) : undefined
    };

    if (editingOption) {
      updateOptionMutation.mutate({ id: editingOption.id, data });
    } else {
      createOptionMutation.mutate(data);
    }
  };

  const handleSaveItemOptions = async () => {
    if (!selectedItemForOptions) return;

    try {
      const currentOptions = menuItemOptions.filter(io => io.menu_item_id === selectedItemForOptions.id);
      const currentOptionIds = currentOptions.map(io => io.option_id);

      // Delete removed options
      for (const optionId of currentOptionIds) {
        if (!selectedOptionsForItem.includes(optionId)) {
          const itemOption = currentOptions.find(io => io.option_id === optionId);
          if (itemOption) {
            await deleteItemOptionMutation.mutateAsync(itemOption.id);
          }
        }
      }

      // Add new options
      for (const optionId of selectedOptionsForItem) {
        if (!currentOptionIds.includes(optionId)) {
          const option = menuOptions.find(o => o.id === optionId);
          if (option) {
            await createItemOptionMutation.mutateAsync({
              menu_item_id: selectedItemForOptions.id,
              menu_item_name: selectedItemForOptions.name,
              option_id: optionId,
              option_name: option.name,
              required_for_item: false
            });
          }
        }
      }

      toast.success("Item options updated");
      handleCloseItemOptionsDialog();
    } catch (error) {
      toast.error("Failed to update item options");
      console.error("Error updating item options:", error);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData({ ...formData, image_url: file_url });
      toast.success("Image uploaded");
    } catch (error) {
      toast.error("Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = () => {
    const data = {
      ...formData,
      price: parseFloat(formData.price),
      indirect_price: formData.indirect_price ? parseFloat(formData.indirect_price) : undefined,
      available: formData.available,
      sizes: formData.sizes.map(s => ({
        name: s.name,
        price: typeof s.price === 'number' ? s.price : parseFloat(s.price),
        indirect_price: s.indirect_price ? (typeof s.indirect_price === 'number' ? s.indirect_price : parseFloat(s.indirect_price)) : undefined
      })),
      // Preserve size_recipes when saving sizes from the edit dialog
      size_recipes: editingItem?.size_recipes || undefined
    };

    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleSaveCategory = () => {
    const selectedSection = menuSections.find(s => s.id === categoryFormData.section_id);
    const data = {
      ...categoryFormData,
      section_name: selectedSection?.name || "",
      sort_order: parseInt(categoryFormData.sort_order) || 0
    };

    if (editingCategory) {
      updateCategoryMutation.mutate({ id: editingCategory.id, data });
    } else {
      createCategoryMutation.mutate(data);
    }
  };

  const handleSaveSection = () => {
    const data = {
      ...sectionFormData,
      sort_order: parseInt(sectionFormData.sort_order) || 0
    };

    if (editingSection) {
      updateSectionMutation.mutate({ id: editingSection.id, data });
    } else {
      createSectionMutation.mutate(data);
    }
  };

  const handleCategoryImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setCategoryFormData({ ...categoryFormData, image_url: file_url });
      toast.success("Image uploaded");
    } catch (error) {
      toast.error("Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  const moveCategoryUp = (index) => {
    if (index === 0) return;
    const updatedCategories = [...categories];
    const temp = updatedCategories[index - 1].sort_order;
    updateCategoryMutation.mutate({ 
      id: updatedCategories[index - 1].id, 
      data: { ...updatedCategories[index - 1], sort_order: updatedCategories[index].sort_order }
    });
    updateCategoryMutation.mutate({ 
      id: updatedCategories[index].id, 
      data: { ...updatedCategories[index], sort_order: temp }
    });
  };

  const moveCategoryDown = (index) => {
    if (index === categories.length - 1) return;
    const updatedCategories = [...categories];
    const temp = updatedCategories[index + 1].sort_order;
    updateCategoryMutation.mutate({ 
      id: updatedCategories[index + 1].id, 
      data: { ...updatedCategories[index + 1], sort_order: updatedCategories[index].sort_order }
    });
    updateCategoryMutation.mutate({ 
      id: updatedCategories[index].id, 
      data: { ...updatedCategories[index], sort_order: temp }
    });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
          <h1 className="text-2xl font-bold">Menu Management</h1>
          <Button
            variant="outline"
            onClick={() => setShowBranchTransfer((v) => !v)}
            className="gap-2 border-emerald-300 text-emerald-800 hover:bg-emerald-50"
          >
            <ArrowRightLeft className="w-4 h-4" />
            {showBranchTransfer ? "Hide Branch Inventory Transfer" : "Branch Inventory & Recipe Transfer"}
          </Button>
        </div>

        {showBranchTransfer && (
          <div className="mb-6">
            <BranchInventoryTransferCard />
          </div>
        )}

        {!firstTab ? <ClosedTabsNotice /> : (
        <Tabs defaultValue={firstTab} className="space-y-6">
          <TabsList>
            {screenTabs.isOpen("items") && <TabsTrigger value="items">Menu Items</TabsTrigger>}
            {screenTabs.isOpen("missing-recipe") && <TabsTrigger value="missing-recipe">Missing Recipe Items</TabsTrigger>}
            {screenTabs.isOpen("food-cost") && <TabsTrigger value="food-cost">Food Cost Analysis</TabsTrigger>}
            {screenTabs.isOpen("ai-insights") && <TabsTrigger value="ai-insights">AI Insights</TabsTrigger>}
            {screenTabs.isOpen("sections") && <TabsTrigger value="sections">Sections</TabsTrigger>}
            {screenTabs.isOpen("categories") && <TabsTrigger value="categories">Categories</TabsTrigger>}
            {screenTabs.isOpen("options") && <TabsTrigger value="options">Options</TabsTrigger>}
          </TabsList>

          {/* Items Tab */}
          <TabsContent value="items" className="space-y-6">
            <MenuItemsTab
              menuItems={menuItems}
              categories={categories}
              onAddItem={() => handleOpen()}
              onEditItem={(item) => handleOpen(item)}
              onDeleteItem={(id) => deleteMutation.mutate(id)}
              onOpenRecipe={(item) => {
                setSelectedItemForRecipe(item);
                setShowRecipeManager(true);
              }}
              onOpenItemOptions={(item) => handleOpenItemOptionsDialog(item)}
              onSetStationForCategory={(cat) => {
                setSelectedCategoryForStation(cat);
                setStationDialogOpen(true);
              }}
              onBulkPriceAdjust={() => {
                setSelectedCategories([]);
                setSelectedSections([]);
                setSelectedItems([]);
                setSelectedOptions([]);
                setBulkPriceDialogOpen(true);
              }}
            />
          </TabsContent>

          {/* Missing Recipe Items Tab */}
          <TabsContent value="missing-recipe" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Missing Recipe Items</h2>
                <p className="text-sm text-slate-500">Menu items that have no recipe ingredients defined yet.</p>
              </div>
              <Select value={missingRecipeCategoryFilter} onValueChange={setMissingRecipeCategoryFilter}>
                <SelectTrigger className="w-52">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {(() => {
              const missingRecipe = menuItems.filter(item =>
                (!item.recipe || item.recipe.length === 0) &&
                (!item.sizes || item.sizes.length === 0) &&
                (missingRecipeCategoryFilter === 'all' || item.category === missingRecipeCategoryFilter)
              );
              if (missingRecipe.length === 0) {
                return (
                  <div className="text-center py-16 text-slate-400">
                    <ChefHat className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p className="text-sm font-medium">All menu items have recipes defined!</p>
                  </div>
                );
              }
              return (
                <div className="rounded-lg border bg-white overflow-hidden">
                  <div className="px-4 py-3 bg-orange-50 border-b flex items-center gap-2 text-sm text-orange-700">
                    <span className="font-semibold">{missingRecipe.length}</span> item{missingRecipe.length !== 1 ? 's' : ''} missing a recipe
                  </div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-slate-50 text-left">
                        <th className="px-4 py-3 font-semibold text-slate-600">Name</th>
                        <th className="px-4 py-3 font-semibold text-slate-600">Category</th>
                        <th className="px-4 py-3 font-semibold text-slate-600 text-right">Price</th>
                        <th className="px-4 py-3 font-semibold text-slate-600">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {missingRecipe.map((item, idx) => (
                        <tr key={item.id} className={`border-b ${idx % 2 === 0 ? '' : 'bg-slate-50/50'}`}>
                          <td className="px-4 py-3 font-medium">{item.name}</td>
                          <td className="px-4 py-3 text-slate-500">{item.category || '—'}</td>
                          <td className="px-4 py-3 text-right text-slate-600">{formatCurrency(item.price)}</td>
                          <td className="px-4 py-3">
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1"
                              onClick={() => {
                                setSelectedItemForRecipe(item);
                                setShowRecipeManager(true);
                              }}
                            >
                              <ChefHat className="w-3 h-3" />
                              Add Recipe
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </TabsContent>

          {/* Food Cost Analysis Tab */}
          <TabsContent value="food-cost" className="space-y-6">
            <FoodCostAnalysis />
          </TabsContent>

          {/* AI Insights Tab */}
          <TabsContent value="ai-insights">
            <AIMenuInsights 
              menuItems={menuItems}
              onUpdatePrice={async (itemId, newPrice) => {
                const item = menuItems.find(i => i.id === itemId);
                if (item) {
                  await updateMutation.mutateAsync({
                    id: itemId,
                    data: { ...item, price: newPrice }
                  });
                }
              }}
            />
          </TabsContent>

          {/* Sections Tab */}
          <TabsContent value="sections" className="space-y-6">
            <div className="flex justify-end">
              <Button onClick={() => handleOpenSectionDialog()}>
                <Plus className="w-4 h-4 mr-2" />
                Add Section
              </Button>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {menuSections.map((section) => (
                <Card key={section.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between text-base">
                      <span>{section.name}</span>
                      <div className="flex gap-1">
                        <Badge variant={section.is_active ? "default" : "secondary"}>
                          {section.is_active ? "Active" : "Inactive"}
                        </Badge>
                        {section.is_default && (
                          <Badge className="bg-amber-500">Default</Badge>
                        )}
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {section.description && (
                      <p className="text-sm text-slate-600 mb-3">{section.description}</p>
                    )}
                    <p className="text-xs text-slate-500 mb-3">Sort Order: {section.sort_order}</p>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="flex-1"
                        onClick={() => handleOpenSectionDialog(section)}
                      >
                        <Pencil className="w-3 h-3 mr-1" />
                        Edit
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => deleteSectionMutation.mutate(section.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {menuSections.length === 0 && (
              <Card className="p-12 text-center">
                <Tag className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                <h3 className="font-medium text-slate-900">No sections yet</h3>
                <p className="text-sm text-slate-500 mt-1">Create sections like Starters, Food, Drinks, Desserts</p>
              </Card>
            )}
          </TabsContent>

          {/* Categories Tab */}
          <TabsContent value="categories" className="space-y-6">
            <div className="flex justify-end">
              <Button onClick={() => handleOpenCategoryDialog()}>
                <Plus className="w-4 h-4 mr-2" />
                Add Category
              </Button>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map((category, index) => (
                <Card key={category.id}>
                  {category.image_url && (
                    <div className="h-32 overflow-hidden rounded-t-lg">
                      <img 
                        src={category.image_url} 
                        alt={category.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>{category.name}</span>
                      <div className="flex gap-1">
                        <Badge variant={category.is_active ? "default" : "secondary"}>
                          {category.is_active ? "Active" : "Inactive"}
                        </Badge>
                        <Badge variant="outline" className="text-xs">#{category.sort_order}</Badge>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {category.description && (
                      <p className="text-sm text-slate-600 mb-3">{category.description}</p>
                    )}
                    <div className="flex gap-2 mb-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => moveCategoryUp(index)}
                        disabled={index === 0}
                        title="Move up"
                      >
                        <ChevronUp className="w-3 h-3" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => moveCategoryDown(index)}
                        disabled={index === categories.length - 1}
                        title="Move down"
                      >
                        <ChevronDown className="w-3 h-3" />
                      </Button>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="flex-1"
                        onClick={() => handleOpenCategoryDialog(category)}
                      >
                        <Pencil className="w-3 h-3 mr-1" />
                        Edit
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => deleteCategoryMutation.mutate(category.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {categories.length === 0 && (
              <Card className="p-12 text-center">
                <Tag className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                <h3 className="font-medium text-slate-900">No categories yet</h3>
                <p className="text-sm text-slate-500 mt-1">Create your first category to organize menu items</p>
              </Card>
            )}
          </TabsContent>

          {/* Options Tab */}
          <TabsContent value="options" className="space-y-6">
            <div className="flex justify-end">
              <Button onClick={() => handleOpenOptionDialog()}>
                <Plus className="w-4 h-4 mr-2" />
                Add Option
              </Button>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {menuOptions.map((option) => (
                <Card key={option.id}>
                  <CardHeader>
                   <CardTitle className="flex items-center justify-between text-base">
                     <span>{option.name}</span>
                     <div className="flex gap-1">
                       <Badge variant={option.is_active ? "default" : "secondary"}>
                         {option.option_type === "single_select" ? "Single" : "Multi"}
                       </Badge>
                       <Badge className={option.is_mandatory !== false ? "bg-purple-500" : "bg-blue-500"}>
                         {option.is_mandatory !== false ? "Mandatory" : "Optional"}
                       </Badge>
                     </div>
                   </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {option.description && (
                      <p className="text-sm text-slate-600">{option.description}</p>
                    )}
                    <div className="space-y-1">
                      {option.values?.map((val, idx) => (
                        <div key={idx} className="text-xs text-slate-600">
                          • {val.label} {val.price_modifier !== 0 && `(+${formatCurrency(val.price_modifier)})`}
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="flex-1"
                        onClick={() => handleOpenOptionDialog(option)}
                      >
                        <Pencil className="w-3 h-3 mr-1" />
                        Edit
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => deleteOptionMutation.mutate(option.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {menuOptions.length === 0 && (
              <Card className="p-12 text-center">
                <Tag className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                <h3 className="font-medium text-slate-900">No options yet</h3>
                <p className="text-sm text-slate-500 mt-1">Create options like Size, Spice Level, etc.</p>
              </Card>
            )}
          </TabsContent>
        </Tabs>
        )}
      </div>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit Menu Item" : "Add Menu Item"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div className="space-y-4">
              {formData.sizes?.length > 0 ? (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
                  ℹ️ Prices are defined per size — default item price is not required.
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Direct Price (EGP)</Label>
                    <p className="text-xs text-slate-500 mb-1">Dine In, Takeaway, {brandName()} Delivery</p>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Indirect Price (EGP)</Label>
                    <p className="text-xs text-slate-500 mb-1">Other delivery companies</p>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.indirect_price || ""}
                      onChange={(e) => setFormData({ ...formData, indirect_price: e.target.value })}
                      placeholder="Leave empty to use direct price"
                    />
                  </div>
                </div>
              )}
              <div>
                <Label>Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.filter(cat => cat.is_active).map(cat => (
                      <SelectItem key={cat.id} value={cat.name}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                </div>
                <div>
                <Label>Preparation Station</Label>
                <Select
                  value={formData.preparation_station || "kitchen"}
                  onValueChange={(value) => setFormData({ ...formData, preparation_station: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select station" />
                  </SelectTrigger>
                  <SelectContent>
                    {(prepAreas.length > 0 ? prepAreas : [{ key: "kitchen", name: "Kitchen" }, { key: "bar", name: "Bar" }]).map(area => (
                      <SelectItem key={area.key} value={area.key}>{area.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                </div>
            </div>
            <div>
              <Label>Image</Label>
              <div className="flex gap-2">
                <Input
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  placeholder="Image URL"
                />
                <Button
                  variant="outline"
                  onClick={() => document.getElementById("image-upload").click()}
                  disabled={uploading}
                >
                  <Upload className="w-4 h-4" />
                </Button>
                <input
                  id="image-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                />
              </div>
              {formData.image_url && (
                <img 
                  src={formData.image_url} 
                  alt="Preview"
                  className="mt-2 h-32 w-full object-cover rounded"
                />
              )}
            </div>
            <div className="flex items-center justify-between">
              <Label>Available</Label>
              <Switch
                checked={formData.available}
                onCheckedChange={(checked) => setFormData({ ...formData, available: checked })}
              />
            </div>
            <div className="border-t pt-4">
              <Label className="font-semibold mb-3 block">Visibility</Label>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-normal">Visible on Website Menu</Label>
                  <Switch
                    checked={formData.visible_website}
                    onCheckedChange={(checked) => setFormData({ ...formData, visible_website: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-normal">Visible in POS</Label>
                  <Switch
                    checked={formData.visible_pos}
                    onCheckedChange={(checked) => setFormData({ ...formData, visible_pos: checked })}
                  />
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <Label className="font-semibold mb-3 block">Tax & Service Exemptions</Label>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-normal">Tax Exempt</Label>
                  <Switch
                    checked={formData.tax_exempt}
                    onCheckedChange={(checked) => setFormData({ ...formData, tax_exempt: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-normal">Service Charge Exempt</Label>
                  <Switch
                    checked={formData.service_exempt}
                    onCheckedChange={(checked) => setFormData({ ...formData, service_exempt: checked })}
                  />
                </div>
              </div>
            </div>
            
            {/* Sizes Section */}
            <div className="border-t pt-4">
              <Label className="font-semibold mb-3 block">Sizes (Optional)</Label>
              <div className="space-y-2 mb-3">
                {formData.sizes.map((size, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-slate-50 p-2 rounded">
                    <Input
                      value={size.name}
                      onChange={(e) => {
                        const updatedSizes = [...formData.sizes];
                        updatedSizes[idx] = { ...updatedSizes[idx], name: e.target.value };
                        setFormData({ ...formData, sizes: updatedSizes });
                      }}
                      placeholder="Size name"
                      className="flex-1"
                    />
                    <div className="flex flex-col gap-1">
                      <Input
                        type="number"
                        step="0.01"
                        value={size.price}
                        onChange={(e) => {
                          const updatedSizes = [...formData.sizes];
                          updatedSizes[idx] = { ...updatedSizes[idx], price: parseFloat(e.target.value) || 0 };
                          setFormData({ ...formData, sizes: updatedSizes });
                        }}
                        placeholder="Direct"
                        className="w-24 h-8 text-xs"
                      />
                      <Input
                        type="number"
                        step="0.01"
                        value={size.indirect_price || ""}
                        onChange={(e) => {
                          const updatedSizes = [...formData.sizes];
                          updatedSizes[idx] = { ...updatedSizes[idx], indirect_price: e.target.value ? parseFloat(e.target.value) : undefined };
                          setFormData({ ...formData, sizes: updatedSizes });
                        }}
                        placeholder="Indirect"
                        className="w-24 h-8 text-xs"
                      />
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setFormData({
                        ...formData,
                        sizes: formData.sizes.filter((_, i) => i !== idx)
                      })}
                    >
                      <Trash2 className="w-3 h-3 text-red-500" />
                    </Button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Size name (e.g., Small)"
                  value={newSize.name}
                  onChange={(e) => setNewSize({ ...newSize, name: e.target.value })}
                  className="flex-1"
                />
                <div className="flex flex-col gap-1">
                  <Input
                    placeholder="Direct"
                    type="number"
                    step="0.01"
                    value={newSize.price}
                    onChange={(e) => setNewSize({ ...newSize, price: parseFloat(e.target.value) || "" })}
                    className="w-24 h-8 text-xs"
                  />
                  <Input
                    placeholder="Indirect"
                    type="number"
                    step="0.01"
                    value={newSize.indirect_price || ""}
                    onChange={(e) => setNewSize({ ...newSize, indirect_price: parseFloat(e.target.value) || "" })}
                    className="w-24 h-8 text-xs"
                  />
                </div>
                <Button
                   type="button"
                   variant="outline"
                   onClick={() => {
                     if (newSize.name && newSize.price !== "") {
                       setFormData({
                         ...formData,
                         sizes: [...formData.sizes, { 
                           name: newSize.name, 
                           price: Number(newSize.price),
                           indirect_price: newSize.indirect_price ? Number(newSize.indirect_price) : undefined
                         }]
                       });
                       setNewSize({ name: "", price: "", indirect_price: "" });
                     }
                   }}
                 >
                   <Plus className="w-3 h-3" />
                 </Button>
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button onClick={handleSave}>
                {editingItem ? "Update" : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Category Dialog */}
      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCategory ? "Edit Category" : "Add Category"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Category Name</Label>
              <Input
                value={categoryFormData.name}
                onChange={(e) => setCategoryFormData({ ...categoryFormData, name: e.target.value })}
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={categoryFormData.description}
                onChange={(e) => setCategoryFormData({ ...categoryFormData, description: e.target.value })}
              />
            </div>
            <div>
              <Label>Section</Label>
              <Select
                value={categoryFormData.section_id}
                onValueChange={(value) => setCategoryFormData({ ...categoryFormData, section_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select section (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Section</SelectItem>
                  {menuSections.filter(s => s.is_active).map(section => (
                    <SelectItem key={section.id} value={section.id}>
                      {section.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Sort Order</Label>
              <Input
                type="number"
                value={categoryFormData.sort_order}
                onChange={(e) => setCategoryFormData({ ...categoryFormData, sort_order: e.target.value })}
              />
            </div>
            <div>
              <Label>Category Image</Label>
              <div className="flex gap-2">
                <Input
                  value={categoryFormData.image_url}
                  onChange={(e) => setCategoryFormData({ ...categoryFormData, image_url: e.target.value })}
                  placeholder="Image URL"
                />
                <Button
                  variant="outline"
                  onClick={() => document.getElementById("category-image-upload").click()}
                  disabled={uploading}
                >
                  <Upload className="w-4 h-4" />
                </Button>
                <input
                  id="category-image-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleCategoryImageUpload}
                />
              </div>
              {categoryFormData.image_url && (
                <img 
                  src={categoryFormData.image_url} 
                  alt="Preview"
                  className="mt-2 h-32 w-full object-cover rounded"
                />
              )}
            </div>
            <div className="flex items-center justify-between">
              <Label>Active</Label>
              <Switch
                checked={categoryFormData.is_active}
                onCheckedChange={(checked) => setCategoryFormData({ ...categoryFormData, is_active: checked })}
              />
            </div>
            <div className="border-t pt-4">
              <Label className="font-semibold mb-3 block">Visibility</Label>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-normal">Visible on Website Menu</Label>
                  <Switch
                    checked={categoryFormData.visible_website}
                    onCheckedChange={(checked) => setCategoryFormData({ ...categoryFormData, visible_website: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-normal">Visible in POS</Label>
                  <Switch
                    checked={categoryFormData.visible_pos}
                    onCheckedChange={(checked) => setCategoryFormData({ ...categoryFormData, visible_pos: checked })}
                  />
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <Label className="font-semibold mb-3 block">Tax & Service Exemptions</Label>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-normal">Tax Exempt</Label>
                  <Switch
                    checked={categoryFormData.tax_exempt}
                    onCheckedChange={(checked) => setCategoryFormData({ ...categoryFormData, tax_exempt: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-normal">Service Charge Exempt</Label>
                  <Switch
                    checked={categoryFormData.service_exempt}
                    onCheckedChange={(checked) => setCategoryFormData({ ...categoryFormData, service_exempt: checked })}
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={handleCloseCategoryDialog}>Cancel</Button>
              <Button onClick={handleSaveCategory}>
                {editingCategory ? "Update" : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Section Dialog */}
      <Dialog open={sectionDialogOpen} onOpenChange={setSectionDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingSection ? "Edit Section" : "Add Section"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Section Name</Label>
              <Input
                value={sectionFormData.name}
                onChange={(e) => setSectionFormData({ ...sectionFormData, name: e.target.value })}
                placeholder="e.g., Starters, Food, Drinks"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={sectionFormData.description}
                onChange={(e) => setSectionFormData({ ...sectionFormData, description: e.target.value })}
              />
            </div>
            <div>
              <Label>Sort Order</Label>
              <Input
                type="number"
                value={sectionFormData.sort_order}
                onChange={(e) => setSectionFormData({ ...sectionFormData, sort_order: e.target.value })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Default Section</Label>
              <Switch
                checked={sectionFormData.is_default}
                onCheckedChange={(checked) => setSectionFormData({ ...sectionFormData, is_default: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Active</Label>
              <Switch
                checked={sectionFormData.is_active}
                onCheckedChange={(checked) => setSectionFormData({ ...sectionFormData, is_active: checked })}
              />
            </div>
            <div className="border-t pt-4">
              <Label className="font-semibold mb-3 block">Visibility</Label>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-normal">Visible on Website Menu</Label>
                  <Switch
                    checked={sectionFormData.visible_website}
                    onCheckedChange={(checked) => setSectionFormData({ ...sectionFormData, visible_website: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-normal">Visible in POS</Label>
                  <Switch
                    checked={sectionFormData.visible_pos}
                    onCheckedChange={(checked) => setSectionFormData({ ...sectionFormData, visible_pos: checked })}
                  />
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <Label className="font-semibold mb-3 block">Tax & Service Exemptions</Label>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-normal">Tax Exempt</Label>
                  <Switch
                    checked={sectionFormData.tax_exempt}
                    onCheckedChange={(checked) => setSectionFormData({ ...sectionFormData, tax_exempt: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-normal">Service Charge Exempt</Label>
                  <Switch
                    checked={sectionFormData.service_exempt}
                    onCheckedChange={(checked) => setSectionFormData({ ...sectionFormData, service_exempt: checked })}
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={handleCloseSectionDialog}>Cancel</Button>
              <Button onClick={handleSaveSection}>
                {editingSection ? "Update" : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Option Dialog */}
      <Dialog open={optionDialogOpen} onOpenChange={setOptionDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingOption ? "Edit Option" : "Add Option"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Option Name</Label>
              <Input
                value={optionFormData.name}
                onChange={(e) => setOptionFormData({ ...optionFormData, name: e.target.value })}
                placeholder="e.g., Size, Spice Level, Cooking Level"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={optionFormData.description}
                onChange={(e) => setOptionFormData({ ...optionFormData, description: e.target.value })}
              />
            </div>
            <div>
              <Label>Selection Type</Label>
              <Select
                value={optionFormData.option_type}
                onValueChange={(value) => setOptionFormData({ ...optionFormData, option_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single_select">Single Select</SelectItem>
                  <SelectItem value="multiple_select">Multiple Select</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {optionFormData.option_type === "multiple_select" && (
              <div>
                <Label>Maximum Total Items</Label>
                <Input
                  type="number"
                  min="1"
                  value={optionFormData.max_selections}
                  onChange={(e) => setOptionFormData({ ...optionFormData, max_selections: e.target.value })}
                  placeholder="e.g., 4 (max 4 items total)"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Maximum number of items allowed in total (e.g., 2 Colas + 2 Waters = 4 items)
                </p>
              </div>
            )}

            <div className="border-t pt-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Mandatory Option</Label>
                  <p className="text-xs text-slate-500">Combines with item name</p>
                </div>
                <Switch
                  checked={optionFormData.is_mandatory}
                  onCheckedChange={(checked) => setOptionFormData({ ...optionFormData, is_mandatory: checked })}
                />
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
                <p className="font-medium mb-1">ℹ️ Option Type:</p>
                <p>• <strong>Mandatory</strong>: Combines with item (e.g., "Chicken - Mild")</p>
                <p>• <strong>Optional</strong>: Appears as separate line item with its own price</p>
              </div>
            </div>

            <div className="border-t pt-4">
              <Label className="font-semibold mb-3 block">Values</Label>
              <div className="space-y-2 mb-3">
                {optionFormData.values.map((value, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-slate-50 p-2 rounded text-sm">
                    <span className="flex-1">{value.label}</span>
                    {value.price_modifier !== 0 && (
                      <span className="text-slate-600">+{value.price_modifier} EGP</span>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setOptionFormData({
                        ...optionFormData,
                        values: optionFormData.values.filter((_, i) => i !== idx)
                      })}
                    >
                      <Trash2 className="w-3 h-3 text-red-500" />
                    </Button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Value (e.g., Small)"
                  value={newOptionValue.label}
                  onChange={(e) => setNewOptionValue({ ...newOptionValue, label: e.target.value })}
                  className="flex-1"
                />
                <Input
                  placeholder="Extra price"
                  type="number"
                  step="0.01"
                  value={newOptionValue.price_modifier}
                  onChange={(e) => setNewOptionValue({ ...newOptionValue, price_modifier: parseFloat(e.target.value) || 0 })}
                  className="w-24"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (newOptionValue.label) {
                      setOptionFormData({
                        ...optionFormData,
                        values: [...optionFormData.values, { label: newOptionValue.label, price_modifier: newOptionValue.price_modifier }]
                      });
                      setNewOptionValue({ label: "", price_modifier: 0 });
                    }
                  }}
                >
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Label>Active</Label>
              <Switch
                checked={optionFormData.is_active}
                onCheckedChange={(checked) => setOptionFormData({ ...optionFormData, is_active: checked })}
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={handleCloseOptionDialog}>Cancel</Button>
              <Button onClick={handleSaveOptionDialog}>
                {editingOption ? "Update" : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Recipe Manager */}
      {showRecipeManager && selectedItemForRecipe && (
        <MenuItemRecipeDialog
          key={selectedItemForRecipe.id}
          menuItem={selectedItemForRecipe}
          open={showRecipeManager}
          onClose={() => {
            setShowRecipeManager(false);
            setSelectedItemForRecipe(null);
          }}
        />
      )}

      {/* Station Bulk Update Dialog */}
      <Dialog open={stationDialogOpen} onOpenChange={setStationDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Set Preparation Station for {selectedCategoryForStation?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Select Preparation Station</Label>
              <Select
                value={categoryStation}
                onValueChange={setCategoryStation}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="kitchen">Kitchen</SelectItem>
                  <SelectItem value="bar">Bar</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
              <p className="text-blue-900">
                This will set the preparation station for all {menuItems.filter(item => item.category === selectedCategoryForStation?.name).length} items in this category.
              </p>
            </div>
            <div className="flex gap-2 justify-end">
              <Button 
                variant="outline" 
                onClick={() => {
                  setStationDialogOpen(false);
                  setSelectedCategoryForStation(null);
                }}
              >
                Cancel
              </Button>
              <Button 
                onClick={async () => {
                  try {
                    const itemsInCategory = menuItems.filter(item => item.category === selectedCategoryForStation.name);
                    for (const item of itemsInCategory) {
                      await updateMutation.mutateAsync({ 
                        id: item.id, 
                        data: { ...item, preparation_station: categoryStation }
                      });
                    }
                    toast.success(`Updated ${itemsInCategory.length} items to ${categoryStation}`);
                    setStationDialogOpen(false);
                    setSelectedCategoryForStation(null);
                  } catch (error) {
                    toast.error("Failed to update items");
                  }
                }}
              >
                Update All
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Item Options Dialog */}
      <Dialog open={itemOptionsDialogOpen} onOpenChange={setItemOptionsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Link Options to {selectedItemForOptions?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {menuOptions.filter(o => o.is_active).length === 0 ? (
              <p className="text-sm text-slate-500 py-4">No active options available. Create options first.</p>
            ) : (
              menuOptions.filter(o => o.is_active).map((option) => (
                <div
                  key={option.id}
                  className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-slate-50"
                  onClick={() => {
                    if (selectedOptionsForItem.includes(option.id)) {
                      setSelectedOptionsForItem(selectedOptionsForItem.filter(id => id !== option.id));
                    } else {
                      setSelectedOptionsForItem([...selectedOptionsForItem, option.id]);
                    }
                  }}
                >
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                    selectedOptionsForItem.includes(option.id)
                      ? "bg-blue-500 border-blue-500"
                      : "border-slate-300"
                  }`}>
                    {selectedOptionsForItem.includes(option.id) && (
                      <Check className="w-3 h-3 text-white" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{option.name}</p>
                    <p className="text-xs text-slate-500">{option.values?.length || 0} values</p>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="flex gap-2 justify-end pt-4">
            <Button variant="outline" onClick={handleCloseItemOptionsDialog}>Cancel</Button>
            <Button onClick={handleSaveItemOptions}>Save</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Price Adjustment Dialog */}
      <Dialog open={bulkPriceDialogOpen} onOpenChange={setBulkPriceDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Bulk Price Adjustment</DialogTitle>
            <p className="text-sm text-slate-500 mt-1">
              Select items to update: Indirect Price = Current Direct Price | Direct Price = 85% of Current Direct Price (rounded)
            </p>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Select All Options */}
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const allCats = categories.map(c => c.id);
                  const allSections = menuSections.map(s => s.id);
                  const allItems = menuItems.filter(i => i.price > 0).map(i => i.id);
                  const allOpts = menuOptions.map(o => o.id);
                  setSelectedCategories(allCats);
                  setSelectedSections(allSections);
                  setSelectedItems(allItems);
                  setSelectedOptions(allOpts);
                }}
              >
                Select All
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setSelectedCategories([]);
                  setSelectedSections([]);
                  setSelectedItems([]);
                  setSelectedOptions([]);
                }}
              >
                Clear All
              </Button>
            </div>

            {/* Sections */}
            <div>
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={menuSections.length > 0 && selectedSections.length === menuSections.length}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedSections(menuSections.map(s => s.id));
                    } else {
                      setSelectedSections([]);
                    }
                  }}
                  className="w-4 h-4"
                />
                Sections ({menuSections.length})
              </h3>
              <div className="grid grid-cols-2 gap-2 ml-6">
                {menuSections.map(section => (
                  <label key={section.id} className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedSections.includes(section.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedSections([...selectedSections, section.id]);
                        } else {
                          setSelectedSections(selectedSections.filter(id => id !== section.id));
                        }
                      }}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">{section.name}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Categories */}
            <div>
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={categories.length > 0 && selectedCategories.length === categories.length}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedCategories(categories.map(c => c.id));
                    } else {
                      setSelectedCategories([]);
                    }
                  }}
                  className="w-4 h-4"
                />
                Categories ({categories.length})
              </h3>
              <div className="grid grid-cols-2 gap-2 ml-6">
                {categories.map(category => (
                  <label key={category.id} className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedCategories.includes(category.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedCategories([...selectedCategories, category.id]);
                        } else {
                          setSelectedCategories(selectedCategories.filter(id => id !== category.id));
                        }
                      }}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">{category.name}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Menu Items */}
            <div>
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={menuItems.filter(i => i.price > 0).length > 0 && 
                           selectedItems.length === menuItems.filter(i => i.price > 0).length}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedItems(menuItems.filter(i => i.price > 0).map(i => i.id));
                    } else {
                      setSelectedItems([]);
                    }
                  }}
                  className="w-4 h-4"
                />
                Menu Items ({menuItems.filter(i => i.price > 0).length})
              </h3>
              <div className="grid grid-cols-2 gap-2 ml-6 max-h-64 overflow-y-auto">
                {menuItems.filter(item => item.price > 0).map(item => (
                  <label key={item.id} className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedItems.includes(item.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedItems([...selectedItems, item.id]);
                        } else {
                          setSelectedItems(selectedItems.filter(id => id !== item.id));
                        }
                      }}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">{item.name} - {formatCurrency(item.price)}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Options */}
            <div>
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={menuOptions.length > 0 && selectedOptions.length === menuOptions.length}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedOptions(menuOptions.map(o => o.id));
                    } else {
                      setSelectedOptions([]);
                    }
                  }}
                  className="w-4 h-4"
                />
                Options ({menuOptions.length})
              </h3>
              <div className="grid grid-cols-2 gap-2 ml-6 max-h-64 overflow-y-auto">
                {menuOptions.map(option => (
                  <label key={option.id} className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedOptions.includes(option.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedOptions([...selectedOptions, option.id]);
                        } else {
                          setSelectedOptions(selectedOptions.filter(id => id !== option.id));
                        }
                      }}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">{option.name}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-4 border-t">
            <Button variant="outline" onClick={() => setBulkPriceDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                const selectedItemsData = menuItems.filter(item => selectedItems.includes(item.id));
                
                if (selectedItemsData.length === 0 && selectedOptions.length === 0) {
                  toast.info("Please select at least one item or option");
                  return;
                }

                const totalUpdates = selectedItemsData.length + selectedOptions.length;
                
                if (!confirm(`Update ${totalUpdates} item(s) and option(s)?\n\nDirect → 85% (rounded)\nIndirect → Original Direct Price`)) {
                  return;
                }

                try {
                  let successCount = 0;

                  // Update selected menu items
                  for (const item of selectedItemsData) {
                    const originalPrice = item.price;
                    const newDirectPrice = Math.round(originalPrice * 0.85);
                    await updateMutation.mutateAsync({
                      id: item.id,
                      data: {
                        ...item,
                        price: newDirectPrice,
                        indirect_price: originalPrice
                      }
                    });
                    successCount++;
                  }

                  // Update selected options
                  for (const optionId of selectedOptions) {
                    const option = menuOptions.find(o => o.id === optionId);
                    if (option && option.values) {
                      const updatedValues = option.values.map(val => {
                        if (val.price_modifier > 0) {
                          const originalModifier = val.price_modifier;
                          const newModifier = Math.round(originalModifier * 0.85);
                          return {
                            ...val,
                            price_modifier: newModifier,
                            indirect_price_modifier: originalModifier
                          };
                        }
                        return val;
                      });
                      
                      await updateOptionMutation.mutateAsync({
                        id: option.id,
                        data: {
                          ...option,
                          values: updatedValues
                        }
                      });
                      successCount++;
                    }
                  }

                  toast.success(`Updated ${successCount} item(s) and option(s) successfully`);
                  setBulkPriceDialogOpen(false);
                  setSelectedCategories([]);
                  setSelectedSections([]);
                  setSelectedItems([]);
                  setSelectedOptions([]);
                } catch (error) {
                  toast.error("Failed to update prices: " + error.message);
                }
              }}
              disabled={selectedItems.length === 0 && selectedOptions.length === 0}
            >
              Apply Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}