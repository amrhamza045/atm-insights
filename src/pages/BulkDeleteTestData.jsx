import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { resyncAfterBulk } from "@/lib/permissionResync";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Trash2, Loader2, CheckCircle } from "lucide-react";
import { toast } from "sonner";

const ENTITY_TYPES = [
  "Client",
  "Purchase",
  "Redemption",
  "Payout",
  "PurchaseSubmission",
  "RegistrationRequest",
  "Reward",
  "ReferralBonus",
  "MilestoneAchievement",
  "Notification",
];

export default function BulkDeleteTestData() {
  const [selectedEntity, setSelectedEntity] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [deletedCount, setDeletedCount] = useState(0);
  const queryClient = useQueryClient();

  const { data: records = [], isLoading } = useQuery({
    queryKey: ["bulkDelete", selectedEntity],
    queryFn: async () => {
      if (!selectedEntity) return [];
      const entity = base44.entities[selectedEntity];
      return await entity.list("-created_date");
    },
    enabled: !!selectedEntity,
  });

  const filteredRecords = useMemo(() => {
    if (!searchQuery.trim()) return records;
    const query = searchQuery.toLowerCase();
    return records.filter(r => {
      const name = r.name || r.full_name || r.client_name || r.reward_name || "";
      const email = r.email || r.client_email || "";
      const id = r.id || "";
      return (
        name.toLowerCase().includes(query) ||
        email.toLowerCase().includes(query) ||
        id.toLowerCase().includes(query)
      );
    });
  }, [records, searchQuery]);

  const deleteMutation = useMutation({
    mutationFn: async (idsToDelete) => {
      const entity = base44.entities[selectedEntity];
      let count = 0;
      for (const id of idsToDelete) {
        try {
          await entity.delete(id);
          count++;
        } catch (error) {
          console.error(`Failed to delete ${id}:`, error);
        }
      }
      if (count) await resyncAfterBulk([selectedEntity]);
      return count;
    },
    onSuccess: (count) => {
      setDeletedCount(count);
      setSelectedIds([]);
      queryClient.invalidateQueries({ queryKey: ["bulkDelete", selectedEntity] });
      toast.success(`Deleted ${count} record(s)`);
      setTimeout(() => setDeletedCount(0), 3000);
    },
    onError: () => {
      toast.error("Failed to delete records");
    },
  });

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedIds(filteredRecords.map(r => r.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleRecord = (id) => {
    setSelectedIds(prev =>
      prev.includes(id)
        ? prev.filter(rid => rid !== id)
        : [...prev, id]
    );
  };

  const handleDelete = () => {
    if (selectedIds.length === 0) {
      toast.error("Select records to delete");
      return;
    }
    setShowConfirm(true);
  };

  const confirmDelete = () => {
    setShowConfirm(false);
    deleteMutation.mutate(selectedIds);
  };

  const getRecordLabel = (record) => {
    return (
      record.name ||
      record.full_name ||
      record.client_name ||
      record.reward_name ||
      record.email ||
      record.client_email ||
      record.id
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Bulk Delete Test Data
          </h1>
          <p className="text-slate-600">
            Safely delete multiple test records at once
          </p>
        </div>

        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-500" />
              Select Entity Type
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select value={selectedEntity} onValueChange={setSelectedEntity}>
              <SelectTrigger>
                <SelectValue placeholder="Choose entity type..." />
              </SelectTrigger>
              <SelectContent>
                {ENTITY_TYPES.map(type => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {selectedEntity && (
          <>
            {deletedCount > 0 && (
              <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-green-700 font-medium">
                  Successfully deleted {deletedCount} record(s)
                </span>
              </div>
            )}

            <Card className="border-0 shadow-sm mt-6">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Records ({filteredRecords.length})</CardTitle>
                  {filteredRecords.length > 0 && (
                    <span className="text-sm text-slate-600">
                      {selectedIds.length} selected
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {isLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                  </div>
                ) : filteredRecords.length === 0 ? (
                  <p className="text-center text-slate-500 py-8">
                    No records found
                  </p>
                ) : (
                  <>
                    <div className="flex gap-2 pb-4 border-b">
                      <Input
                        placeholder="Search records..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="flex-1"
                      />
                    </div>

                    <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
                      <Checkbox
                        id="select-all"
                        checked={
                          filteredRecords.length > 0 &&
                          selectedIds.length === filteredRecords.length
                        }
                        onCheckedChange={handleSelectAll}
                      />
                      <Label htmlFor="select-all" className="text-sm cursor-pointer">
                        Select all ({filteredRecords.length})
                      </Label>
                    </div>

                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {filteredRecords.map(record => (
                        <div
                          key={record.id}
                          className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                        >
                          <Checkbox
                            id={record.id}
                            checked={selectedIds.includes(record.id)}
                            onCheckedChange={() => handleToggleRecord(record.id)}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-900 truncate">
                              {getRecordLabel(record)}
                            </p>
                            <p className="text-xs text-slate-500">
                              ID: {record.id.substring(0, 12)}...
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="pt-4 border-t flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSelectedIds([]);
                          setSearchQuery("");
                        }}
                      >
                        Clear Selection
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={handleDelete}
                        disabled={selectedIds.length === 0 || deleteMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete {selectedIds.length > 0 ? `(${selectedIds.length})` : ""}
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.length} Record(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. You are about to permanently delete{" "}
              <span className="font-bold">{selectedIds.length}</span> record(s) from{" "}
              <span className="font-bold">{selectedEntity}</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="bg-red-50 border border-red-200 rounded p-3 my-4">
            <p className="text-sm text-red-800">
              ⚠️ This is permanent and cannot be reversed.
            </p>
          </div>
          <div className="flex gap-3">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}