import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

const STATUS_STYLE = {
  connected: "bg-emerald-100 text-emerald-700",
  error: "bg-red-100 text-red-700",
  not_connected: "bg-slate-100 text-slate-600",
};

export default function ConnectionHeader({ meta, status, enabled, onToggle }) {
  const Icon = meta.icon;
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${meta.iconBg}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="font-semibold text-slate-900">{meta.label}</h3>
          <Badge className={STATUS_STYLE[status] || STATUS_STYLE.not_connected}>{status.replace("_", " ")}</Badge>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Label className="text-xs text-slate-500">Enabled</Label>
        <Switch checked={!!enabled} onCheckedChange={onToggle} />
      </div>
    </div>
  );
}