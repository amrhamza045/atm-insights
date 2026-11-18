import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { GROUP_ORDER, GROUP_LABELS, MODULE_PARENT, resolveModules } from "@/lib/moduleRegistry";
import { MODULE_PERMISSIONS, ADMIN_PANEL, adminSectionTabs } from "@/lib/modulePermissions";
import { useModuleAccess } from "@/hooks/useModuleAccess";
import useModuleSubTabs from "@/hooks/useModuleSubTabs";
import { toggleIn, setIn } from "@/lib/accessLists";
import ModuleAccessRow from "./ModuleAccessRow";

/**
 * The one access list for a role or a user: every module with its tabs,
 * sub-tabs and action permissions, read from the same lists as Admin › Modules.
 * baseline = the role's lists when editing a user, so per-user changes are marked.
 * permissions + onPermissionToggle (and optional onPermissionsSet) show each
 * module's Permissions dropdown; omit them for read-only administrators.
 * lockedKeys: permission key → note; those switches can't be changed here.
 */
export default function ModuleAccessEditor({ disabledModules = [], onChange, disabledTabs = [], onTabsChange, tabs = [], readOnly = false, baseline, permissions, onPermissionToggle, onPermissionsSet, lockedKeys = {} }) {
  const [search, setSearch] = useState("");
  const { disabledModules: globalModules, disabledTabs: globalTabs } = useModuleAccess();
  const modules = useMemo(() => resolveModules(tabs), [tabs]);
  const subTabs = useModuleSubTabs(modules, tabs);
  const tabCount = modules.reduce((n, m) => n + subTabs[m.key].length, 0);
  const showPerms = !!permissions && !readOnly;
  const adminItems = ADMIN_PANEL.permissions.map((i) => i.adminSection
    ? { ...i, description: `Opens: ${adminSectionTabs(tabs, i.adminSection).join(", ") || "no tabs"}` } : i);
  const withLock = (i) => (lockedKeys[i.key] ? { ...i, lockedNote: lockedKeys[i.key] } : i);
  const itemsOf = (key) => (key === ADMIN_PANEL.key ? adminItems : MODULE_PERMISSIONS[key] || []).map(withLock);
  const permCount = showPerms ? new Set([...modules, ADMIN_PANEL].flatMap((m) => itemsOf(m.key).map((i) => i.key))).size : 0;

  const q = search.trim().toLowerCase();
  const matches = (m) => !q || `${m.label} ${m.description}`.toLowerCase().includes(q)
    || (subTabs[m.key] || []).some((t) => t.label.toLowerCase().includes(q))
    || (showPerms && itemsOf(m.key).some((i) => i.label.toLowerCase().includes(q)));
  const globalClosed = (m) => globalModules.includes(m.key) || globalModules.includes(MODULE_PARENT[m.key]);
  const changed = (list, base = [], key) => !!baseline && base.includes(key) !== list.includes(key);
  const withNotes = (list) => list.map((t) => ({ ...t, note: globalTabs.includes(t.id) ? "Closed for everyone in Admin › Modules" : changed(disabledTabs, baseline?.tabs, t.id) ? "Changed for this user" : t.note }));
  const statusOf = (m) => {
    const parent = MODULE_PARENT[m.key];
    const parentDenied = !readOnly && parent && disabledModules.includes(parent);
    return [readOnly ? "Administrator access" : disabledModules.includes(m.key) ? "Denied" : "Allowed subject to its permissions",
      globalClosed(m) ? "Closed for everyone in Admin › Modules" : parentDenied ? "Parent module denied" : null,
      !readOnly && changed(disabledModules, baseline?.modules, m.key) ? "Changed for this user" : null].filter(Boolean).join(" · ");
  };
  const permsFor = (m, denied) => showPerms ? {
    items: itemsOf(m.key), permissions, onToggle: onPermissionToggle, onSetMany: onPermissionsSet,
    note: denied ? "This module is denied, so its screens stay closed. Permissions switched on here still work wherever the app uses them outside these screens." : null,
  } : null;

  return <section className="space-y-4">
    <div><h3 className="font-semibold">Access · {modules.length} modules · {tabCount} tabs{showPerms ? ` · ${permCount} permissions` : ""}</h3>
      <p className="text-sm text-muted-foreground">{baseline ? "Starts from this user's role. Anything changed here applies to this user only; everything else keeps following the role." : "Each module card holds everything for this role: allow or deny the module, open or close its tabs and sub-tabs, and turn its action permissions on or off."} Only Manage users or the Super Admin role makes someone a full administrator, who gets every permission and module whatever is set here. Anything closed for everyone in Admin › Modules stays closed.</p></div>
    <Input aria-label="Search access modules" placeholder="Search modules, tabs, sub-tabs and permissions…" value={search} onChange={e => setSearch(e.target.value)} />
    {GROUP_ORDER.map(group => {
      const rows = modules.filter(m => m.group === group && matches(m)).sort((a, b) => globalClosed(a) - globalClosed(b));
      const adminCard = group === ADMIN_PANEL.group && showPerms && matches(ADMIN_PANEL);
      return rows.length || adminCard ? <div key={group} className="space-y-2">
        <h4 className="text-sm font-semibold">{GROUP_LABELS[group]}</h4>
        {adminCard && <ModuleAccessRow module={ADMIN_PANEL} status="Admin panel sections and tools" subTabs={[]} noSwitch perms={permsFor(ADMIN_PANEL, false)} />}
        {rows.map(m => {
          const denied = !readOnly && disabledModules.includes(m.key);
          const parentDenied = !readOnly && disabledModules.includes(MODULE_PARENT[m.key]);
          return <ModuleAccessRow key={m.key} module={m} denied={denied} status={statusOf(m)} readOnly={readOnly} dimmed={globalClosed(m)}
            subTabs={withNotes(subTabs[m.key])} closedTabs={disabledTabs} locked={!m.navOnly && (denied || parentDenied)}
            onToggle={() => onChange(toggleIn(disabledModules, m.key))}
            onToggleTab={onTabsChange && !readOnly ? (id) => onTabsChange(toggleIn(disabledTabs, id)) : undefined}
            onSetTabs={(ids, close) => onTabsChange(setIn(disabledTabs, ids, close))}
            perms={permsFor(m, denied)} />;
        })}
      </div> : null;
    })}
    {!modules.some(matches) && !(showPerms && matches(ADMIN_PANEL)) && <p className="text-sm text-muted-foreground">No matching modules.</p>}
  </section>;
}