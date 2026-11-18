import UsualRecipients from "./UsualRecipients";
import AddedRecipients from "./AddedRecipients";
import EmployeePicker from "./EmployeePicker";
import EmailAddressAdder from "./EmailAddressAdder";
import SendTestButtons from "./SendTestButtons";

// Recipient choices for one email: its usual recipients, chosen employees and other addresses.
export default function RecipientsEditor({ item, choice, d, ctx, onChange, unsaved, headChefId }) {
  const set = (patch) => onChange({ ...choice, ...patch });
  const toggleEmployee = (id) => set({
    employee_ids: choice.employee_ids.includes(id) ? choice.employee_ids.filter((x) => x !== id) : [...choice.employee_ids, id],
  });

  return (
    <div className="space-y-4 border-t bg-slate-50/70 p-4">
      <UsualRecipients item={item} d={d} ctx={ctx} headChefId={headChefId} onToggle={(on) => set({ include_default: on })} />
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {d.isClient ? "Also send a copy to" : "Also send to"}
        </p>
        <AddedRecipients
          chosen={d.chosen}
          emails={choice.extra_emails}
          onRemoveEmployee={toggleEmployee}
          onRemoveEmail={(email) => set({ extra_emails: choice.extra_emails.filter((x) => x !== email) })}
        />
        <div className="flex flex-wrap items-start gap-2">
          <EmployeePicker employees={ctx.employees} selected={choice.employee_ids} onToggle={toggleEmployee} loading={ctx.isLoading} />
          <EmailAddressAdder existing={choice.extra_emails} onAdd={(emails) => set({ extra_emails: [...choice.extra_emails, ...emails] })} />
        </div>
      </div>
      <SendTestButtons itemKey={item.key} addedCount={d.added} unsaved={unsaved} sendTest={ctx.sendTest} />
    </div>
  );
}