import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { uploadPrivateReceipt, fileLinkProps } from "@/lib/privateFiles";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Upload, TrendingUp, Loader2, ExternalLink, CheckCircle, XCircle, Clock } from "lucide-react";
import { toast } from "sonner";

export default function LevelUpgradeRequest({ client }) {
  const [selectedLevel, setSelectedLevel] = useState(null);
  const [paymentFile, setPaymentFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const queryClient = useQueryClient();

  const { data: registrationLevels = [] } = useQuery({
    queryKey: ["registrationLevels"],
    queryFn: () => base44.entities.RegistrationLevel.list("sort_order")
  });

  const { data: upgradeRequests = [] } = useQuery({
    queryKey: ["myUpgradeRequests", client.id],
    queryFn: () => base44.entities.LevelUpgradeRequest.filter({ client_id: client.id }, "-created_date")
  });

  const pendingRequest = upgradeRequests.find(r => r.status === "pending");

  const createUpgradeRequestMutation = useMutation({
    mutationFn: async (data) => base44.entities.LevelUpgradeRequest.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myUpgradeRequests"] });
      toast.success("Upgrade request submitted! Awaiting admin approval.");
      setSelectedLevel(null);
      setPaymentFile(null);
    },
    onError: () => {
      toast.error("Failed to submit upgrade request");
    }
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedLevel) {
      toast.error("Please select a registration level");
      return;
    }

    if (!paymentFile) {
      toast.error("Please upload payment confirmation receipt");
      return;
    }

    setUploading(true);
    try {
      const file_url = await uploadPrivateReceipt(paymentFile);

      await createUpgradeRequestMutation.mutateAsync({
        client_id: client.id,
        client_name: client.name,
        client_email: client.email,
        current_level_name: client.registration_level_name || "N/A",
        requested_level_id: selectedLevel.id,
        requested_level_name: selectedLevel.level_name,
        registration_fee: selectedLevel.registration_fee,
        welcome_cashback_percentage: selectedLevel.welcome_cashback_percentage,
        payment_receipt_url: file_url
      });

      base44.analytics.track({
        eventName: "level_upgrade_requested",
        properties: {
          client_id: client.id,
          requested_level: selectedLevel.level_name,
          fee: selectedLevel.registration_fee
        }
      });
    } catch (error) {
      toast.error("Failed to upload payment receipt");
    } finally {
      setUploading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "approved": return "bg-green-100 text-green-700 border-green-200";
      case "rejected": return "bg-red-100 text-red-700 border-red-200";
      default: return "bg-blue-100 text-blue-700 border-blue-200";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "approved": return <CheckCircle className="w-4 h-4" />;
      case "rejected": return <XCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Current Level Display */}
      <Card className="border-0 shadow-sm bg-gradient-to-r from-amber-50 to-orange-50">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 mb-1">Current Registration Level</p>
              <p className="text-2xl font-bold text-slate-900">
                {client.registration_level_name || registrationLevels.find((l) => l.is_default)?.level_name || "No level"}
              </p>
            </div>
            <TrendingUp className="w-12 h-12 text-amber-500 opacity-50" />
          </div>
        </CardContent>
      </Card>

      {/* Pending Request Alert */}
      {pendingRequest && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold text-blue-900 mb-1">Upgrade Request Pending</h4>
                <p className="text-sm text-blue-700">
                  Your request to upgrade to <strong>{pendingRequest.requested_level_name}</strong> ({pendingRequest.registration_fee} EGP) is awaiting admin approval.
                </p>
                {pendingRequest.payment_receipt_url && (
                  <a
                    {...fileLinkProps(pendingRequest.payment_receipt_url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 mt-2"
                  >
                    <ExternalLink className="w-3 h-3" />
                    View Payment Receipt
                  </a>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upgrade Request Form */}
      {!pendingRequest && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Upgrade Registration Level
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Level Selection */}
              <div className="space-y-3">
                <Label>Select New Registration Level</Label>
                {registrationLevels.length === 0 ? (
                  <p className="text-sm text-slate-500 p-3 bg-slate-50 rounded-lg">
                    No registration levels available.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {registrationLevels.filter(l => l.is_active).map((level) => {
                      const isCurrentLevel = client.registration_level_id === level.id || 
                                            (!client.registration_level_id && level.is_default === true);
                      return (
                        <div
                          key={level.id}
                          onClick={() => !isCurrentLevel && setSelectedLevel(level)}
                          className={`p-4 border-2 rounded-lg transition-all ${
                            isCurrentLevel
                              ? "border-blue-300 bg-blue-50 cursor-not-allowed opacity-75"
                              : selectedLevel?.id === level.id
                              ? "border-amber-500 bg-amber-50 cursor-pointer"
                              : "border-slate-200 hover:border-amber-300 cursor-pointer"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold text-slate-900">{level.level_name}</h4>
                              {isCurrentLevel && (
                                <Badge className="bg-blue-100 text-blue-700 border-blue-200">
                                  Current Level
                                </Badge>
                              )}
                            </div>
                            <span className="text-lg font-bold text-amber-600">
                              {level.registration_fee} EGP
                            </span>
                          </div>
                          {level.description && (
                            <p className="text-sm text-slate-600 mb-3">{level.description}</p>
                          )}
                          <div className="flex flex-wrap gap-2">
                            <Badge variant="outline" className="text-xs">
                              Welcome: {(level.registration_fee * level.welcome_cashback_percentage / 100).toFixed(2)} EGP
                            </Badge>
                            {level.permanent_discount_percentage > 0 && (
                              <Badge variant="outline" className="text-xs">
                                Discount: {level.permanent_discount_percentage}%
                              </Badge>
                            )}
                            {level.delivery_discount_percentage > 0 && (
                              <Badge variant="outline" className="text-xs">
                                Delivery: {level.delivery_discount_percentage}%
                              </Badge>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Payment Receipt Upload */}
              {selectedLevel && (
                <div className="space-y-2">
                  <Label htmlFor="payment_receipt">Payment Confirmation Receipt</Label>
                  <div className="border-2 border-dashed border-slate-200 rounded-lg p-6 text-center hover:border-amber-400 transition-colors">
                    <input
                      id="payment_receipt"
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => setPaymentFile(e.target.files[0])}
                      className="hidden"
                      required
                    />
                    <label htmlFor="payment_receipt" className="cursor-pointer">
                      <Upload className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                      <p className="text-sm text-slate-600">
                        {paymentFile ? paymentFile.name : "Click to upload payment receipt"}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">PNG, JPG or PDF</p>
                    </label>
                  </div>
                  <p className="text-xs text-slate-500">
                    Upload proof of payment for {selectedLevel.registration_fee} EGP
                  </p>
                </div>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full bg-amber-500 hover:bg-amber-600"
                disabled={uploading || createUpgradeRequestMutation.isPending || !selectedLevel || !paymentFile}
              >
                {(uploading || createUpgradeRequestMutation.isPending) ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit Upgrade Request"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Request History */}
      {upgradeRequests.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Request History</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {upgradeRequests.map((request) => (
              <div key={request.id} className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium text-slate-900">{request.requested_level_name}</p>
                    <p className="text-sm text-slate-500">Fee: {request.registration_fee} EGP</p>
                  </div>
                  <Badge className={getStatusColor(request.status)}>
                    {getStatusIcon(request.status)}
                    <span className="ml-1 capitalize">{request.status}</span>
                  </Badge>
                </div>
                {request.rejection_reason && (
                  <p className="text-sm text-red-600 mt-2">
                    Reason: {request.rejection_reason}
                  </p>
                )}
                {request.payment_receipt_url && (
                  <a
                    {...fileLinkProps(request.payment_receipt_url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-amber-600 hover:text-amber-700 mt-2"
                  >
                    <ExternalLink className="w-3 h-3" />
                    View Receipt
                  </a>
                )}
                <p className="text-xs text-slate-400 mt-2">
                  {new Date(request.created_date).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}