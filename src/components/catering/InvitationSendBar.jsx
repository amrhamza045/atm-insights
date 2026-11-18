import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Mail, MessageCircle, Smartphone, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { sendInvitationsBulk } from "./invitationSend";

const OPTIONS = [
  { channel: "email", label: "Email all", icon: Mail },
  { channel: "whatsapp", label: "WhatsApp all", icon: MessageCircle },
  { channel: "sms", label: "SMS all", icon: Smartphone },
];

export default function InvitationSendBar({ invitations, event, lang = "en" }) {
  const [busy, setBusy] = useState("");
  const queryClient = useQueryClient();

  const sendAll = async (channel) => {
    const contactField = channel === "email" ? "email" : "phone";
    const targets = invitations.filter((i) => i[contactField]);
    if (targets.length === 0) return toast.error(`No guests have a ${contactField} on record`);

    setBusy(channel);
    const { sent, failed } = await sendInvitationsBulk(targets, event, channel, lang);
    setBusy("");
    await queryClient.invalidateQueries({ queryKey: ["catering-invitations", event.id] });
    if (sent) toast.success(`${sent} invitation(s) sent`);
    if (failed.length) toast.error(`Could not send to: ${failed.join(", ")}`);
  };

  return (
    <div className="flex flex-wrap gap-2">
      {OPTIONS.map(({ channel, label, icon: Icon }) => (
        <Button
          key={channel}
          variant="outline"
          className="gap-1.5"
          disabled={!!busy || invitations.length === 0}
          onClick={() => sendAll(channel)}
        >
          {busy === channel ? <Loader2 className="w-4 h-4 animate-spin" /> : <Icon className="w-4 h-4" />}
          {label}
        </Button>
      ))}
    </div>
  );
}