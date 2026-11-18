import React from "react";
import { useClient360 } from "./useClient360";
import ProfileCard from "./ProfileCard";
import CreditStandingCard from "./CreditStandingCard";
import CateringHistoryCard from "./CateringHistoryCard";
import LeadOriginCard from "./LeadOriginCard";
import DataGapsNotice from "./DataGapsNotice";
import ActivityTimelineCard from "./ActivityTimelineCard";
import OwnerCard from "./OwnerCard";
import EditClientButton from "./clients/EditClientButton";
import DeleteClientButton from "./clients/DeleteClientButton";

export default function Client360View({ client, access, currentUser, onChanged, onDeleted }) {
  const { events, lead } = useClient360(client, { includeCatering: access.catering });

  const actions = access.manageClients ? (
    <>
      <EditClientButton client={client} onSaved={onChanged} />
      <DeleteClientButton client={client} onDeleted={onDeleted} />
    </>
  ) : null;

  return (
    <div className="space-y-4">
      <DataGapsNotice client={client} />

      <div className="grid gap-4 lg:grid-cols-2">
        <ProfileCard client={client} actions={actions} />
        <OwnerCard client={client} canEdit={access.logInteractions} />

        {access.catering && (
          <CateringHistoryCard events={events.data || []} isLoading={events.isLoading} />
        )}

        {access.financials && (
          <CreditStandingCard client={client} events={access.catering ? events.data || [] : []} />
        )}

        <LeadOriginCard lead={lead.data} />

        <div className="lg:col-span-2">
          <ActivityTimelineCard client={client} canLog={access.logInteractions} currentUser={currentUser} />
        </div>
      </div>
    </div>
  );
}