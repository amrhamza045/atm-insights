import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PackageOpen, ArrowUp, ArrowDown } from "lucide-react";
import { fmtValue } from "@/components/executive/kit/formatters";

const DISPOSITION_STYLE = {
  pending: "bg-warning-100 text-warning-800",
  returned_to_stock: "bg-emerald-100 text-emerald-800",
  staff_meal: "bg-blue-100 text-blue-800",
  wasted: "bg-red-100 text-red-700",
};

const COLUMNS = [
  { key: "event_name", label: "Event" },
  { key: "event_date", label: "Date" },
  { key: "item_name", label: "Item" },
  { key: "category", label: "Category" },
  { key: "quantity", label: "Qty", align: "text-right" },
  { key: "total_value", label: "Value", align: "text-right" },
  { key: "condition", label: "Condition" },
  { key: "disposition", label: "Disposition" },
];

export default function ReturnedItemsTable({ rows, sort, onSortChange, currency }) {
  if (rows.length === 0) {
    return (
      <div className="text-center py-10">
        <PackageOpen className="w-8 h-8 text-slate-300 mx-auto mb-2" />
        <p className="text-sm text-slate-500">No returned items match this filter.</p>
      </div>
    );
  }

  const toggle = (key) =>
    onSortChange({ key, dir: sort.key === key && sort.dir === "asc" ? "desc" : "asc" });

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            {COLUMNS.map((c) => (
              <TableHead
                key={c.key}
                onClick={() => toggle(c.key)}
                className={`cursor-pointer select-none hover:text-slate-900 ${c.align || ""}`}
              >
                <span className="inline-flex items-center gap-1">
                  {c.label}
                  {sort.key === c.key && (sort.dir === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                </span>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="font-medium">{r.event_name || "—"}</TableCell>
              <TableCell className="text-slate-500">{r.event_date || "—"}</TableCell>
              <TableCell>{r.item_name}</TableCell>
              <TableCell className="capitalize">{(r.category || "").replace(/_/g, " ")}</TableCell>
              <TableCell className="text-right">{r.quantity} {r.unit}</TableCell>
              <TableCell className="text-right">{fmtValue(r.total_value || 0, "money", currency)}</TableCell>
              <TableCell className="capitalize">{r.condition}</TableCell>
              <TableCell>
                <Badge className={DISPOSITION_STYLE[r.disposition] || "bg-slate-100 text-slate-700"}>
                  {(r.disposition || "").replace(/_/g, " ")}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}