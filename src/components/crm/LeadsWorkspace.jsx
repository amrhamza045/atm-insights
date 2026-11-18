import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import LeadPipelineBoard from "./LeadPipelineBoard";
import ContactRequestsTab from "./ContactRequestsTab";
import SocialLeadsPanel from "@/components/marketing/SocialLeadsPanel";

// One Leads tab: the same lead records, seen three ways.
const VIEWS = [
  { key: "pipeline", label: "Pipeline", hint: "Every lead grouped by stage. Converting is always a deliberate action: nothing converts automatically." },
  { key: "contact", label: "Contact requests", hint: "Requests sent from the website's Contact Us form. They also appear in the pipeline." },
  { key: "social", label: "Social leads", hint: "Leads from Facebook, Instagram, LinkedIn, TikTok and WhatsApp. Convert them from the pipeline." },
];

export default function LeadsWorkspace({ canManage, currentUser }) {
  const [view, setView] = useState("pipeline");
  const current = VIEWS.find((v) => v.key === view);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {VIEWS.map((v) => (
          <Button key={v.key} size="sm" variant={view === v.key ? "default" : "outline"} onClick={() => setView(v.key)}>
            {v.label}
          </Button>
        ))}
      </div>
      <p className="text-sm text-slate-500">{current.hint}</p>
      {view === "pipeline" && <LeadPipelineBoard canManage={canManage} currentUser={currentUser} />}
      {view === "contact" && <ContactRequestsTab />}
      {view === "social" && <SocialLeadsPanel />}
    </div>
  );
}