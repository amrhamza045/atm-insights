import { useState } from "react";
import { brandName } from "@/lib/brandName";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Mail, Bell, MessageSquare, Send, Edit, Trash2, Users, BarChart3, Plus, Target, Calendar, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";

export default function MarketingCampaigns() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [sendingCampaign, setSendingCampaign] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    type: "email",
    trigger_type: "manual",
    target_audience: "all",
    tier_filter: [],
    subject: "",
    message: "",
    cta_text: "",
    cta_url: "",
    is_active: true,
    is_automated: false,
    delay_days: 0
  });

  const queryClient = useQueryClient();

  const { data: campaigns = [] } = useQuery({
    queryKey: ["marketingCampaigns"],
    queryFn: () => base44.entities.MarketingCampaign.list("-created_date")
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: () => base44.entities.Client.list()
  });


  const { data: recipients = [] } = useQuery({
    queryKey: ["campaignRecipients"],
    queryFn: () => base44.entities.CampaignRecipient.list("-created_date")
  });

  const saveCampaignMutation = useMutation({
    mutationFn: async (data) => {
      if (editingCampaign) {
        return base44.entities.MarketingCampaign.update(editingCampaign.id, data);
      }
      return base44.entities.MarketingCampaign.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["marketingCampaigns"]);
      setDialogOpen(false);
      resetForm();
      toast.success(editingCampaign ? "Campaign updated" : "Campaign created");
    }
  });

  const deleteCampaignMutation = useMutation({
    mutationFn: (id) => base44.entities.MarketingCampaign.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(["marketingCampaigns"]);
      toast.success("Campaign deleted");
    }
  });

  const sendCampaignMutation = useMutation({
    mutationFn: async (campaign) => {
      // Filter clients based on target audience
      const audiences = {
        all: () => true,
        active: (c) => c.status === "active",
        inactive: (c) => c.status === "inactive",
      };
      const inAudience = audiences[campaign.target_audience];
      if (!inAudience) {
        throw new Error("This campaign's audience is no longer available. Edit the campaign and choose an audience first.");
      }
      const targetClients = clients.filter(inAudience);

      // Create recipient records and send
      const recipientPromises = targetClients.map(async (client) => {
        const recipient = await base44.entities.CampaignRecipient.create({
          campaign_id: campaign.id,
          campaign_name: campaign.name,
          client_id: client.id,
          client_email: client.email,
          client_name: client.name,
          status: "pending"
        });

        try {
          if (campaign.type === "email" && client.email) {
            await base44.integrations.Core.SendEmail({
              to: client.email,
              subject: campaign.subject || campaign.name,
              body: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #f59e0b;">${campaign.subject || campaign.name}</h2>
                  <div style="margin: 20px 0;">
                    ${campaign.message.replace(/\n/g, '<br>')}
                  </div>
                  ${campaign.cta_text && campaign.cta_url ? `
                    <a href="${campaign.cta_url}" style="display: inline-block; background-color: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">
                      ${campaign.cta_text}
                    </a>
                  ` : ''}
                  <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px;">
                    <p>This message was sent by ${brandName()}.</p>
                  </div>
                </div>
              `
            });
          } else if (campaign.type === "notification") {
            await base44.entities.Notification.create({
              client_id: client.id,
              client_email: client.email,
              title: campaign.subject || campaign.name,
              message: campaign.message,
              type: "promotion"
            });
          }

          await base44.entities.CampaignRecipient.update(recipient.id, {
            status: "sent",
            sent_date: new Date().toISOString()
          });
          
          return { success: true };
        } catch (error) {
          await base44.entities.CampaignRecipient.update(recipient.id, {
            status: "failed",
            error_message: error.message
          });
          return { success: false };
        }
      });

      const results = await Promise.all(recipientPromises);
      const sentCount = results.filter(r => r.success).length;

      // Update campaign stats
      await base44.entities.MarketingCampaign.update(campaign.id, {
        recipients_count: targetClients.length,
        sent_count: sentCount,
        last_sent_date: new Date().toISOString()
      });

      return { total: targetClients.length, sent: sentCount };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(["marketingCampaigns"]);
      queryClient.invalidateQueries(["campaignRecipients"]);
      toast.success(`Campaign sent to ${data.sent} of ${data.total} recipients`);
      setSendingCampaign(null);
    },
    onError: (error) => {
      toast.error(error?.message || "Failed to send campaign");
      setSendingCampaign(null);
    }
  });

  const handleEdit = (campaign) => {
    setEditingCampaign(campaign);
    setFormData({
      name: campaign.name,
      description: campaign.description || "",
      type: campaign.type,
      trigger_type: campaign.trigger_type,
      target_audience: campaign.target_audience,
      tier_filter: campaign.tier_filter || [],
      subject: campaign.subject || "",
      message: campaign.message,
      cta_text: campaign.cta_text || "",
      cta_url: campaign.cta_url || "",
      is_active: campaign.is_active,
      is_automated: campaign.is_automated,
      delay_days: campaign.delay_days || 0
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingCampaign(null);
    setFormData({
      name: "",
      description: "",
      type: "email",
      trigger_type: "manual",
      target_audience: "all",
      tier_filter: [],
      subject: "",
      message: "",
      cta_text: "",
      cta_url: "",
      is_active: true,
      is_automated: false,
      delay_days: 0
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    saveCampaignMutation.mutate(formData);
  };

  const handleSendCampaign = (campaign) => {
    if (confirm(`Send campaign "${campaign.name}" to targeted clients?`)) {
      setSendingCampaign(campaign.id);
      sendCampaignMutation.mutate(campaign);
    }
  };

  const getCampaignIcon = (type) => {
    switch (type) {
      case "email": return Mail;
      case "notification": return Bell;
      case "sms": return MessageSquare;
      default: return Mail;
    }
  };

  const getCampaignRecipients = (campaignId) => {
    return recipients.filter(r => r.campaign_id === campaignId);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Marketing Campaigns</h2>
          <p className="text-sm text-slate-500">Create and manage automated marketing campaigns</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="bg-amber-500 hover:bg-amber-600">
              <Plus className="w-4 h-4 mr-2" />
              New Campaign
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingCampaign ? "Edit Campaign" : "Create New Campaign"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Campaign Name</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder={`Welcome to ${brandName()}`}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="notification">In-App Notification</SelectItem>
                      <SelectItem value="sms">SMS</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Trigger</Label>
                  <Select value={formData.trigger_type} onValueChange={(value) => setFormData({ ...formData, trigger_type: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Manual</SelectItem>
                      <SelectItem value="onboarding">New Client Onboarding</SelectItem>
                      <SelectItem value="inactivity">Inactivity</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Target Audience</Label>
                  <Select value={formData.target_audience} onValueChange={(value) => setFormData({ ...formData, target_audience: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Clients</SelectItem>
                      <SelectItem value="active">Active Clients</SelectItem>
                      <SelectItem value="inactive">Inactive Clients</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Subject/Title</Label>
                <Input
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="Plan your next event with us"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Message</Label>
                <Textarea
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Campaign message..."
                  rows={6}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Call to Action Text</Label>
                  <Input
                    value={formData.cta_text}
                    onChange={(e) => setFormData({ ...formData, cta_text: e.target.value })}
                    placeholder="Book a tasting"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Call to Action URL</Label>
                  <Input
                    value={formData.cta_url}
                    onChange={(e) => setFormData({ ...formData, cta_url: e.target.value })}
                    placeholder="https://"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <div className="space-y-1">
                  <Label>Automated Campaign</Label>
                  <p className="text-xs text-slate-500">Run automatically when trigger occurs</p>
                </div>
                <Switch
                  checked={formData.is_automated}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_automated: checked })}
                />
              </div>

              {formData.is_automated && (
                <div className="space-y-2">
                  <Label>Delay (Days)</Label>
                  <Input
                    type="number"
                    value={formData.delay_days}
                    onChange={(e) => setFormData({ ...formData, delay_days: parseInt(e.target.value) || 0 })}
                    min="0"
                    placeholder="0"
                  />
                  <p className="text-xs text-slate-500">Days to wait before sending after trigger</p>
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button type="submit" className="flex-1" disabled={saveCampaignMutation.isPending}>
                  {saveCampaignMutation.isPending ? "Saving..." : editingCampaign ? "Update Campaign" : "Create Campaign"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total Campaigns</p>
                <p className="text-2xl font-bold">{campaigns.length}</p>
              </div>
              <Target className="w-8 h-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Active</p>
                <p className="text-2xl font-bold">{campaigns.filter(c => c.is_active).length}</p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Automated</p>
                <p className="text-2xl font-bold">{campaigns.filter(c => c.is_automated).length}</p>
              </div>
              <Calendar className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total Sent</p>
                <p className="text-2xl font-bold">{recipients.filter(r => r.status === "sent").length}</p>
              </div>
              <BarChart3 className="w-8 h-8 text-violet-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Campaigns List */}
      <div className="grid gap-4">
        {campaigns.map(campaign => {
          const Icon = getCampaignIcon(campaign.type);
          const campaignRecipients = getCampaignRecipients(campaign.id);
          const sentCount = campaignRecipients.filter(r => r.status === "sent").length;
          const failedCount = campaignRecipients.filter(r => r.status === "failed").length;

          return (
            <Card key={campaign.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div className={`p-3 rounded-lg ${
                      campaign.type === "email" ? "bg-blue-100" :
                      campaign.type === "notification" ? "bg-purple-100" : "bg-green-100"
                    }`}>
                      <Icon className={`w-5 h-5 ${
                        campaign.type === "email" ? "text-blue-600" :
                        campaign.type === "notification" ? "text-purple-600" : "text-green-600"
                      }`} />
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-slate-900">{campaign.name}</h3>
                        {campaign.is_automated && (
                          <Badge variant="secondary" className="text-xs">
                            <Calendar className="w-3 h-3 mr-1" />
                            Auto
                          </Badge>
                        )}
                        <Badge variant={campaign.is_active ? "default" : "outline"}>
                          {campaign.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      
                      {campaign.description && (
                        <p className="text-sm text-slate-600 mb-2">{campaign.description}</p>
                      )}
                      
                      <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                        <span>Trigger: {campaign.trigger_type}</span>
                        <span>•</span>
                        <span>Audience: {campaign.target_audience}</span>
                        {campaign.recipients_count > 0 && (
                          <>
                            <span>•</span>
                            <span>{campaign.recipients_count} recipients</span>
                          </>
                        )}
                      </div>

                      {campaignRecipients.length > 0 && (
                        <div className="flex gap-4 mt-3 text-sm">
                          <span className="text-green-600 flex items-center gap-1">
                            <CheckCircle2 className="w-4 h-4" />
                            {sentCount} sent
                          </span>
                          {failedCount > 0 && (
                            <span className="text-red-600 flex items-center gap-1">
                              <XCircle className="w-4 h-4" />
                              {failedCount} failed
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {!campaign.is_automated && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSendCampaign(campaign)}
                        disabled={sendingCampaign === campaign.id}
                      >
                        <Send className="w-4 h-4 mr-2" />
                        {sendingCampaign === campaign.id ? "Sending..." : "Send Now"}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(campaign)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (confirm("Delete this campaign?")) {
                          deleteCampaignMutation.mutate(campaign.id);
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {campaigns.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <Target className="w-12 h-12 mx-auto text-slate-300 mb-4" />
              <h3 className="font-medium text-slate-900 mb-2">No campaigns yet</h3>
              <p className="text-sm text-slate-500 mb-4">Create your first marketing campaign to engage clients</p>
              <Button onClick={() => setDialogOpen(true)} className="bg-amber-500 hover:bg-amber-600">
                <Plus className="w-4 h-4 mr-2" />
                Create Campaign
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}