import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export default function ExpiryReportForm({ currentUser, branch }) {
  const queryClient = useQueryClient();
  const [categoryId, setCategoryId] = useState("");
  const [itemId, setItemId] = useState("");
  const [batchRef, setBatchRef] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [quantity, setQuantity] = useState("");
  const [notes, setNotes] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const { data: categories = [] } = useQuery({
    queryKey: ["inventoryCategoriesAll"],
    queryFn: () => base44.entities.InventoryCategory.list("name", 500)
  });

  const { data: inventoryItems = [] } = useQuery({
    queryKey: ["inventoryItemsAll"],
    queryFn: () => base44.entities.InventoryItem.list("name", 1000)
  });

  const filteredItems = categoryId
    ? inventoryItems.filter((i) => i.category_id === categoryId)
    : inventoryItems;
  const selectedItem = inventoryItems.find((i) => i.id === itemId);

  const handlePhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setPhotoUrl(file_url);
    } catch (error) {
      toast.error("Photo upload failed");
    } finally {
      setUploading(false);
    }
  };

  const reset = () => {
    setCategoryId("");
    setItemId("");
    setBatchRef("");
    setExpiryDate("");
    setQuantity("");
    setNotes("");
    setPhotoUrl("");
  };

  const handleSubmit = async () => {
    if (!selectedItem || !expiryDate) {
      toast.error("Select a raw material and an expiry date");
      return;
    }
    setSaving(true);
    try {
      const qty = Number(quantity) || 0;
      const unit = selectedItem.selling_unit_label || selectedItem.unit || "";
      await base44.entities.ExpiryReport.create({
        branch_id: branch?.id || selectedItem.branch_id || "",
        branch_name: branch?.name || selectedItem.branch_name || "",
        inventory_item_id: selectedItem.id,
        inventory_item_name: selectedItem.name,
        category_id: selectedItem.category_id || "",
        category_name: selectedItem.category_name || "",
        batch_ref: batchRef,
        expiry_date: expiryDate,
        quantity_at_risk: qty,
        unit,
        estimated_value: qty * (Number(selectedItem.cost_per_unit) || 0),
        status: "open",
        notes,
        photo_url: photoUrl,
        reported_by_email: currentUser?.email || "",
        reported_by_name: currentUser?.full_name || ""
      });
      queryClient.invalidateQueries({ queryKey: ["expiryReports"] });
      toast.success("Expiry reported");
      reset();
    } catch (error) {
      toast.error(`Failed: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          Report Expiring Raw Material
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Category</Label>
            <Select value={categoryId} onValueChange={(v) => { setCategoryId(v); setItemId(""); }}>
              <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Raw Material</Label>
            <Select value={itemId} onValueChange={setItemId}>
              <SelectTrigger><SelectValue placeholder="Select item" /></SelectTrigger>
              <SelectContent>
                {filteredItems.map((i) => (
                  <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Expiry Date</Label>
            <Input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Batch / Lot Reference</Label>
            <Input value={batchRef} onChange={(e) => setBatchRef(e.target.value)} placeholder="Optional" />
          </div>
          <div>
            <Label className="text-xs">
              Quantity at Risk {selectedItem ? `(${selectedItem.selling_unit_label || selectedItem.unit || ""})` : ""}
            </Label>
            <Input type="number" step="0.01" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Photo Evidence</Label>
            <Input type="file" accept="image/*" onChange={handlePhoto} disabled={uploading} />
            {photoUrl && <p className="text-xs text-green-600 mt-1">Photo attached</p>}
          </div>
        </div>
        <div>
          <Label className="text-xs">Notes</Label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Storage condition, packaging, smell…" />
        </div>
        <Button onClick={handleSubmit} disabled={saving || uploading} className="gap-2">
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          Submit Report
        </Button>
      </CardContent>
    </Card>
  );
}