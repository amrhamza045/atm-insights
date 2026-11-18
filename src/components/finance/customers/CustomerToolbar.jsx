import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileDown, Loader2, RefreshCw, Search } from "lucide-react";

const SORTS = [["balance", "Highest remaining"], ["quoted", "Highest quotation"], ["paid", "Highest paid"], ["recent", "Latest activity"], ["name", "Name A–Z"]];

// Search, sort, toggles, exports and (optionally) rebuild.
export default function CustomerToolbar({ search, onSearch, sort, onSort, balanceOnly, onBalanceOnly, selectedCount, onExportSelected, onExportAll, onRebuild, busy, sorts = SORTS, toggles, placeholder = "Search customer name, phone or email" }) {
  const checks = toggles || [{ label: "With balance only", checked: balanceOnly, onChange: onBalanceOnly }];
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-[220px] flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input value={search} onChange={(e) => onSearch(e.target.value)} placeholder={placeholder} className="pl-9" />
      </div>
      <Select value={sort} onValueChange={onSort}>
        <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
        <SelectContent>{sorts.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
      </Select>
      {checks.map((t) => <label key={t.label} className="flex items-center gap-2 text-sm text-slate-600"><Checkbox checked={t.checked} onCheckedChange={(v) => t.onChange(!!v)} />{t.label}</label>)}
      <Button variant="outline" size="sm" disabled={!selectedCount || busy} onClick={onExportSelected}><FileDown className="h-4 w-4" />Export selected ({selectedCount})</Button>
      <Button variant="outline" size="sm" disabled={busy} onClick={onExportAll}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}Export all</Button>
      {onRebuild && <Button variant="ghost" size="sm" disabled={busy} onClick={onRebuild} title="Recalculate every customer from their quotes and payments"><RefreshCw className="h-4 w-4" />Rebuild</Button>}
    </div>
  );
}