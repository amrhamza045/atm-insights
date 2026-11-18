import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import useOpenTab from "@/hooks/useOpenTab";
import ClosedTabsNotice from "@/components/modules/ClosedTabsNotice";
import { Copy, ExternalLink, QrCode, UserPlus, FileSpreadsheet, Trash2 } from "lucide-react";
import MailConfigTab from "./MailConfigTab";
import { toast } from "sonner";
import { passLink } from "./invitationTokens";
import EventScopeNotice from "./EventScopeNotice";
import InvitationSendBar from "./InvitationSendBar";
import { wasSent } from "./invitationSend";
import InvitationFormDialog from "./InvitationFormDialog";
import GuestImportDialog from "./GuestImportDialog";
import GuestRowSendButtons from "./GuestRowSendButtons";
import AllInvitationsList from "./all/AllInvitationsList";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "sent", label: "Invitation sent" },
  { key: "not_sent", label: "Not sent yet" },
  { key: "no_reply", label: "No reply yet" },
];

// browseAll: no event in the address, so Guests lists every invited guest in the branch.
export default function Invi222Tab({ event, browseAll = false }) {
  const [filter, setFilter] = useState("all");
  const [sendLang, setSendLang] = useState("en");
  const guestTab = useOpenTab("CateringInvitations", ["guests", "mail"]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const queryClient = useQueryClient();
  const { data: invitations = [], isLoading } = useQuery({
    queryKey: ["catering-invitations", event?.id],
    queryFn: () => base44.entities.CateringInvitation.filter({ event_id: event.id }, "-created_date", 500),
    enabled: !!event?.id,
  });

  if (!event && !browseAll) return <EventScopeNotice />;

  const visible = invitations.filter((inv) => {
    if (filter === "sent") return wasSent(inv);
    if (filter === "not_sent") return !wasSent(inv);
    if (filter === "no_reply") return !inv.rsvp_status || inv.rsvp_status === "invited";
    return true;
  });

  const copy = (token) => {
    navigator.clipboard.writeText(passLink(token));
    toast.success("Attendance link copied");
  };

  const removeGuest = async (inv) => {
    if (!window.confirm(`Remove ${inv.guest_name} from this event?`)) return;
    await base44.entities.CateringInvitation.delete(inv.id);
    toast.success("Guest removed");
    queryClient.invalidateQueries({ queryKey: ["catering-invitations", event.id] });
  };

  if (!guestTab.value) return <ClosedTabsNotice />;

  return (
    <Tabs value={guestTab.value} onValueChange={guestTab.setValue} className="space-y-4">
      <TabsList>
        {guestTab.isOpen("guests") && <TabsTrigger value="guests">Guests</TabsTrigger>}
        {guestTab.isOpen("mail") && <TabsTrigger value="mail">Mail configuration</TabsTrigger>}
      </TabsList>

      <TabsContent value="guests" className="space-y-4">
      {event ? (<>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-slate-900">Attendance confirmation passes</h2>
          <p className="text-sm text-slate-500">
            Send each guest their premium confirmation page — they enter their details and receive a QR entry pass.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="gap-1.5" onClick={() => setImportOpen(true)}>
            <FileSpreadsheet className="w-4 h-4" /> Import from sheet
          </Button>
          <Button className="gap-1.5" onClick={() => setDialogOpen(true)}>
            <UserPlus className="w-4 h-4" /> Invite guest
          </Button>
        </div>
      </div>

      <Card className="p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  filter === f.key ? "bg-warning-100 text-warning-700 font-medium" : "text-slate-500 hover:bg-slate-100"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-md border border-slate-200 overflow-hidden">
              {[{ key: "en", label: "English" }, { key: "ar", label: "العربية" }].map((l) => (
                <button
                  key={l.key}
                  onClick={() => setSendLang(l.key)}
                  className={`px-3 py-1.5 text-sm transition-colors ${
                    sendLang === l.key ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-100"
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>
            <InvitationSendBar invitations={visible} event={event} lang={sendLang} />
          </div>
        </div>

        {isLoading ? (
          <p className="text-sm text-slate-500 py-6 text-center">Loading guests…</p>
        ) : visible.length === 0 ? (
          <p className="text-sm text-slate-500 py-6 text-center">No guests match this filter.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Guest</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Entry pass</TableHead>
                <TableHead className="text-right">Send &amp; link</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell className="font-medium text-slate-900">{inv.guest_name}</TableCell>
                  <TableCell className="text-sm text-slate-500">{inv.email || inv.phone || "—"}</TableCell>
                  <TableCell>
                    {inv.pass_code ? (
                      <Badge className="bg-emerald-100 text-emerald-700">confirmed</Badge>
                    ) : (
                      <Badge className="bg-slate-100 text-slate-600">awaiting</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-xs font-mono text-slate-500">
                    {inv.pass_code ? (
                      <span className="inline-flex items-center gap-1"><QrCode className="w-3.5 h-3.5" />{inv.pass_code}</span>
                    ) : "—"}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <GuestRowSendButtons invitation={inv} event={event} lang={sendLang} />
                    <Button size="icon" variant="ghost" onClick={() => copy(inv.token)} title="Copy attendance link">
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" asChild title="Open attendance page">
                      <a href={passLink(inv.token)} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </Button>
                    <Button size="icon" variant="ghost" className="text-red-600 hover:text-red-700" onClick={() => removeGuest(inv)} title="Delete guest">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <InvitationFormDialog open={dialogOpen} onOpenChange={setDialogOpen} event={event} invitation={null} />
      <GuestImportDialog open={importOpen} onOpenChange={setImportOpen} event={event} />
      </>) : <AllInvitationsList />}
      </TabsContent>

      <TabsContent value="mail">
        <MailConfigTab />
      </TabsContent>
    </Tabs>
  );
}