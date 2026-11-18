import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { UserPlus, RefreshCw, ShieldOff, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import ClientSearchSelect from "./ClientSearchSelect";

const STATUS_STYLES = {
  invited: "bg-amber-100 text-amber-700",
  linked: "bg-emerald-100 text-emerald-700",
  revoked: "bg-slate-100 text-slate-500",
};

export default function PortalAccessTab({ event }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [client, setClient] = useState(null);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: allRows = [] } = useQuery({
    queryKey: ["catering-portal-access"],
    queryFn: () => base44.entities.CateringPortalAccess.list("-created_date", 200),
  });

  // Scoped to an event: only the access rows for that event's own client.
  const rows = event?.client_id ? allRows.filter((r) => r.client_id === event.client_id) : allRows;

  // Events store only the client's phone — the email lives on the client record.
  const { data: eventClient } = useQuery({
    queryKey: ["client", event?.client_id],
    queryFn: () => base44.entities.Client.get(event.client_id),
    enabled: !!event?.client_id,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["catering-portal-access"] });

  const call = async (payload, successMessage) => {
    setBusy(true);
    try {
      const res = await base44.functions.invoke("invitePortalCustomer", payload);
      if (res.data?.error) throw new Error(res.data.error);
      await refresh();
      toast.success(successMessage(res.data));
      return true;
    } catch (e) {
      const serverMessage = e.response?.data?.error;
      toast.error(serverMessage || e.message || "Could not update portal access");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const invite = async () => {
    if (!client?.id || !email.trim()) return toast.error("Pick a client and enter an email");
    const ok = await call(
      { action: "invite", client_id: client.id, email, portal_url: `${window.location.origin}/CateringPortal` },
      (d) => `${d.invited ? "Invitation sent to" : "Linked"} ${email}${d.emailSent ? " — portal link emailed" : " (portal link email could not be delivered)"}`
    );
    if (ok) { setOpen(false); setClient(null); setEmail(""); }
  };

  return (
    <div className="space-y-4">
      <Card className="p-4 border-amber-200 bg-amber-50">
        <p className="text-sm text-amber-900">
          Portal access links an external customer's account to one client record. Linked customers sign in and open{" "}
          <span className="font-semibold">My Events</span> in the header (<span className="font-mono">/CateringPortal</span>) to see
          their own events, quotes, packages and payments — and nothing else.
        </p>
        {event?.client_id && (
          <p className="text-sm text-amber-900 mt-2">
            Showing portal access for <span className="font-semibold">{event.client_name || "this event's client"}</span> only —
            clear the event scope above to see every customer.
          </p>
        )}
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-slate-500">{rows.filter((r) => r.status === "linked").length} linked · {rows.filter((r) => r.status === "invited").length} awaiting sign-up</p>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="gap-1.5" disabled={busy}
            onClick={() => call({ action: "sync" }, (d) => `${d.linkedCount} newly created account(s) linked`)}>
            <RefreshCw className="w-4 h-4" /> Sync new sign-ups
          </Button>
          <Button size="sm" className="gap-1.5" onClick={() => {
            if (event?.client_id) {
              setClient({ id: event.client_id, name: event.client_name, email: eventClient?.email });
              setEmail(eventClient?.email || "");
            }
            setOpen(true);
          }}><UserPlus className="w-4 h-4" /> Invite customer</Button>
        </div>
      </div>

      {rows.length === 0 ? (
        <Card className="p-8 text-center text-slate-500">No customers have been given portal access yet.</Card>
      ) : (
        <Card className="divide-y">
          {rows.map((r) => (
            <div key={r.id} className="p-3 flex flex-wrap items-center justify-between gap-2 text-sm">
              <div className="min-w-0">
                <p className="font-medium text-slate-900 truncate">{r.client_name}</p>
                <p className="text-xs text-slate-500 truncate">
                  {r.email} · invited by {r.invited_by || "staff"}
                  {r.linked_date ? ` · linked ${new Date(r.linked_date).toLocaleDateString()}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={STATUS_STYLES[r.status] || STATUS_STYLES.invited}>
                  {r.status === "linked" ? <ShieldCheck className="w-3 h-3 mr-1" /> : null}
                  {r.status}
                </Badge>
                {r.status !== "revoked" && (
                  <Button size="sm" variant="ghost" className="text-red-600 gap-1.5" disabled={busy}
                    onClick={() => call({ action: "revoke", access_id: r.id }, () => `Access revoked for ${r.email}`)}>
                    <ShieldOff className="w-4 h-4" /> Revoke
                  </Button>
                )}
              </div>
            </div>
          ))}
        </Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Invite a customer to the portal</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Client</Label>
              {event?.client_id ? (
                <p className="mt-1 text-sm font-medium text-slate-900">{event.client_name || "Event client"}</p>
              ) : (
                <ClientSearchSelect
                  value={client?.id}
                  onSelect={(c) => { setClient(c); if (c?.email) setEmail(c.email); }}
                />
              )}
            </div>
            <div>
              <Label>Customer email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="customer@example.com" />
            </div>
            <p className="text-xs text-slate-500">
              The customer gets an invitation to create their own account. Once it exists, it is stamped with this client so
              they can only ever reach this client's events. Staff accounts are refused.
            </p>
            <p className="text-xs text-amber-700">
              A client that owns no events cannot be invited — an empty portal is always a duplicate-record mistake. Invite
              from the event's own client instead.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={invite} disabled={busy}>Send invitation</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}