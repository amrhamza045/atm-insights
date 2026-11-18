import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, ExternalLink, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { activateRegistrationRequest } from "@/components/registration/activateClient";
import { formatCurrency } from "@/components/utils/currencyFormatter";
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

import { useIsAdmin, usePermissions } from "@/components/permissions/PermissionsContext";

export default function RegistrationApprovals() {
  const queryClient = useQueryClient();
  const [rejectingId, setRejectingId] = useState(null);

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["adminPendingRequests"],
    queryFn: () => base44.entities.RegistrationRequest.filter({ 
      status: "pending_admin"
    }, "-created_date")
  });

  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me()
  });

  // Resolved centrally by PermissionsProvider — no duplicate permission read.
  const { permissions: userPermissions } = usePermissions();

  const isAdmin = useIsAdmin();
  // Same entitlement as the Operations Approvals tab — flag, not role name.
  const canApprove = isAdmin || !!userPermissions?.admin_operations;

  const { data: tiers = [] } = useQuery({
    queryKey: ["cashbackTiers"],
    queryFn: () => base44.entities.CashbackTier.list("min_referrals")
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: () => base44.entities.Client.list("id", 5000)
  });

  const { data: registrationLevels = [] } = useQuery({
    queryKey: ["registrationLevels"],
    queryFn: () => base44.entities.RegistrationLevel.list("sort_order")
  });

  const approveMutation = useMutation({
    mutationFn: async (requestId) => {
      const request = requests.find(r => r.id === requestId);
      await activateRegistrationRequest(request, clients, tiers, registrationLevels);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["adminPendingRequests"]);
      queryClient.invalidateQueries(["clients"]);
      toast.success("Registration approved! Client account created.");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to approve registration");
    }
  });

  const rejectMutation = useMutation({
    mutationFn: async (requestId) => {
      const request = requests.find(r => r.id === requestId);
      
      await base44.entities.RegistrationRequest.update(requestId, {
        status: "rejected_admin",
        rejection_reason: "Payment not confirmed"
      });
      
      // Track admin rejection
      try {
        await base44.analytics.track({
          eventName: "admin_rejected_registration",
          properties: {
            request_id: requestId,
            client_name: request.full_name,
            referrer_id: request.referrer_id
          }
        });
      } catch (error) {
        console.error('Analytics tracking failed:', error);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["adminPendingRequests"]);
      toast.success("Registration rejected");
      setRejectingId(null);
    },
    onError: () => {
      toast.error("Failed to reject registration");
    }
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-slate-500">No pending registrations</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {requests.map((request) => {
          const duplicateClient = request.email
            ? clients.find(c => c.loyalty_program_enrolled && c.email && c.email.toLowerCase().trim() === request.email.toLowerCase().trim())
            : null;

          return (
            <Card key={request.id} className={duplicateClient ? "border-red-300" : ""}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>{request.full_name}</CardTitle>
                  <CardDescription>Referred by: {request.referrer_name}</CardDescription>
                </div>
                <Badge className="bg-blue-100 text-blue-700 border-blue-200">
                  Awaiting Admin
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-500">Email</p>
                  <p className="font-medium">{request.email}</p>
                </div>
                <div>
                  <p className="text-slate-500">Phone</p>
                  <p className="font-medium">{request.phone}</p>
                </div>
                {request.registration_level_name && (
                  <>
                    <div>
                      <p className="text-slate-500">Registration Level</p>
                      <p className="font-medium">{request.registration_level_name}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Registration Fee</p>
                      <p className="font-medium">{formatCurrency(request.registration_amount)}</p>
                    </div>
                  </>
                )}
              </div>

              {duplicateClient && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>
                    <strong>Duplicate email detected!</strong> A loyalty client named <strong>{duplicateClient.name}</strong> (ID: {duplicateClient.id.substring(0,8)}) already uses <strong>{request.email}</strong>. Approving will be blocked — please reject this request or update the existing client's record.
                  </span>
                </div>
              )}

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

              {canApprove ? (
                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    onClick={() => approveMutation.mutate(request.id)}
                    disabled={approveMutation.isPending}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Approve & Create Account
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
              ) : (
                <div className="flex items-center gap-2 pt-2 text-xs text-slate-500">
                  <AlertTriangle className="w-4 h-4" />
                  View only — an admin or manager is required to approve or reject.
                </div>
              )}
            </CardContent>
          </Card>
          );
          })}
      </div>

      <AlertDialog open={!!rejectingId} onOpenChange={() => setRejectingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Registration?</AlertDialogTitle>
            <AlertDialogDescription>
              This will reject the registration due to payment issues. The applicant can resubmit.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => rejectMutation.mutate(rejectingId)}
              className="bg-red-600 hover:bg-red-700"
            >
              Reject
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}