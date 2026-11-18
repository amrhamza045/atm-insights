import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Clock, Check, X, ChevronDown, ChevronRight, Camera, Upload, Image } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/components/utils/currencyFormatter";
import { useBranch } from "@/components/branches/BranchContext";
import CateringWasteAttribution from '@/components/inventory/CateringWasteAttribution';
import WastePhoto from '@/components/inventory/WastePhoto';
import useWasteReasons from '@/components/inventory/useWasteReasons';

const STATUS_BADGE = {
  approved: <Badge className="bg-green-100 text-green-700 border-green-300 text-xs gap-1"><Check className="w-3 h-3" />Approved</Badge>,
  pending: <Badge className="bg-warning-100 text-warning-700 border-warning-300 text-xs gap-1"><Clock className="w-3 h-3" />Pending</Badge>,
  rejected: <Badge className="bg-red-100 text-red-700 border-red-300 text-xs gap-1"><X className="w-3 h-3" />Rejected</Badge>,
};

export default function WasteDeclarationManager() {
  const [showDialog, setShowDialog] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [expandedCategories, setExpandedCategories] = useState({});
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef(null);

  const today = () => new Date().toISOString().slice(0, 10);

  const [formData, setFormData] = useState({
    inventory_item_id: "",
    quantity_wasted: 0,
    reason: "other",
    waste_date: today(),
    notes: ""
  });

  const queryClient = useQueryClient();
  const { selectedBranch, selectedBranchId } = useBranch();
  const { reasons: wasteReasons, configured: reasonsConfigured, isLoading: reasonsLoading } = useWasteReasons(selectedBranchId);

  const { data: inventoryItems = [] } = useQuery({
    queryKey: ["inventoryItems", selectedBranchId],
    queryFn: async () => {
      const all = await base44.entities.InventoryItem.list("name");
      return all.filter(i => !selectedBranchId || i.branch_id === selectedBranchId);
    }
  });

  const { data: inventoryCategories = [] } = useQuery({
    queryKey: ["inventoryCategories"],
    queryFn: () => base44.entities.InventoryCategory.list("name")
  });

  const { data: wasteDeclarations = [] } = useQuery({
    queryKey: ["wasteDeclarations", selectedBranchId],
    queryFn: async () => {
      const all = await base44.entities.WasteDeclaration.list("-created_date", 200);
      return all.filter(w => !selectedBranchId || w.branch_id === selectedBranchId);
    }
  });

  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me()
  });

  const createWasteMutation = useMutation({
    mutationFn: (data) => base44.entities.WasteDeclaration.create({ ...data, branch_id: selectedBranchId || data.branch_id, branch_name: selectedBranch?.name || data.branch_name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wasteDeclarations"] });
      toast.success("Waste declaration submitted — pending admin approval");
      setShowDialog(false);
      resetForm();
    }
  });

  const deleteWasteMutation = useMutation({
    mutationFn: (id) => base44.entities.WasteDeclaration.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wasteDeclarations"] });
      toast.success("Waste declaration deleted");
    }
  });

  const resetForm = () => {
    setSelectedCategoryId("");
    setFormData({ inventory_item_id: "", quantity_wasted: 0, reason: "other", waste_date: today(), notes: "" });
    setImageFile(null);
    setImagePreview(null);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = async () => {
    if (!formData.inventory_item_id || formData.quantity_wasted <= 0) {
      toast.error("Please select an item and enter a valid quantity");
      return;
    }
    if (formData.event_id && !formData.catering_cost_treatment) {
      toast.error('Choose whether the waste is additional or already included in a release slip');
      return;
    }
    if (!wasteReasons.some(r => r.code === formData.reason)) {
      toast.error("Please choose a reason");
      return;
    }
    if (!imageFile) {
      toast.error("Please upload a photo of the waste");
      return;
    }

    const item = inventoryItems.find(i => i.id === formData.inventory_item_id);
    if (!item) return;

    setUploadingImage(true);
    let waste_image_url = "";
    try {
      const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file: imageFile });
      waste_image_url = file_uri;
    } catch (err) {
      toast.error("Failed to upload image");
      setUploadingImage(false);
      return;
    }
    setUploadingImage(false);

    const costImpact = item.cost_per_unit ? item.cost_per_unit * formData.quantity_wasted : 0;
    const picked = wasteReasons.find(r => r.code === formData.reason);

    await createWasteMutation.mutateAsync({
      ...formData,
      reason: picked?.reason_group || "other",
      ...(reasonsConfigured && picked ? { waste_reason_id: picked.id, waste_reason_code: picked.code, waste_reason_name: picked.name, is_tasting: picked.treatment === "food_tasting" } : {}),
      waste_date: formData.waste_date || today(),
      inventory_item_name: item.name,
      category_id: item.category_id || "",
      category_name: item.category_name || inventoryCategories.find(c => c.id === item.category_id)?.name || "Uncategorized",
      unit: item.selling_unit_label || item.unit,
      cost_impact: costImpact,
      declared_by: currentUser?.email,
      waste_image_url,
      status: "pending"
    });
  };

  const filteredItems = selectedCategoryId
    ? inventoryItems.filter(i => i.category_id === selectedCategoryId)
    : inventoryItems;

  const toggleCategory = (catId) => {
    setExpandedCategories(prev => ({ ...prev, [catId]: !prev[catId] }));
  };

  // Group declarations by category
  const grouped = {};
  for (const w of wasteDeclarations) {
    const key = w.category_id || "uncategorized";
    const label = w.category_name || "Uncategorized";
    if (!grouped[key]) grouped[key] = { label, items: [] };
    grouped[key].items.push(w);
  }

  const approvedTotal = wasteDeclarations
    .filter(w => w.status === "approved")
    .reduce((sum, w) => sum + (w.cost_impact || 0), 0);

  const pendingTotal = wasteDeclarations
    .filter(w => w.status === "pending")
    .reduce((sum, w) => sum + (w.cost_impact || 0), 0);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Waste Declaration</CardTitle>
            <Button onClick={() => setShowDialog(true)}>
              <Plus className="w-4 h-4 mr-1" />
              Declare Waste
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Summary */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-xs font-medium text-red-700">Approved Waste Cost</p>
              <p className="text-xl font-bold text-red-600">{formatCurrency(approvedTotal)}</p>
            </div>
            <div className="p-4 bg-warning-50 border border-warning-200 rounded-lg">
              <p className="text-xs font-medium text-warning-700">Pending Cost Impact</p>
              <p className="text-xl font-bold text-warning-600">{formatCurrency(pendingTotal)}</p>
            </div>
          </div>

          {/* Grouped by category */}
          {Object.keys(grouped).length === 0 ? (
            <p className="text-center text-slate-500 py-8">No waste declarations yet</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(grouped).map(([catId, { label, items }]) => {
                const isOpen = expandedCategories[catId];
                const catTotal = items.reduce((s, w) => s + (w.cost_impact || 0), 0);
                const pendingCount = items.filter(w => w.status === "pending").length;
                const approvedCount = items.filter(w => w.status === "approved").length;

                return (
                  <div key={catId} className="border rounded-lg overflow-hidden">
                    {/* Category header row */}
                    <button
                      className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
                      onClick={() => toggleCategory(catId)}
                    >
                      <div className="flex items-center gap-3">
                        {isOpen ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
                        <span className="font-semibold text-slate-800">{label}</span>
                        <span className="text-xs text-slate-500">{items.length} declaration{items.length !== 1 ? "s" : ""}</span>
                        {pendingCount > 0 && (
                          <Badge className="bg-warning-100 text-warning-700 text-xs">{pendingCount} pending</Badge>
                        )}
                        {approvedCount > 0 && (
                          <Badge className="bg-green-100 text-green-700 text-xs">{approvedCount} approved</Badge>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-red-600">{formatCurrency(catTotal)}</p>
                        <p className="text-xs text-slate-400">total cost</p>
                      </div>
                    </button>

                    {/* Expanded declarations */}
                    {isOpen && (
                      <div className="divide-y">
                        {items.map(waste => (
                          <div key={waste.id} className="flex items-start justify-between p-4 bg-white">
                            <div className="flex gap-3 flex-1">
                              {/* Waste image thumbnail */}
                              {waste.waste_image_url ? (
                                <WastePhoto uri={waste.waste_image_url} />
                              ) : (
                                <div className="w-14 h-14 bg-slate-100 rounded border flex items-center justify-center flex-shrink-0">
                                  <Image className="w-5 h-5 text-slate-300" />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                  <p className="font-medium text-sm">{waste.inventory_item_name}</p>
                                  {STATUS_BADGE[waste.status] || STATUS_BADGE["approved"]}
                                </div>
                                <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-500">
                                  <span>{waste.quantity_wasted} {waste.unit}</span>
                                  <span className="capitalize">{waste.waste_reason_name || waste.reason?.replace(/_/g, " ")}</span>
                                  <span className="text-red-600 font-medium">{formatCurrency(waste.cost_impact || 0)}</span>
                                  <span>{new Date(waste.waste_date || waste.created_date).toLocaleDateString()}</span>
                                </div>
                                {waste.rejection_reason && (
                                  <p className="text-xs text-red-500 mt-1">Rejected: {waste.rejection_reason}</p>
                                )}
                                {waste.notes && (
                                  <p className="text-xs text-slate-400 mt-0.5 truncate">{waste.notes}</p>
                                )}
                              </div>
                            </div>
                            {waste.status === "pending" && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => deleteWasteMutation.mutate(waste.id)}
                                className="text-red-400 hover:text-red-600 ml-2 flex-shrink-0"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Declare Waste Dialog */}
      {showDialog && (
        <Dialog open onOpenChange={(open) => { if (!open) { setShowDialog(false); resetForm(); } }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Declare Waste</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <CateringWasteAttribution branchId={selectedBranchId} form={formData} onChange={setFormData} />
              <div>
                <Label>Inventory Category</Label>
                <Select
                  value={selectedCategoryId}
                  onValueChange={(value) => {
                    setSelectedCategoryId(value);
                    setFormData({ ...formData, inventory_item_id: "" });
                  }}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Filter by category..." />
                  </SelectTrigger>
                  <SelectContent>
                    {inventoryCategories.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Inventory Item *</Label>
                <Select
                  value={formData.inventory_item_id}
                  onValueChange={(value) => setFormData({ ...formData, inventory_item_id: value })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select item" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredItems.map(item => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name} ({item.quantity} {item.selling_unit_label || item.unit})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Date Wasted *</Label>
                <Input
                  type="date"
                  max={today()}
                  value={formData.waste_date}
                  onChange={(e) => setFormData({ ...formData, waste_date: e.target.value })}
                  className="mt-1"
                />
                <p className="text-xs text-slate-400 mt-1">Defaults to today — change it if the waste happened earlier.</p>
              </div>

              <div>
                <Label>Quantity Wasted *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.quantity_wasted}
                  onChange={(e) => setFormData({ ...formData, quantity_wasted: parseFloat(e.target.value) || 0 })}
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Reason *</Label>
                <Select
                  value={formData.reason}
                  onValueChange={(value) => setFormData({ ...formData, reason: value })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder={reasonsLoading ? "Loading reasons..." : "Select reason"} />
                  </SelectTrigger>
                  <SelectContent>
                    {wasteReasons.map(r => (
                      <SelectItem key={r.code} value={r.code}>{r.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {wasteReasons.find(r => r.code === formData.reason)?.treatment === "food_tasting" && (
                  <p className="text-xs text-slate-500 mt-1">
                    {formData.event_id
                      ? "Food tasting: its cost is held until the event is closed (counts as event cost) or cancelled (counts under this reason)."
                      : "Food tasting with no event: its cost goes straight to this reason's account. Pick the event above if it was for one."}
                  </p>
                )}
              </div>

              {/* Mandatory image upload */}
              <div>
                <Label className="flex items-center gap-1">
                  <Camera className="w-3.5 h-3.5" />
                  Waste Photo <span className="text-red-500 ml-1">*</span>
                </Label>
                <div className="mt-1">
                  {imagePreview ? (
                    <div className="relative">
                      <img src={imagePreview} alt="Waste preview" className="w-full h-40 object-cover rounded-lg border" />
                      <button
                        className="absolute top-2 right-2 bg-white rounded-full p-1 shadow border hover:bg-red-50"
                        onClick={() => { setImageFile(null); setImagePreview(null); }}
                      >
                        <X className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full h-32 border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center gap-2 hover:border-slate-400 hover:bg-slate-50 transition-colors"
                    >
                      <Upload className="w-6 h-6 text-slate-400" />
                      <span className="text-sm text-slate-500">Click to upload a photo of the waste</span>
                    </button>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handleImageChange}
                  />
                </div>
              </div>

              <div>
                <Label>Notes</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="mt-1"
                  rows={2}
                  placeholder="Any additional details..."
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setShowDialog(false); resetForm(); }}>Cancel</Button>
                <Button onClick={handleSubmit} disabled={createWasteMutation.isPending || uploadingImage}>
                  {uploadingImage ? "Uploading photo..." : createWasteMutation.isPending ? "Submitting..." : "Declare Waste"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}