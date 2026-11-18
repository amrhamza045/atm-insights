import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import useFilteredList from "./useFilteredList";
import AllEventsFrame from "./AllEventsFrame";
import EventListFilters from "./EventListFilters";
import AllInvitationRow from "./AllInvitationRow";
import useEventWhenScope from "./useEventWhenScope";

const FILTERS = [["all", "All guests"], ["sent", "Invitation sent"], ["not_sent", "Not sent yet"], ["no_reply", "No reply yet"]];
const CHANNELS = ["email", "whatsapp", "sms"];
// Every send stamps last_sent_channel along with its time, so it tells sent from not sent.
const QUERY = {
  sent: { last_sent_channel: { $in: CHANNELS } },
  not_sent: { last_sent_channel: { $nin: CHANNELS } },
  no_reply: { rsvp_status: { $nin: ["attending", "declined", "maybe"] } },
};
const COLUMNS = ["Guest", "Event", "Contact", "Status", "Entry pass", "Sent", ""];

/** Invitations › Guests with no event picked: the branch's invited guests, upcoming events first. */
export default function AllInvitationsList() {
  const [filters, setFilters] = useState({ search: "", when: "upcoming", status: "all" });
  // Guests keep no event date of their own: upcoming / past goes by their event.
  const eventScope = useEventWhenScope(filters.when);
  const list = useFilteredList({
    entity: "CateringInvitation",
    cacheKey: "catering-invitations",
    searchFields: ["guest_name", "event_name"],
    search: filters.search,
    query: { ...(QUERY[filters.status] || {}), ...eventScope.query },
    enabled: eventScope.ready,
  });
  const unfiltered = filters.status === "all" && filters.when === "all" && !filters.search.trim();

  return (
    <AllEventsFrame
      title="All invited guests"
      list={list}
      empty={unfiltered ? "No guests have been invited yet." : "No guests match these filters."}
      filters={<EventListFilters value={filters} onChange={setFilters} options={FILTERS} placeholder="Search by guest or event…" />}
    >
      <Card className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {COLUMNS.map((label, i) => <TableHead key={i}>{label}</TableHead>)}
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.rows.map((inv) => <AllInvitationRow key={inv.id} invitation={inv} />)}
          </TableBody>
        </Table>
      </Card>
    </AllEventsFrame>
  );
}