import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Loader2 } from "lucide-react";
import ReferrerContactDialog from "./ReferrerContactDialog";
import ReferralRow, { STATUSES, STATUS_STYLES } from "@/components/crm/referrals/ReferralRow";
import CommissionCell from "@/components/crm/referrals/CommissionCell";
import ReferralCommissionDialog from "@/components/crm/referrals/ReferralCommissionDialog";
import ReferrerCommissionTotals from "@/components/crm/referrals/ReferrerCommissionTotals";
import useCommissionAccess, { useCommissionEditAccess } from "@/components/crm/referrals/useCommissionAccess";

export default function ReferralsTab() {
  const queryClient = useQueryClient();
  const canCommission = useCommissionAccess();
  const canEditCommission = useCommissionEditAccess();
  const [contactReferral, setContactReferral] = React.useState(null);
  const [editing, setEditing] = React.useState(null); // { referral, commission }

  const { data: referrals = [], isLoading } = useQuery({
    queryKey: ["catering-referrals"],
    queryFn: () => base44.entities.Lead.filter({ campaign: "Event pass referral" }, "-created_date", 200),
  });

  const { data: events = [] } = useQuery({
    queryKey: ["catering-referral-events"],
    queryFn: () => base44.entities.CateringEvent.list("-event_date", 500),
  });
  const eventNameById = React.useMemo(
    () => Object.fromEntries(events.map((e) => [e.id, e.event_name])),
    [events]
  );
  const liveEventName = (r) => eventNameById[r.referrer_event_id] || r.referrer_event_name || "";

  const ids = referrals.map((r) => r.id);
  const { data: commissions = [] } = useQuery({
    queryKey: ["referral-commissions", ids],
    queryFn: () => base44.entities.ReferralCommission.filter({ lead_id: { $in: ids } }, "-created_date", 500),
    enabled: canCommission && ids.length > 0,
  });
  const commissionsOf = (id) => commissions.filter((c) => c.lead_id === id);

  const setStatus = async (lead, status) => {
    await base44.entities.Lead.update(lead.id, { status });
    queryClient.invalidateQueries({ queryKey: ["catering-referrals"] });
    // A conversion is what earns the referrer a commission: record it right away.
    if (status === "converted" && canEditCommission && commissionsOf(lead.id).length === 0) {
      setEditing({ referral: { ...lead, status }, commission: null });
    }
  };

  const counts = STATUSES.reduce((acc, s) => ({ ...acc, [s]: referrals.filter((r) => (r.status || "new") === s).length }), {});

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <UserPlus className="w-4 h-4 text-amber-600" />
            Guest referrals ({referrals.length})
          </CardTitle>
          <div className="flex flex-wrap gap-1.5">
            {STATUSES.map((s) => (
              <Badge key={s} className={STATUS_STYLES[s]}>{s}: {counts[s]}</Badge>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-10 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
          ) : referrals.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-500">
              No referrals yet. Referrals submitted by guests from their event pass will appear here.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Received</TableHead>
                    <TableHead>Referred person</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Interest</TableHead>
                    <TableHead>Referred by</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead className="w-[150px]">Status</TableHead>
                    {canCommission && <TableHead className="min-w-[180px]">Commission</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {referrals.map((r) => (
                    <ReferralRow
                      key={r.id}
                      referral={r}
                      eventName={liveEventName(r)}
                      onStatus={(s) => setStatus(r, s)}
                      onContact={(mode) => setContactReferral({ ...r, _mode: mode })}
                    >
                      {canCommission && (
                        <CommissionCell
                          referral={r}
                          commissions={commissionsOf(r.id)}
                          onOpen={canEditCommission ? (commission) => setEditing({ referral: r, commission }) : undefined}
                        />
                      )}
                    </ReferralRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {canCommission && <ReferrerCommissionTotals referrals={referrals} />}

      <ReferrerContactDialog
        referral={contactReferral ? { ...contactReferral, referrer_event_name: liveEventName(contactReferral) } : null}
        mode={contactReferral?._mode || "referrer"}
        open={!!contactReferral}
        onOpenChange={(o) => !o && setContactReferral(null)}
      />

      {canEditCommission && (
        <ReferralCommissionDialog
          open={!!editing}
          referral={editing?.referral}
          commission={editing?.commission}
          takenEventIds={editing ? commissionsOf(editing.referral.id).map((c) => c.event_id) : []}
          onOpenChange={(o) => !o && setEditing(null)}
        />
      )}
    </div>
  );
}