import React, { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Lock, PartyPopper } from "lucide-react";
import PortalEventCard from "@/components/portal/PortalEventCard";
import PortalEventDetail from "@/components/portal/PortalEventDetail";

/**
 * Read-only catering portal for customers. Access requires a user account linked
 * to a client (portal_client_id). Record visibility is enforced entirely by the
 * Phase 11a row-level security on the catering entities — this page adds no
 * client-side filtering of its own.
 */
export default function CateringPortal() {
  const [selected, setSelected] = useState(null);

  const { data: user, isLoading: loadingUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
  });

  const linked = !!user?.portal_client_id;
  const queryClient = useQueryClient();
  const claimed = useRef(false);

  // First visit after signing up: link this account to the client it was invited for.
  useEffect(() => {
    if (!user || linked || claimed.current) return;
    claimed.current = true;
    base44.functions
      .invoke("claimPortalAccess", {})
      .then((res) => {
        if (res.data?.linked) queryClient.invalidateQueries({ queryKey: ["currentUser"] });
      })
      .catch(() => {});
  }, [user, linked, queryClient]);

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["portal-events", user?.portal_client_id],
    queryFn: () => base44.entities.CateringEvent.list("-event_date", 100),
    enabled: linked,
  });

  if (loadingUser) return <div className="p-6 text-slate-500">Loading…</div>;

  if (!linked) {
    return (
      <div className="max-w-xl mx-auto p-6">
        <Card className="p-8 text-center space-y-2">
          <Lock className="w-8 h-8 mx-auto text-slate-400" />
          <p className="font-semibold text-slate-900">This portal is for catering customers</p>
          <p className="text-sm text-slate-500">
            Your account isn't linked to a catering client yet. Please use the invitation we sent you, or contact us and we'll set it up.
          </p>
        </Card>
      </div>
    );
  }

  const active = selected ? events.find((e) => e.id === selected.id) || selected : events[0] || null;

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2"><PartyPopper className="w-5 h-5" /> Your catering events</h1>
        <p className="text-sm text-slate-500">View your bookings, quotes and payment history. Anything you'd like changed — just contact us.</p>
      </div>

      {isLoading ? (
        <Card className="p-8 text-center text-slate-500">Loading your events…</Card>
      ) : events.length === 0 ? (
        <Card className="p-8 text-center text-slate-500">You don't have any catering events yet.</Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="space-y-3">
            {events.map((e) => (
              <PortalEventCard key={e.id} event={e} active={active?.id === e.id} onSelect={setSelected} />
            ))}
          </div>
          <div className="lg:col-span-2">{active && <PortalEventDetail event={active} />}</div>
        </div>
      )}
    </div>
  );
}