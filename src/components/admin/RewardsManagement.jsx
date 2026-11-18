import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Mail } from "lucide-react";
import { toast } from "sonner";
import RewardCard from "@/components/rewards/RewardCard";
import RewardForm from "@/components/admin/RewardForm";
import { sendNewRewardsEmail } from "@/components/utils/emailNotifications";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export default function RewardsManagement() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingReward, setEditingReward] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sendEmailNotifications, setSendEmailNotifications] = useState(true);
  const queryClient = useQueryClient();

  const { data: rewards = [] } = useQuery({
    queryKey: ["rewards"],
    queryFn: () => base44.entities.Reward.list("-created_date")
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: () => base44.entities.Client.list()
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const reward = await base44.entities.Reward.create(data);
      
      // Send email notifications to all active clients
      if (sendEmailNotifications) {
        const activeClients = clients.filter(c => c.status === "active" && c.email);
        
        // Send emails in batches to avoid overwhelming the server
        for (const client of activeClients) {
          try {
            await sendNewRewardsEmail(client.email, client.name, [reward]);
          } catch (error) {
            console.error(`Failed to send email to ${client.email}:`, error);
          }
        }
        
        toast.success(`Reward created and ${activeClients.length} email notifications sent!`);
      } else {
        toast.success("Reward created successfully!");
      }
      
      return reward;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rewards"] });
      setDialogOpen(false);
      setEditingReward(null);
    },
    onError: () => {
      toast.error("Failed to create reward");
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Reward.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rewards"] });
      toast.success("Reward updated");
      setDialogOpen(false);
      setEditingReward(null);
    },
    onError: () => {
      toast.error("Failed to update reward");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Reward.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rewards"] });
      toast.success("Reward deleted");
    },
    onError: () => {
      toast.error("Failed to delete reward");
    }
  });

  const handleOpen = (reward = null) => {
    setEditingReward(reward);
    setDialogOpen(true);
  };

  const handleSave = (data) => {
    if (editingReward) {
      updateMutation.mutate({ id: editingReward.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const filteredRewards = useMemo(() => {
    if (!searchQuery.trim()) return rewards;
    const query = searchQuery.toLowerCase();
    return rewards.filter(r => 
      r.name?.toLowerCase().includes(query) ||
      r.description?.toLowerCase().includes(query) ||
      r.category?.toLowerCase().includes(query)
    );
  }, [rewards, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Rewards Management</h2>
          <p className="text-sm text-slate-500 mt-1">
            Create and manage rewards that clients can redeem with cashback
          </p>
        </div>
        <Button onClick={() => handleOpen()} className="bg-amber-500 hover:bg-amber-600">
          <Plus className="w-4 h-4 mr-2" />
          Create Reward
        </Button>
      </div>

      {/* Email Notification Toggle */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-blue-600" />
              <div>
                <Label className="text-blue-900 font-medium">Email Notifications</Label>
                <p className="text-xs text-blue-700 mt-0.5">
                  Notify all active clients when creating new rewards
                </p>
              </div>
            </div>
            <Switch
              checked={sendEmailNotifications}
              onCheckedChange={setSendEmailNotifications}
            />
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Search rewards..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-white"
        />
      </div>

      {/* Rewards Grid */}
      {filteredRewards.length === 0 ? (
        <Card className="p-12 text-center border-0 shadow-sm">
          <h3 className="font-medium text-slate-900">No rewards found</h3>
          <p className="text-sm text-slate-500 mt-1">
            {searchQuery ? "Try a different search term" : "Create your first reward to get started"}
          </p>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRewards.map(reward => (
            <RewardCard
              key={reward.id}
              reward={reward}
              onEdit={() => handleOpen(reward)}
              onDelete={() => deleteMutation.mutate(reward.id)}
              showAdminActions={true}
            />
          ))}
        </div>
      )}

      {/* Form Dialog */}
      <RewardForm
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        reward={editingReward}
        onSave={handleSave}
        isSaving={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  );
}