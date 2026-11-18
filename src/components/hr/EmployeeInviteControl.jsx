import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Send, Check } from "lucide-react";
import { toast } from "sonner";
import { inviteOrSyncUser } from "@/components/hr/assignEmployeeRole";

/**
 * Invite status + explicit send/resend. Saving an employee never invites —
 * only this button does.
 *
 * Status is derived: "Registered" comes from the platform's own User records,
 * so the only thing stored is invite_sent_at (the one fact the platform
 * doesn't track).
 */
export default function EmployeeInviteControl({ employee, isRegistered, role }) {
  const queryClient = useQueryClient();

  const sendMutation = useMutation({
    mutationFn: async () => {
      const { invited } = await inviteOrSyncUser(employee.email, role);
      await base44.entities.Employee.update(employee.id, { invite_sent_at: new Date().toISOString() });
      return invited;
    },
    onSuccess: (invited) => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["appUsers"] });
      toast[invited ? "success" : "info"](
        invited
          ? `Invitation emailed to ${employee.email}`
          : `${employee.email} already has an account — access updated`
      );
    },
    onError: () => toast.error("Could not send the invitation")
  });

  if (!employee.email) {
    return <span className="text-xs text-slate-400">No email</span>;
  }

  if (isRegistered) {
    return (
      <Badge className="text-xs gap-1 bg-success-100 text-success-800 hover:bg-success-100">
        <Check className="w-3 h-3" />
        Registered
      </Badge>
    );
  }

  const invited = !!employee.invite_sent_at;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Badge variant={invited ? "secondary" : "outline"} className="text-xs whitespace-nowrap shrink-0">
        {invited ? "Invited — pending" : "Not invited"}
      </Badge>
      <Button
        size="sm"
        variant="outline"
        className="gap-1 h-7 px-2 shrink-0 min-w-fit"
        onClick={() => sendMutation.mutate()}
        disabled={sendMutation.isPending}
      >
        <Send className="w-3 h-3" />
        <span className="text-xs">{invited ? "Resend" : "Send Invite"}</span>
      </Button>
    </div>
  );
}