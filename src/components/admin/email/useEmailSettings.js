import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useCateringSettings } from "@/components/catering/useCateringSettings";
import { EMAIL_SETTING_KEY, CUSTODY_KEY, SWITCH_KEYS, EMAIL_ITEMS } from "./emailCatalog";
import { normalizeRecipients, sameRecipients } from "./recipientChoice";

const EMPTY = { switches: {}, recipients: {} };

/** Admin › Email switches and recipient choices, edited as one unsaved draft. An unset switch counts as on. */
export function useEmailSettings() {
  const queryClient = useQueryClient();
  const { data: record, isLoading } = useQuery({
    queryKey: ["emailNotificationSettings"],
    queryFn: async () => (await base44.entities.EmailNotificationSettings.filter({ setting_key: EMAIL_SETTING_KEY }))[0] || null,
  });
  const { isLoading: cateringLoading, custodyEmailsEnabled, setCustodyEmailsEnabled } = useCateringSettings();
  const [draft, setDraft] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const saved = useMemo(() => ({
    switches: { ...Object.fromEntries(SWITCH_KEYS.map((k) => [k, record?.[k] !== false])), [CUSTODY_KEY]: custodyEmailsEnabled },
    recipients: Object.fromEntries(EMAIL_ITEMS.map((i) => [i.key, normalizeRecipients(record?.recipients?.[i.key])])),
  }), [record, custodyEmailsEnabled]);

  const values = { ...saved.switches, ...draft.switches };
  const recipients = { ...saved.recipients, ...draft.recipients };
  const changedSwitches = Object.keys(draft.switches).filter((k) => draft.switches[k] !== saved.switches[k]);
  const changedRecipients = Object.keys(draft.recipients).filter((k) => !sameRecipients(draft.recipients[k], saved.recipients[k]));
  const changedKeys = new Set([...changedSwitches, ...changedRecipients]);

  const setMany = (keys, on) => setDraft((d) => ({ ...d, switches: { ...d.switches, ...Object.fromEntries(keys.map((k) => [k, on])) } }));
  const setRecipients = (key, next) => setDraft((d) => ({ ...d, recipients: { ...d.recipients, [key]: next } }));

  const save = async () => {
    setSaving(true);
    try {
      const switches = Object.fromEntries(changedSwitches.filter((k) => k !== CUSTODY_KEY).map((k) => [k, values[k]]));
      const recipientPatch = Object.fromEntries(changedRecipients.map((k) => [k, recipients[k]]));
      if (Object.keys(switches).length || Object.keys(recipientPatch).length) {
        await base44.functions.invoke("emailSettingsAdmin", { action: "save", switches, recipients: recipientPatch });
        await queryClient.invalidateQueries({ queryKey: ["emailNotificationSettings"] });
      }
      if (changedSwitches.includes(CUSTODY_KEY)) await setCustodyEmailsEnabled(values[CUSTODY_KEY]);
      setDraft(EMPTY);
    } finally {
      setSaving(false);
    }
  };

  return {
    isLoading: isLoading || cateringLoading, values, recipients, changedKeys, changedRecipients,
    setMany, setRecipients, discard: () => setDraft(EMPTY), save, saving,
  };
}