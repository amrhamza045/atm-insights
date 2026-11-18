import React, { useState } from "react";
import ClientSearchSelect from "@/components/catering/ClientSearchSelect";
import Client360View from "./Client360View";
import ClientListPanel from "./ClientListPanel";
import DuplicatesSection from "./DuplicatesSection";

// CRM › Clients: find or add a client, open their profile, and tidy up duplicates.
export default function ClientsWorkspace({ access, currentUser }) {
  const [client, setClient] = useState(null);
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">Search a client, add a new one, or browse the list to open a profile.</p>
      <div className="max-w-xl">
        <ClientSearchSelect value={client?.id} onSelect={setClient} />
      </div>
      {client ? (
        <Client360View
          client={client}
          access={access}
          currentUser={currentUser}
          onChanged={setClient}
          onDeleted={() => setClient(null)}
        />
      ) : (
        <>
          <ClientListPanel onOpenClient={setClient} />
          <DuplicatesSection canMerge={access.mergeClients} />
        </>
      )}
    </div>
  );
}