import useTrailPath from "@/lib/useTrailPath";
import { cateringUrl } from "./cateringTabs";

// Explorer-style path of the open Catering view: Catering › [event] › section › tab.
// Each part opens its own "home" (a section opens its first tab; Catering and
// the event open the starting tab), and the arrow after a part lists what is
// inside it.
export default function useCateringTrail({ groups, activeGroup, activeTab, eventId, event, homeTab }) {
  const group = groups.find((g) => g.key === activeGroup);
  const tab = group?.tabs.find((t) => t.key === activeTab);
  const sections = (evId) => groups.map((g) => ({ label: g.label, url: cateringUrl(g.tabs[0].key, evId) }));

  const segments = homeTab ? [
    { label: "Catering", url: cateringUrl(homeTab), children: sections(null) },
    ...(event ? [{ label: event.event_name, url: cateringUrl(homeTab, eventId), children: sections(eventId) }] : []),
    ...(group ? [{
      label: group.label,
      url: cateringUrl(group.tabs[0].key, eventId),
      children: group.tabs.map((t) => ({ label: t.label, url: cateringUrl(t.key, eventId) })),
    }] : []),
    ...(tab ? [{ label: tab.label, url: cateringUrl(tab.key, eventId) }] : []),
  ] : [];

  useTrailPath(segments);
}