import { Switch } from "@/components/ui/switch";
import SubTabsMenu from "@/components/admin/modules/SubTabsMenu";
import PermissionsMenu from "./PermissionsMenu";

/**
 * One module in a role's or user's access list: its switch, its status, its
 * sub-tab switches and its action permissions. noSwitch: a card with
 * permissions only (the Admin panel). dimmed: closed for everyone.
 */
export default function ModuleAccessRow({ module: m, denied, status, readOnly, subTabs, closedTabs, locked, onToggle, onToggleTab, onSetTabs, perms, noSwitch, dimmed }) {
  return (
    <div className={`flex items-center justify-between gap-4 rounded-lg border p-3 ${dimmed ? "bg-slate-50 opacity-70" : "bg-card"}`}>
      <div className="min-w-0 space-y-1">
        <label htmlFor={`access-module-${m.key}`} className="text-sm font-medium">{m.label}</label>
        <p className="text-xs text-muted-foreground">{m.description}</p>
        <p className="text-xs text-muted-foreground">{status}</p>
        <div className="flex flex-wrap gap-2">
          {onToggleTab && subTabs.length > 0 && (
            <SubTabsMenu tabs={subTabs} closed={closedTabs} locked={locked} onToggle={onToggleTab} onSetMany={onSetTabs} />
          )}
          {perms && perms.items.length > 0 && <PermissionsMenu {...perms} />}
        </div>
      </div>
      {!noSwitch && <Switch id={`access-module-${m.key}`} checked={!denied} disabled={readOnly} onCheckedChange={onToggle} />}
    </div>
  );
}