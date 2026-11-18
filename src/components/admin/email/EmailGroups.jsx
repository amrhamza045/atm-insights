import { useCateringSettings } from "@/components/catering/useCateringSettings";
import { EMAIL_GROUPS } from "./emailCatalog";
import EmailGroupCard from "./EmailGroupCard";
import EmailToggleRow from "./EmailToggleRow";

// Every email group with its rows, wired to the settings draft and the live recipient lists.
export default function EmailGroups({ settings, ctx, stats, openKey, onOpenKey, onShowActivity }) {
  const { settings: cateringSettings } = useCateringSettings();
  return EMAIL_GROUPS.map((group) => (
    <EmailGroupCard key={group.id} group={group} values={settings.values} onSet={settings.setMany}>
      {group.items.map((item) => (
        <EmailToggleRow
          key={item.key}
          item={item}
          checked={!!settings.values[item.key]}
          changed={settings.changedKeys.has(item.key)}
          onChange={(on) => settings.setMany([item.key], on)}
          choice={settings.recipients[item.key]}
          onChoiceChange={(next) => settings.setRecipients(item.key, next)}
          recipientsUnsaved={settings.changedRecipients.includes(item.key)}
          ctx={ctx}
          headChefId={cateringSettings?.head_chef_employee_id || ""}
          stats={stats?.[item.key]}
          open={openKey === item.key}
          onOpenChange={(open) => onOpenKey(open ? item.key : null)}
          onShowActivity={() => onShowActivity(item.key)}
        />
      ))}
    </EmailGroupCard>
  ));
}