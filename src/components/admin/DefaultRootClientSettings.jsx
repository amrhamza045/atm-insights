import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { UserCircle, Save, Search, Check } from "lucide-react";
import { toast } from "sonner";

export default function DefaultRootClientSettings() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClient, setSelectedClient] = useState(null);
  const queryClient = useQueryClient();

  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: () => base44.entities.Client.list("name")
  });

  const { data: settings } = useQuery({
    queryKey: ["systemSettings"],
    queryFn: async () => {
      const list = await base44.entities.SystemSettings.list();
      return list[0] || null;
    }
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (data) => {
      if (settings?.id) {
        return base44.entities.SystemSettings.update(settings.id, data);
      } else {
        return base44.entities.SystemSettings.create({
          setting_key: "main",
          ...data
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["systemSettings"] });
      toast.success("Default root client updated successfully");
      setSearchQuery("");
      setSelectedClient(null);
    }
  });

  const currentDefaultClient = clients.find(c => c.id === settings?.default_root_client_id);

  const filteredClients = clients.filter(c => 
    c.status === "active" && 
    c.referral_code &&
    (c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
     c.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
     c.referral_code?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleSave = async () => {
    if (!selectedClient) {
      toast.error("Please select a client first");
      return;
    }

    await updateSettingsMutation.mutateAsync({
      default_root_client_id: selectedClient.id,
      default_root_client_name: selectedClient.name
    });
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserCircle className="w-5 h-5" />
          Default Root Client
        </CardTitle>
        <CardDescription>
          Set a default client whose referral code will be used when new users register without a referral code
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Default */}
        {currentDefaultClient && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-600 font-medium mb-2">Current Default Root Client</p>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-green-900">{currentDefaultClient.name}</p>
                <p className="text-sm text-green-700">{currentDefaultClient.email}</p>
                <Badge variant="outline" className="mt-1">
                  Code: {currentDefaultClient.referral_code}
                </Badge>
              </div>
              <Check className="w-6 h-6 text-green-600" />
            </div>
          </div>
        )}

        {/* Search and Select */}
        <div className="space-y-2">
          <Label htmlFor="search">Search Active Clients</Label>
          <div className="flex gap-2">
            <Input
              id="search"
              placeholder="Search by name, email, or referral code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Button variant="outline" disabled>
              <Search className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Client Selection */}
        {searchQuery && (
          <div className="max-h-64 overflow-y-auto space-y-2 border rounded-lg p-2">
            {filteredClients.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">
                No active clients found
              </p>
            ) : (
              filteredClients.map((client) => (
                <div
                  key={client.id}
                  onClick={() => setSelectedClient(client)}
                  className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedClient?.id === client.id
                      ? "border-amber-500 bg-amber-50"
                      : "border-slate-200 hover:border-amber-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-slate-900">{client.name}</p>
                      <p className="text-sm text-slate-600">{client.email}</p>
                      <Badge variant="outline" className="mt-1 text-xs">
                        {client.referral_code}
                      </Badge>
                    </div>
                    {selectedClient?.id === client.id && (
                      <Check className="w-5 h-5 text-amber-600" />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Selected Client Display */}
        {selectedClient && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-600 font-medium mb-2">Selected Client</p>
            <p className="font-bold text-amber-900">{selectedClient.name}</p>
            <p className="text-sm text-amber-700">{selectedClient.email}</p>
            <Badge variant="outline" className="mt-1">
              Code: {selectedClient.referral_code}
            </Badge>
          </div>
        )}

        {/* Save Button */}
        <Button
          onClick={handleSave}
          disabled={!selectedClient || updateSettingsMutation.isPending}
          className="w-full bg-amber-500 hover:bg-amber-600"
        >
          <Save className="w-4 h-4 mr-2" />
          {updateSettingsMutation.isPending ? "Saving..." : "Set as Default Root Client"}
        </Button>
      </CardContent>
    </Card>
  );
}