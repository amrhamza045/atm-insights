import useTrailPath from "@/lib/useTrailPath";

export const adminTabUrl = (id) => `/Admin?tab=${id}`;

// Reports Admin › tab to the path bar. `tabs` holds only the tabs this user can open.
export default function AdminTrail({ tabs, activeTab }) {
  const tab = tabs.find((t) => t.id === activeTab);

  useTrailPath([
    { label: "Admin", url: "/Admin", children: tabs.map((t) => ({ label: t.label, url: adminTabUrl(t.id) })) },
    ...(tab ? [{ label: tab.label, url: adminTabUrl(tab.id) }] : []),
  ]);
  return null;
}