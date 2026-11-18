import { Mail } from "lucide-react";
import RecipientChip from "./RecipientChip";
import { blockedReason } from "./recipientChoice";

export default function AddedRecipients({ chosen, emails, onRemoveEmployee, onRemoveEmail }) {
  if (!chosen.length && !emails.length) return <p className="text-xs text-slate-400">No one added yet.</p>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {chosen.map((e) => (
        <RecipientChip
          key={e.id}
          label={e.name}
          sub={e.email || e.department}
          warning={e.pending ? "" : blockedReason(e)}
          onRemove={() => onRemoveEmployee(e.id)}
        />
      ))}
      {emails.map((email) => (
        <RecipientChip key={email} label={email} icon={Mail} onRemove={() => onRemoveEmail(email)} />
      ))}
    </div>
  );
}