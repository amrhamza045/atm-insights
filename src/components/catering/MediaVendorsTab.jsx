import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Camera, Plus, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/components/utils/currencyFormatter";
import MediaVendorFormDialog from "./MediaVendorFormDialog";

const SERVICE_LABEL = { photographer: "Photographer", videographer: "Videographer", both: "Photo + Video" };
const TIER_LABEL = { budget: "Budget", mid_range: "Mid-range", premium: "Premium" };
const BASIS_LABEL = { per_event: "per event", per_hour: "per hour", per_day: "per day" };

export default function MediaVendorsTab() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const { data: vendors = [], isLoading } = useQuery({
    queryKey: ["catering-media-vendors"],
    queryFn: () => base44.entities.CateringMediaVendor.list("-created_date", 200),
  });

  const handleSave = async (data) => {
    setSaving(true);
    try {
      if (editing) {
        await base44.entities.CateringMediaVendor.update(editing.id, data);
      } else {
        await base44.entities.CateringMediaVendor.create({ ...data, is_active: true });
      }
      toast.success("Vendor saved");
      setDialogOpen(false);
      setEditing(null);
      queryClient.invalidateQueries({ queryKey: ["catering-media-vendors"] });
    } catch (e) {
      toast.error(e.message || "Could not save the vendor");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (v) => {
    await base44.entities.CateringMediaVendor.delete(v.id);
    queryClient.invalidateQueries({ queryKey: ["catering-media-vendors"] });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Camera className="w-4 h-4 text-amber-600" />
            Photography & videography vendors
          </CardTitle>
          <Button size="sm" className="bg-slate-900 hover:bg-slate-800" onClick={() => { setEditing(null); setDialogOpen(true); }}>
            <Plus className="w-4 h-4 mr-1" /> Add vendor
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-slate-500">Loading vendors…</p>
          ) : vendors.length === 0 ? (
            <p className="text-sm text-slate-500">No photographers or videographers added yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead>Coverage</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendors.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell className="font-medium">
                      {v.name}
                      {v.deliverables && <span className="block text-xs text-slate-400">{v.deliverables}</span>}
                    </TableCell>
                    <TableCell><Badge className="bg-amber-100 text-amber-700">{SERVICE_LABEL[v.service_type]}</Badge></TableCell>
                    <TableCell className="text-slate-500">{TIER_LABEL[v.tier] || "—"}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(v.price)}
                      <span className="block text-xs text-slate-400">{BASIS_LABEL[v.price_basis]}</span>
                    </TableCell>
                    <TableCell>{v.coverage_hours ? `${v.coverage_hours} h` : "—"}</TableCell>
                    <TableCell className="text-slate-500 text-xs">
                      {v.phone || "—"}
                      {v.instagram && <span className="block">{v.instagram}</span>}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <Button size="icon" variant="ghost" onClick={() => { setEditing(v); setDialogOpen(true); }}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="text-red-600" onClick={() => handleDelete(v)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {dialogOpen && (
        <MediaVendorFormDialog
          vendor={editing}
          open={dialogOpen}
          onOpenChange={(o) => { if (!o) { setDialogOpen(false); setEditing(null); } }}
          onSave={handleSave}
          saving={saving}
        />
      )}
    </div>
  );
}