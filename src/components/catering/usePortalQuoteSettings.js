import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { normalizePortalFlags } from "./portalQuoteFlags";

/**
 * Resolves the Client-side quote settings for one event: its own override when
 * enabled, otherwise the global catering settings. Pass no eventId to edit the
 * global settings.
 */
export function usePortalQuoteSettings(eventId) {
  const queryClient = useQueryClient();

  const { data: globalSettings } = useQuery({
    queryKey: ["catering-settings"],
    queryFn: async () => (await base44.entities.CateringSettings.list())[0] || null,
  });

  const { data: override } = useQuery({
    queryKey: ["portal-quote-override", eventId],
    queryFn: async () => (await base44.entities.CateringPortalQuoteOverride.filter({ event_id: eventId }))[0] || null,
    enabled: !!eventId,
  });

  const isOverride = !!eventId && !!override && override.override_enabled !== false;
  const vis = normalizePortalFlags(isOverride ? override : globalSettings);

  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ["catering-settings"] }),
      queryClient.invalidateQueries({ queryKey: ["portal-quote-override"] }),
    ]);

  const setVis = async (patch) => {
    if (eventId) {
      if (override) await base44.entities.CateringPortalQuoteOverride.update(override.id, patch);
      else await base44.entities.CateringPortalQuoteOverride.create({ event_id: eventId, override_enabled: true, ...patch });
    } else if (globalSettings) {
      await base44.entities.CateringSettings.update(globalSettings.id, patch);
    } else {
      await base44.entities.CateringSettings.create(patch);
    }
    await refresh();
  };

  /** Turns the event override on (seeded from the current global settings) or off. */
  const setOverrideEnabled = async (enabled, eventName) => {
    if (!eventId) return;
    if (override) {
      await base44.entities.CateringPortalQuoteOverride.update(override.id, { override_enabled: enabled });
    } else if (enabled) {
      await base44.entities.CateringPortalQuoteOverride.create({
        event_id: eventId,
        event_name: eventName || "",
        override_enabled: true,
        ...normalizePortalFlags(globalSettings),
      });
    }
    await refresh();
  };

  return { vis, setVis, isOverride, hasOverrideRecord: !!override, setOverrideEnabled };
}