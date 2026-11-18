import { Phone, Mail, Users, StickyNote, MessageCircle, AlertTriangle, Circle } from "lucide-react";

export const INTERACTION_TYPES = [
  { value: "call", label: "Call", icon: Phone },
  { value: "email", label: "Email", icon: Mail },
  { value: "meeting", label: "Meeting", icon: Users },
  { value: "note", label: "Note", icon: StickyNote },
  { value: "whatsapp", label: "WhatsApp", icon: MessageCircle },
  { value: "complaint", label: "Complaint", icon: AlertTriangle },
  { value: "other", label: "Other", icon: Circle },
];

export const getInteractionMeta = (type) =>
  INTERACTION_TYPES.find((t) => t.value === type) || INTERACTION_TYPES[6];