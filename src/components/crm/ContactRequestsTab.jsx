import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail, Loader2, Contact } from "lucide-react";
import { Button } from "@/components/ui/button";
import LeadContactDialog from "./LeadContactDialog";
import ContactRequestDetailsDialog from "./ContactRequestDetailsDialog";
import { format } from "date-fns";

const STATUSES = ["new", "contacted", "converted", "closed"];
const STATUS_STYLES = {
  new: "bg-blue-100 text-blue-700",
  contacted: "bg-amber-100 text-amber-700",
  converted: "bg-green-100 text-green-700",
  closed: "bg-slate-100 text-slate-600",
};

export default function ContactRequestsTab() {
  const queryClient = useQueryClient();
  const [contactLead, setContactLead] = React.useState(null);
  const [detailLead, setDetailLead] = React.useState(null);
  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["contact-requests"],
    queryFn: () => base44.entities.Lead.filter({ campaign: "Contact us" }, "-created_date", 200),
  });

  React.useEffect(() => base44.entities.Lead.subscribe((event) => {
    if (event.data?.campaign === "Contact us" || event.type === "delete") {
      queryClient.invalidateQueries({ queryKey: ["contact-requests"] });
    }
  }), [queryClient]);

  const setStatus = async (lead, status) => {
    await base44.entities.Lead.update(lead.id, { status });
    queryClient.invalidateQueries({ queryKey: ["contact-requests"] });
  };

  const counts = STATUSES.reduce((a, s) => ({ ...a, [s]: leads.filter((l) => (l.status || "new") === s).length }), {});

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Mail className="w-4 h-4 text-amber-600" />
          Contact requests ({leads.length})
        </CardTitle>
        <div className="flex flex-wrap gap-1.5">
          {STATUSES.map((s) => <Badge key={s} className={STATUS_STYLES[s]}>{s}: {counts[s]}</Badge>)}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="py-10 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
        ) : leads.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-500">No contact requests yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Received</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Interest</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead className="w-[150px]">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.map((l) => (
                  <TableRow key={l.id} className="cursor-pointer hover:bg-slate-50" onClick={() => setDetailLead(l)}>
                    <TableCell className="text-xs text-slate-500 whitespace-nowrap">
                      {l.created_date ? format(new Date(l.created_date), "dd MMM yyyy") : "—"}
                    </TableCell>
                    <TableCell className="font-medium text-slate-900">
                      <div className="flex items-center gap-2">
                        {l.sender_name || "—"}
                        <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={(e) => { e.stopPropagation(); setContactLead(l); }}>
                          <Contact className="w-3.5 h-3.5" />Contact
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">
                      {l.phone && <a onClick={(e) => e.stopPropagation()} href={`tel:${l.phone}`} className="block text-amber-700">{l.phone}</a>}
                      {l.email && <a onClick={(e) => e.stopPropagation()} href={`mailto:${l.email}`} className="block text-amber-700 break-all">{l.email}</a>}
                    </TableCell>
                    <TableCell className="text-xs text-slate-600">
                      <div className="font-medium">{l.governorate || "—"}</div>
                      {l.address && <div className="text-slate-500">{l.address}</div>}
                    </TableCell>
                    <TableCell className="text-xs text-slate-600">{l.brand_purpose || "—"}</TableCell>
                    <TableCell className="text-xs text-slate-500 whitespace-pre-line break-all max-w-[300px]"><div className="line-clamp-4">{l.message_text}</div></TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Select value={l.status || "new"} onValueChange={(v) => setStatus(l, v)}>
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
      <ContactRequestDetailsDialog lead={detailLead} onOpenChange={(o) => !o && setDetailLead(null)} />
      <LeadContactDialog lead={contactLead} onOpenChange={(o) => !o && setContactLead(null)} />
    </Card>
  );
}