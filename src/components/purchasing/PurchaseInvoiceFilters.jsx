import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const EMPTY_INVOICE_FILTERS = { status: "all", from: "", to: "" };
export const hasInvoiceFilters = (f) => f.status !== "all" || !!f.from || !!f.to;

// Status (posted / not posted) and invoice-date range for the Purchase Invoices list.
export default function PurchaseInvoiceFilters({ value, onChange }) {
  const set = (patch) => onChange({ ...value, ...patch });
  return (
    <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-white p-3">
      <div className="space-y-1">
        <span className="text-xs font-medium text-slate-500">Status</span>
        <Select value={value.status} onValueChange={(status) => set({ status })}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All invoices</SelectItem>
            <SelectItem value="posted">Posted</SelectItem>
            <SelectItem value="draft">Not posted</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <label className="space-y-1">
        <span className="block text-xs font-medium text-slate-500">From</span>
        <Input type="date" value={value.from} max={value.to || undefined} onChange={(e) => set({ from: e.target.value })} className="w-40" />
      </label>
      <label className="space-y-1">
        <span className="block text-xs font-medium text-slate-500">To</span>
        <Input type="date" value={value.to} min={value.from || undefined} onChange={(e) => set({ to: e.target.value })} className="w-40" />
      </label>
      {hasInvoiceFilters(value) && <Button variant="ghost" size="sm" onClick={() => onChange(EMPTY_INVOICE_FILTERS)}>Clear</Button>}
    </div>
  );
}