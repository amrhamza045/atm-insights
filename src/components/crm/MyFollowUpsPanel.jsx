import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { BUCKETS, bucketOf } from "./followUps";
import FollowUpRow from "./FollowUpRow";

export default function MyFollowUpsPanel({ currentUser }) {
  const queryClient = useQueryClient();
  const [completingId, setCompletingId] = useState(null);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["crm-my-followups", currentUser?.email],
    queryFn: async () => {
      // Ownership-based scoping: only interactions this staff member logged.
      const rows = await base44.entities.ClientInteraction.filter(
        { created_by_email: currentUser.email },
        "-occurred_at",
        500
      );
      return rows.filter((r) => r.follow_up_date && !r.follow_up_completed);
    },
    enabled: !!currentUser?.email,
  });

  const handleComplete = async (item) => {
    setCompletingId(item.id);
    try {
      await base44.entities.ClientInteraction.update(item.id, {
        follow_up_completed: true,
        follow_up_completed_at: new Date().toISOString(),
      });
      await queryClient.invalidateQueries({ queryKey: ["crm-my-followups", currentUser.email] });
      await queryClient.invalidateQueries({ queryKey: ["crm-interactions", item.client_id] });
      toast.success("Follow-up marked done");
    } catch (e) {
      toast.error("Could not update follow-up");
    } finally {
      setCompletingId(null);
    }
  };

  if (isLoading) return <p className="text-sm text-slate-500">Loading follow-ups…</p>;
  if (items.length === 0) return <p className="text-sm text-slate-500">No open follow-ups assigned to you.</p>;

  return (
    <div className="space-y-5">
      {BUCKETS.map((bucket) => {
        const rows = items
          .filter((i) => bucketOf(i.follow_up_date) === bucket.key)
          .sort((a, b) => new Date(a.follow_up_date) - new Date(b.follow_up_date));
        if (rows.length === 0) return null;
        return (
          <div key={bucket.key} className="space-y-2">
            <div className="flex items-center gap-2">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded ${bucket.badge}`}>{bucket.label}</span>
              <span className="text-xs text-slate-500">{rows.length}</span>
            </div>
            {rows.map((item) => (
              <FollowUpRow
                key={item.id}
                item={item}
                bucket={bucket.key}
                onComplete={handleComplete}
                completing={completingId === item.id}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}