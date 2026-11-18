import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Mail, MessageCircle, Smartphone, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { sendInvitation } from "./invitationSend";

/** Per-guest send buttons — invite one guest at a time on a single channel. */
export default function GuestRowSendButtons({ invitation, event, lang = "en" }) {
  const [sending, setSending] = useState(null);
  const queryClient = useQueryClient();

  const send = async (channel) => {
    setSending(channel);
    try {
      await sendInvitation(invitation, event, channel, lang);
      toast.success(`Invitation sent to ${invitation.guest_name}`);
      queryClient.invalidateQueries({ queryKey: ["catering-invitations", event?.id] });
    } catch (err) {
      toast.error(err.message || "Invitation could not be sent");
    } finally {
      setSending(null);
    }
  };

  const Icon = ({ channel, icon: I, label, enabled }) => (
    <Button size="icon" variant="ghost" disabled={!enabled || !!sending} onClick={() => send(channel)} title={label}>
      {sending === channel ? <Loader2 className="w-4 h-4 animate-spin" /> : <I className="w-4 h-4" />}
    </Button>
  );

  return (
    <>
      <Icon channel="email" icon={Mail} label="Email this guest" enabled={!!invitation.email} />
      <Icon channel="whatsapp" icon={MessageCircle} label="WhatsApp this guest" enabled={!!invitation.phone} />
      <Icon channel="sms" icon={Smartphone} label="SMS this guest" enabled={!!invitation.phone} />
    </>
  );
}