import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { activateRegistrationRequest } from "@/components/registration/activateClient";

export default function PendingApprovals({ clientId }) {
  const queryClient = useQueryClient();
  const [rejectingId, setRejectingId] = useState(null);

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["pendingRequests", clientId],
    queryFn: () => base44.entities.RegistrationRequest.filter({ 
      referrer_id: clientId,
      status: "pending_referrer"
    })
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: () => base44.entities.Client.list("id", 5000)
  });

  const { data: tiers = [] } = useQuery({
    queryKey: ["cashbackTiers"],
    queryFn: () => base44.entities.CashbackTier.list("min_referrals")
  });

  const { data: registrationLevels = [] } = useQuery({
    queryKey: ["registrationLevels"],
    queryFn: () => base44.entities.RegistrationLevel.list("sort_order")
  });

  const approveMutation = useMutation({
    mutationFn: async (requestId) => {
      const request = requests.find(r => r.id === requestId);
      // Automatically activate the client — no admin approval needed
      await activateRegistrationRequest(request, clients, tiers, registrationLevels);
      
      // Track referrer approval
      base44.analytics.track({
        eventName: "referrer_approved_registration",
        properties: {
          request_id: requestId,
          referrer_id: request.referrer_id,
          applicant_name: request.full_name
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["pendingRequests"]);
      queryClient.invalidateQueries(["clients"]);
      toast.success("Request approved! Client account created automatically.");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to approve request");
    }
  });

  const rejectMutation = useMutation({
    mutationFn: async (requestId) => {
      const request = requests.find(r => r.id === requestId);
      
      await base44.entities.RegistrationRequest.update(requestId, {
        status: "rejected_referrer",
        rejection_reason: "Rejected by referrer"
      });
      
      // Track referrer rejection
      base44.analytics.track({
        eventName: "referrer_rejected_registration",
        properties: {
          request_id: requestId,
          referrer_id: request.referrer_id,
          applicant_name: request.full_name
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["pendingRequests"]);
      toast.success("Request rejected");
      setRejectingId(null);
    },
    onError: () => {
      toast.error("Failed to reject request");
    }
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pending Approvals</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (requests.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pending Approvals</CardTitle>
          <CardDescription>New registrations using your referral code</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500 text-center py-8">
            No pending approval requests
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Pending Approvals</CardTitle>
          <CardDescription>
            {requests.length} {requests.length === 1 ? "person" : "people"} waiting for your approval
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {requests.map((request) => (
            <div key={request.id} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <h4 className="font-semibold">{request.full_name}</h4>
                  <p className="text-sm text-slate-600">{request.email}</p>
                  <p className="text-sm text-slate-600">{request.phone}</p>
                </div>
                <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                  Pending
                </Badge>
              </div>

              {request.payment_scan_url && (
                <a
                  href={request.payment_scan_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-amber-600 hover:text-amber-700"
                >
                  <ExternalLink className="w-4 h-4" />
                  View Payment Document
                </a>
              )}

              <div className="flex gap-2 pt-2">
                <Button
                  size="sm"
                  onClick={() => approveMutation.mutate(request.id)}
                  disabled={approveMutation.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setRejectingId(request.id)}
                  disabled={rejectMutation.isPending}
                  className="text-red-600 hover:text-red-700 border-red-200 hover:bg-red-50"
                >
                  <XCircle className="w-4 h-4 mr-1" />
                  Reject
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <AlertDialog open={!!rejectingId} onOpenChange={() => setRejectingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Registration Request?</AlertDialogTitle>
            <AlertDialogDescription>
              This will reject the registration request. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => rejectMutation.mutate(rejectingId)}
              className="bg-red-600 hover:bg-red-700"
            >
              Reject Request
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}