import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { MessageSquareHeart } from "lucide-react";
import { toast } from "sonner";
import { useBranch } from "@/components/branches/BranchContext";
import { useCateringDiscountAccess } from "./useCateringDiscountAccess";
import StaffFeedbackRow from "./StaffFeedbackRow";
import FilterSelect from "./all/FilterSelect";
import { WHEN_OPTIONS, whenQuery } from "./all/allEventsQuery";
import useEventsInWindow from "./useEventsInWindow";

export default function FeedbackTab({ eventId, scopedEvent = null }) {
  const { selectedBranchId, selectedBranch } = useBranch();
  const { user } = useCateringDiscountAccess();
  const queryClient = useQueryClient();
  const [selectedEventId, setSelectedEventId] = useState(eventId || "");

  const [when, setWhen] = useState("upcoming");
  const { data: loaded = [] } = useEventsInWindow(whenQuery("event_date", when), 300);
  // The event in the address stays pickable whichever dates are shown.
  const events = scopedEvent && !loaded.some((e) => e.id === scopedEvent.id) ? [scopedEvent, ...loaded] : loaded;

  const { data: assignments = [] } = useQuery({
    queryKey: ["catering-assignments", selectedEventId],
    queryFn: () => base44.entities.CateringAssignment.filter({ event_id: selectedEventId }, "-event_date", 300),
    enabled: !!selectedEventId,
  });

  const { data: feedback = [] } = useQuery({
    queryKey: ["catering-staff-feedback", selectedEventId],
    queryFn: () => base44.entities.CateringStaffFeedback.filter({ event_id: selectedEventId }, "-created_date", 300),
    enabled: !!selectedEventId,
  });

  const confirmed = assignments.filter((a) => a.status !== "released");
  const event = events.find((e) => e.id === selectedEventId);

  const handleSave = async ({ assignment, feedback: existing, rating, comment }) => {
    try {
      const payload = {
        branch_id: selectedBranchId,
        branch_name: selectedBranch?.name || "",
        event_id: assignment.event_id,
        event_name: event?.event_name || assignment.event_name || "",
        event_date: event?.event_date || assignment.event_date || undefined,
        assignment_id: assignment.id,
        employee_id: assignment.employee_id,
        employee_name: assignment.employee_name,
        role_name: assignment.role_name,
        rating,
        comment,
        reviewed_by: user?.email || "",
        reviewed_date: new Date().toISOString(),
      };
      if (existing) {
        await base44.entities.CateringStaffFeedback.update(existing.id, payload);
      } else {
        await base44.entities.CateringStaffFeedback.create(payload);
      }
      toast.success("Feedback saved");
      queryClient.invalidateQueries({ queryKey: ["catering-staff-feedback"] });
    } catch (e) {
      toast.error(e.message || "Could not save the feedback");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageSquareHeart className="w-4 h-4 text-amber-600" />
          Staff feedback
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-2">
          <div className="w-full max-w-sm">
            <Label>Event</Label>
            <Select value={selectedEventId} onValueChange={setSelectedEventId}>
              <SelectTrigger><SelectValue placeholder="Select an event" /></SelectTrigger>
              <SelectContent>
                {events.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.event_name} — {e.event_date}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <FilterSelect value={when} onChange={setWhen} options={WHEN_OPTIONS} />
        </div>

        {!selectedEventId ? (
          <p className="text-sm text-slate-500">Pick an event to rate the people who worked it.</p>
        ) : confirmed.length === 0 ? (
          <p className="text-sm text-slate-500">No staff assigned to this event yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Staff</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Feedback</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {confirmed.map((a) => (
                <StaffFeedbackRow
                  key={a.id}
                  assignment={a}
                  feedback={feedback.find((f) => f.assignment_id === a.id) || feedback.find((f) => f.employee_id === a.employee_id)}
                  onSave={handleSave}
                />
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}