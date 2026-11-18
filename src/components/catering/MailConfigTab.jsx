import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import InvitationMailCard from "./InvitationMailCard";
import DocumentMailCard from "./DocumentMailCard";

// The guest invitation / attendance pass page shows the Admin › Branding logo,
// so this tab only holds the email templates.
export default function MailConfigTab() {
  const { isLoading } = useQuery({
    queryKey: ["catering-pass-branding"],
    queryFn: async () => (await base44.entities.CateringPassBranding.list())[0] || null,
  });

  if (isLoading) return <p className="text-sm text-slate-500 py-6 text-center">Loading configuration…</p>;

  return (
    <div className="space-y-4">
      <InvitationMailCard />
      <DocumentMailCard />
    </div>
  );
}