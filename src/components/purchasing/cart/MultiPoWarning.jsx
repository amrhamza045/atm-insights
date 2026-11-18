import { AlertTriangle } from 'lucide-react';

export default function MultiPoWarning({ supplierCount }) {
  if (supplierCount < 2) return null;
  return <div className="rounded-xl border border-warning-300 bg-warning-50 p-4 flex gap-3">
    <AlertTriangle className="w-5 h-5 text-warning-600 shrink-0" />
    <div><p className="text-sm font-semibold text-warning-900">This cart will create {supplierCount} separate purchase orders.</p>
      <p className="text-sm text-warning-800">One supplier per order and invoice. Each order is approved and received separately; suppliers cannot be merged.</p></div>
  </div>;
}